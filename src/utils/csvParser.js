// CSV解析（Amazon公式データリクエスト版 / Chrome拡張版 / 三井住友銀行 に対応）
import { classifyItem, generateId } from './categories';
import JSZip from 'jszip';
import { Buffer } from 'buffer';
import iconv from 'iconv-lite';

// ============================================================
// 共通ユーティリティ
// ============================================================

// CSV行をカンマで分割（ダブルクォート内のカンマは無視）
function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// CSVテキストを行・列に分解
function parseCSVText(text) {
  // BOM除去
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }

  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    if (cols.length >= 2) {
      const row = {};
      headers.forEach((h, idx) => {
        row[h.trim()] = (cols[idx] || '').trim();
      });
      rows.push(row);
    }
  }
  return rows;
}

// 日付文字列を YYYY-MM-DD に変換
function normalizeDate(dateStr) {
  if (!dateStr) return new Date().toISOString().slice(0, 10);

  const isoFull = dateStr.match(/(\d{4})-(\d{2})-(\d{2})T/);
  if (isoFull) return `${isoFull[1]}-${isoFull[2]}-${isoFull[3]}`;

  const slash = dateStr.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (slash) return `${slash[1]}-${slash[2].padStart(2, '0')}-${slash[3].padStart(2, '0')}`;

  const jp = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (jp) return `${jp[1]}-${jp[2].padStart(2, '0')}-${jp[3].padStart(2, '0')}`;

  return new Date().toISOString().slice(0, 10);
}

// 金額文字列から数値を抽出
function parsePrice(priceStr) {
  if (!priceStr) return 0;
  const match = String(priceStr).replace(/[¥￥,、\s]/g, '').match(/[\d.]+/);
  return match ? Math.round(parseFloat(match[0])) : 0;
}

function findColumn(row, candidates) {
  for (const key of candidates) {
    if (row[key] !== undefined && row[key] !== '') return row[key];
  }
  return null;
}

// ============================================================
// Amazon CSV 解析
// ============================================================

const DATE_KEYS = ['Order Date', 'order date', '注文日', '購入日', 'Website Order Date'];
const NAME_KEYS = ['Product Name', 'product name', '商品名', 'Title', 'Item Description'];
// 合計金額カラム（すでに数量が掛けられている）
const TOTAL_PRICE_KEYS = ['Total Owed', 'total owed', 'Item Total', 'item total', '商品小計', '合計'];
// 単価カラム（数量を掛ける必要がある）
const UNIT_PRICE_KEYS = ['Purchase Price Per Unit', 'purchase price per unit', 'Unit Price', 'unit price', '価格'];
const QUANTITY_KEYS = ['Quantity', 'quantity', '数量', '個数'];
const PAYMENT_KEYS = ['Payment Instrument Type', 'payment instrument type', '支払い方法', '決済方法'];
const EXT_DATE_KEYS = ['注文日', 'date', 'Date'];
const EXT_NAME_KEYS = ['商品名', 'title', 'Title', 'name'];
const EXT_PRICE_KEYS = ['価格', '商品小計', 'price', 'Price', '合計'];

// 金額を取得（合計カラム優先、なければ単価×数量）
function resolvePrice(row) {
  // まず合計金額カラムを探す
  const totalStr = findColumn(row, TOTAL_PRICE_KEYS);
  if (totalStr) {
    const total = parsePrice(totalStr);
    if (total > 0) return total;
  }

  // なければ単価×数量
  const unitStr = findColumn(row, UNIT_PRICE_KEYS);
  const quantityStr = findColumn(row, QUANTITY_KEYS);
  const unit = parsePrice(unitStr);
  const quantity = parseInt(quantityStr) || 1;
  return unit * quantity;
}

function parseAmazonCSVToItems(csvText, learnedCategories) {
  const rows = parseCSVText(csvText);
  if (rows.length === 0) return { items: [], skipped: 0 };

  const items = [];
  let skipped = 0;

  for (const row of rows) {
    const date = findColumn(row, [...DATE_KEYS, ...EXT_DATE_KEYS]);
    const name = findColumn(row, [...NAME_KEYS, ...EXT_NAME_KEYS]);
    const payment = findColumn(row, PAYMENT_KEYS);

    if (!name) { skipped++; continue; }

    const price = resolvePrice(row);

    // Chrome拡張版などの外部フォーマット用フォールバック
    const finalPrice = price > 0 ? price : parsePrice(findColumn(row, EXT_PRICE_KEYS));

    items.push({
      id: generateId(),
      date: normalizeDate(date),
      name: name,
      price: finalPrice,
      category: classifyItem(name, learnedCategories),
      paymentMethod: payment || '',
      source: 'amazon',
      memo: '',
    });
  }

  return { items, skipped };
}

// ZIPファイルから注文履歴CSVを探して解析
export async function parseAmazonZip(arrayBuffer, learnedCategories) {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const csvFiles = [];

  zip.forEach((relativePath, file) => {
    if (!file.dir && relativePath.toLowerCase().endsWith('.csv')) {
      csvFiles.push({ path: relativePath, file: file });
    }
  });

  if (csvFiles.length === 0) {
    return { items: [], error: 'ZIP内にCSVファイルが見つかりませんでした' };
  }

  const priorityRules = [
    (path) => path.includes('Retail.OrderHistory'),
    (path) => { const fn = path.split('/').pop() || ''; return fn.includes('注文'); },
    (path) => { const fn = path.split('/').pop() || ''; return fn.includes('OrderHistory') || fn.includes('order_history'); },
  ];

  let targetCsv = null;
  for (const rule of priorityRules) {
    const found = csvFiles.find((f) => rule(f.path));
    if (found) { targetCsv = found; break; }
  }

  if (!targetCsv) {
    let maxSize = 0;
    for (const csv of csvFiles) {
      const content = await csv.file.async('string');
      if (content.length > maxSize) { maxSize = content.length; targetCsv = csv; }
    }
  }

  if (!targetCsv) {
    return { items: [], error: 'ZIP内に適切なCSVファイルが見つかりませんでした' };
  }

  const csvText = await targetCsv.file.async('string');
  const { items, skipped } = parseAmazonCSVToItems(csvText, learnedCategories);

  return {
    items, skipped, fileName: targetCsv.path,
    error: items.length === 0 ? 'CSVから商品データを読み取れませんでした。フォーマットを確認してください。' : null,
  };
}

export function parseAmazonCSV(csvText, learnedCategories) {
  const { items, skipped } = parseAmazonCSVToItems(csvText, learnedCategories);
  return {
    items, skipped,
    error: items.length === 0 ? 'CSVから商品データを読み取れませんでした。フォーマットを確認してください。' : null,
  };
}

// ============================================================
// 三井住友銀行 CSV 解析
// ============================================================

// 全角→半角変換
function zenToHan(str) {
  return str
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
    )
    .replace(/　/g, ' ')
    .replace(/．/g, '.')
    .replace(/，/g, ',')
    .replace(/：/g, ':')
    .replace(/；/g, ';')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/＿/g, '_')
    .replace(/－/g, '-');
}

// 取引内容から店舗名を抽出（V番号除去など）
function cleanSMBCDescription(desc) {
  if (!desc) return '';
  let cleaned = desc.trim();
  // "V123456　店舗名" → "店舗名"
  cleaned = cleaned.replace(/^V\d+[\s　]+/, '');
  // "V000000" のみの場合
  if (/^V\d+$/.test(cleaned)) return 'カード利用';
  // 全角英数を半角に
  cleaned = zenToHan(cleaned);
  // 半角カナをそのまま残す（店舗名に使われることがある）
  return cleaned || desc;
}

// ArrayBufferをShift_JISとしてデコード
function decodeShiftJIS(arrayBuffer) {
  const buf = Buffer.from(arrayBuffer);
  return iconv.decode(buf, 'Shift_JIS');
}

export async function parseSMBCCSV(arrayBuffer, learnedCategories) {
  let csvText;
  try {
    csvText = decodeShiftJIS(arrayBuffer);
  } catch (e) {
    return { items: [], error: 'ファイルのエンコーディングを変換できませんでした' };
  }

  const rows = parseCSVText(csvText);
  if (rows.length === 0) {
    return { items: [], skipped: 0, error: 'CSVからデータを読み取れませんでした' };
  }

  // SMBCフォーマット確認
  const firstRow = rows[0];
  const hasSMBCColumns = firstRow['年月日'] !== undefined || firstRow['お引出し'] !== undefined;
  if (!hasSMBCColumns) {
    return { items: [], error: '三井住友銀行のCSVフォーマットではありません' };
  }

  const items = [];
  let skipped = 0;

  for (const row of rows) {
    const date = row['年月日'];
    const withdrawal = row['お引出し']; // 支出
    const description = row['お取り扱い内容'] || '';

    // 支出がない行（入金のみ）はスキップ
    if (!withdrawal || withdrawal.trim() === '') {
      skipped++;
      continue;
    }

    const price = parsePrice(withdrawal);
    if (price === 0) { skipped++; continue; }

    const cleanedName = cleanSMBCDescription(description);

    items.push({
      id: generateId(),
      date: normalizeDate(date),
      name: cleanedName,
      price: price,
      category: classifyItem(cleanedName, learnedCategories),
      paymentMethod: 'SMBC',
      source: 'smbc',
      memo: '',
    });
  }

  return {
    items,
    skipped,
    error: items.length === 0 ? 'CSVから支出データを読み取れませんでした。' : null,
  };
}
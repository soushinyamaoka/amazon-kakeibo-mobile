import iconv from 'iconv-lite';
import { normalizeDate, parseAmazonCSV, parseSMBCCSV } from '../src/utils/csvParser';

describe('normalizeDate', () => {
  test.each([
    ['2025-02-03T10:20:00Z', '2025-02-03'],
    ['2025/2/3', '2025-02-03'],
    ['2025-2-3', '2025-02-03'],
    ['2025年2月3日', '2025-02-03'],
  ])('変換: %s', (input, expected) => expect(normalizeDate(input)).toBe(expected));
  test.each(['', null, '日付不明'])('不正な日付はnull: %s', (input) => expect(normalizeDate(input)).toBeNull());
});

describe('parseAmazonCSV', () => {
  test('注文ID、キャンセル/日付不明行、金額計算に対応する', () => {
    const csv = [
      'Order ID,Order Date,Product Name,Order Status,Purchase Price Per Unit,Quantity,Total Owed',
      'ORDER-A,2025/02/03,架空の茶,Shipped,100,2,',
      'ORDER-B,2025/02/04,架空の菓子,CANCELLED,50,1,',
      'ORDER-C,不明,架空の紙,Shipped,25,1,',
      'ORDER-D,2025-02-05,架空の箱,Shipped,100,3,250',
    ].join('\n');
    const result = parseAmazonCSV(csv);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({ orderId: 'ORDER-A', price: 200, date: '2025-02-03' });
    expect(result.items[1].price).toBe(250);
    expect(result.cancelledCount).toBe(1);
    expect(result.invalidDateCount).toBe(1);
  });
});

describe('parseSMBCCSV', () => {
  test('Shift_JISの支出を読み、入金と日付不明を除く', async () => {
    const csv = [
      '年月日,お引出し,お預入れ,お取り扱い内容',
      '2025/02/03,120,,架空店舗',
      '2025/02/04,,500,架空入金',
      '不明,80,,架空別店舗',
    ].join('\r\n');
    const result = await parseSMBCCSV(iconv.encode(csv, 'Shift_JIS'));
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ date: '2025-02-03', price: 120 });
    expect(result.skipped).toBe(1);
    expect(result.invalidDateCount).toBe(1);
  });
});

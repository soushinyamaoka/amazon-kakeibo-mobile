import { normalizeName } from './categories';

export function getLegacyItemKey(item) {
  return `${item.source || ''}|${item.date || ''}|${normalizeName(item.name || '')}|${item.price}`;
}

export function getItemKey(item) {
  if (item.source === 'amazon' && item.orderId) {
    return `amazon|${item.orderId}|${normalizeName(item.name || '')}`;
  }
  return getLegacyItemKey(item);
}

export function deduplicateByItemKey(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = getItemKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function mergeNewItems(existingItems, newItems) {
  const merged = existingItems.map((item) => ({ ...item }));
  const available = new Map();
  merged.forEach((item, index) => {
    const key = getItemKey(item);
    available.set(key, [...(available.get(key) || []), index]);
  });

  let addedCount = 0;
  let duplicateCount = 0;
  for (const item of newItems) {
    const key = getItemKey(item);
    let matches = available.get(key) || [];
    if (!matches.length && item.source === 'amazon' && item.orderId) {
      const legacyKey = getLegacyItemKey(item);
      matches = merged.flatMap((existing, index) =>
        existing.source === 'amazon' && !existing.orderId && getLegacyItemKey(existing) === legacyKey ? [index] : []
      );
      if (matches.length) {
        available.set(key, matches);
        const [matchedIndex] = matches;
        merged[matchedIndex] = { ...merged[matchedIndex], orderId: item.orderId };
      }
    }
    if (matches.length) {
      matches.shift();
      available.set(key, matches);
      duplicateCount++;
    } else {
      const index = merged.length;
      merged.push({ ...item });
      addedCount++;
    }
  }

  merged.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return { merged, addedCount, duplicateCount };
}

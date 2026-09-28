import { mergeNewItems } from '../src/utils/itemMerge';

const item = (overrides = {}) => ({ source: 'amazon', date: '2026-01-02', name: '架空の品物', price: 100, ...overrides });

describe('mergeNewItems', () => {
  test('再取り込み時は追加せず重複として数える', () => {
    const result = mergeNewItems([item({ orderId: 'ORDER-A' })], [item({ orderId: 'ORDER-A' })]);
    expect(result.addedCount).toBe(0);
    expect(result.duplicateCount).toBe(1);
    expect(result.merged).toHaveLength(1);
  });

  test('同じ取り込み内にある同一明細の件数を保つ', () => {
    const result = mergeNewItems([], [item(), item()]);
    expect(result.addedCount).toBe(2);
    expect(result.duplicateCount).toBe(0);
    expect(result.merged).toHaveLength(2);
  });

  test('orderIdなしの既存行と照合し、利用者の分類等を保つ', () => {
    const existing = item({ category: '利用者分類', excluded: true, memo: '利用者メモ' });
    const result = mergeNewItems([existing], [item({ orderId: 'ORDER-A' })]);
    expect(result.addedCount).toBe(0);
    expect(result.merged[0]).toEqual({ ...existing, orderId: 'ORDER-A' });
  });

  test('入力の配列とオブジェクトを変更しない', () => {
    const existing = item({ category: '保存値' });
    const incoming = item({ orderId: 'ORDER-A' });
    const existingArray = [existing];
    const incomingArray = [incoming];
    const beforeExisting = { ...existing };
    const beforeIncoming = { ...incoming };
    const result = mergeNewItems(existingArray, incomingArray);
    expect(existingArray).toEqual([beforeExisting]);
    expect(incomingArray).toEqual([beforeIncoming]);
    expect(result.merged[0]).not.toBe(existing);
  });
});

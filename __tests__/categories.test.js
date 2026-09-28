import { classifyItem } from '../src/utils/categories';

describe('classifyItem', () => {
  test('キーワードで分類する', () => expect(classifyItem('緑茶パック')).toBe('食費'));
  test('半角カナ店舗名を分類する', () => expect(classifyItem('ﾏﾙｴﾂ')).toBe('食費'));
  test('学習データを優先する', () => expect(classifyItem('緑茶パック', { '緑茶パック': '学習分類' })).toBe('学習分類'));
  test('該当なしはその他', () => expect(classifyItem('架空の用途不明品')).toBe('その他'));
});

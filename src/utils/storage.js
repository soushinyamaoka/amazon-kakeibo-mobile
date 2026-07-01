import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ITEMS: '@kakeibo_items',
  BUDGETS: '@kakeibo_budgets',
  LAST_SYNC: '@kakeibo_last_sync',
  LEARNED_CATEGORIES: '@kakeibo_learned_categories',
};

export async function loadItems() {
  try {
    const json = await AsyncStorage.getItem(KEYS.ITEMS);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.error('Failed to load items:', e);
    return [];
  }
}

export async function saveItems(items) {
  try {
    await AsyncStorage.setItem(KEYS.ITEMS, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save items:', e);
  }
}

export async function mergeItems(existingItems, newItems) {
  const merged = [...existingItems, ...newItems].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
  await saveItems(merged);
  return { merged, addedCount: newItems.length };
}

export async function loadBudgets() {
  try {
    const json = await AsyncStorage.getItem(KEYS.BUDGETS);
    return json ? JSON.parse(json) : {};
  } catch (e) {
    console.error('Failed to load budgets:', e);
    return {};
  }
}

export async function saveBudgets(budgets) {
  try {
    await AsyncStorage.setItem(KEYS.BUDGETS, JSON.stringify(budgets));
  } catch (e) {
    console.error('Failed to save budgets:', e);
  }
}

export async function saveLastSync(date) {
  try {
    await AsyncStorage.setItem(KEYS.LAST_SYNC, date);
  } catch (e) {
    console.error('Failed to save last sync:', e);
  }
}

export async function loadLastSync() {
  try {
    return await AsyncStorage.getItem(KEYS.LAST_SYNC);
  } catch (e) {
    return null;
  }
}

// ============================================================
// 学習カテゴリ
// ============================================================

export async function loadLearnedCategories() {
  try {
    const json = await AsyncStorage.getItem(KEYS.LEARNED_CATEGORIES);
    return json ? JSON.parse(json) : {};
  } catch (e) {
    console.error('Failed to load learned categories:', e);
    return {};
  }
}

export async function saveLearnedCategories(learned) {
  try {
    await AsyncStorage.setItem(KEYS.LEARNED_CATEGORIES, JSON.stringify(learned));
  } catch (e) {
    console.error('Failed to save learned categories:', e);
  }
}

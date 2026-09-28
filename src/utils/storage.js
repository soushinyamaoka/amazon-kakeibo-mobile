import AsyncStorage from '@react-native-async-storage/async-storage';
import { mergeNewItems } from './itemMerge';

const KEYS = {
  ITEMS: '@kakeibo_items',
  BUDGETS: '@kakeibo_budgets',
  LAST_SYNC_AMAZON: '@kakeibo_last_sync_amazon',
  LAST_SYNC_SMBC: '@kakeibo_last_sync_smbc',
  LEGACY_LAST_SYNC: '@kakeibo_last_sync',
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
  const result = mergeNewItems(existingItems, newItems);
  const { merged } = result;
  await saveItems(merged);
  return result;
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

export async function saveLastSync(source, date) {
  try {
    const key = source === 'amazon' ? KEYS.LAST_SYNC_AMAZON : KEYS.LAST_SYNC_SMBC;
    await AsyncStorage.setItem(key, date);
  } catch (e) {
    console.error('Failed to save last sync:', e);
  }
}

export async function loadLastSync(source) {
  try {
    const key = source === 'amazon' ? KEYS.LAST_SYNC_AMAZON : KEYS.LAST_SYNC_SMBC;
    return (await AsyncStorage.getItem(key)) || await AsyncStorage.getItem(KEYS.LEGACY_LAST_SYNC);
  } catch (e) {
    return null;
  }
}

export async function clearAllData() {
  await AsyncStorage.multiRemove([
    KEYS.ITEMS,
    KEYS.BUDGETS,
    KEYS.LAST_SYNC_AMAZON,
    KEYS.LAST_SYNC_SMBC,
    KEYS.LEGACY_LAST_SYNC,
    KEYS.LEARNED_CATEGORIES,
  ]);
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

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  loadItems, saveItems, mergeItems,
  loadBudgets, saveBudgets,
  loadLastSync, saveLastSync, clearAllData as clearStoredData,
  loadLearnedCategories, saveLearnedCategories,
} from '../utils/storage';
import { normalizeName } from '../utils/categories';
import { deduplicateByItemKey } from '../utils/itemMerge';
import { formatLocalDate } from '../utils/date';

const DataContext = createContext();

export function DataProvider({ children }) {
  const [items, setItems] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [lastSyncBySource, setLastSyncBySource] = useState({ amazon: null, smbc: null });
  const [learnedCategories, setLearnedCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedPayment, setSelectedPayment] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');

  // 初回ロード
  useEffect(() => {
    (async () => {
      const [loadedItems, loadedBudgets, amazonSync, smbcSync, loadedLearned] = await Promise.all([
        loadItems(), loadBudgets(), loadLastSync('amazon'), loadLastSync('smbc'), loadLearnedCategories(),
      ]);
      setItems(loadedItems);
      setBudgets(loadedBudgets);
      setLastSyncBySource({ amazon: amazonSync, smbc: smbcSync });
      setLearnedCategories(loadedLearned);
      setLoading(false);
    })();
  }, []);

  const updateLastSync = useCallback(async (source, date) => {
    await saveLastSync(source, date);
    setLastSyncBySource((current) => ({ ...current, [source]: date }));
  }, []);

  const clearAllData = useCallback(async () => {
    await clearStoredData();
    setItems([]);
    setBudgets({});
    setLastSyncBySource({ amazon: null, smbc: null });
    setLearnedCategories({});
    setSelectedSource('all');
    setSelectedPayment('all');
    setSelectedMonth(formatLocalDate().slice(0, 7));
  }, []);

  // アイテムの追加
  const addItems = useCallback(async (newItems) => {
    const { merged, addedCount, duplicateCount } = await mergeItems(items, newItems);
    setItems(merged);
    return { addedCount, duplicateCount };
  }, [items]);

  const addManualItem = useCallback(async (item) => {
    const updated = [...items, item].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    setItems(updated);
    await saveItems(updated);
  }, [items]);

  // アイテムの更新
  const updateItem = useCallback(async (id, updates) => {
    const updated = items.map((i) => (i.id === id ? { ...i, ...updates } : i));
    setItems(updated);
    await saveItems(updated);
  }, [items]);

  // カテゴリ変更を学習（手動修正時に呼ぶ）
  const learnCategory = useCallback(async (itemName, newCategory) => {
    const key = normalizeName(itemName);
    if (!key || key.length < 2) return;

    const updated = { ...learnedCategories, [key]: newCategory };
    setLearnedCategories(updated);
    await saveLearnedCategories(updated);
  }, [learnedCategories]);

  // アイテムの削除
  const deleteItem = useCallback(async (id) => {
    const filtered = items.filter((i) => i.id !== id);
    setItems(filtered);
    await saveItems(filtered);
  }, [items]);

  // 重複データを除去
  const deduplicateItems = useCallback(async () => {
    const unique = deduplicateByItemKey(items);
    const removed = items.length - unique.length;
    setItems(unique);
    await saveItems(unique);
    return removed;
  }, [items]);

  // 予算の更新（ソースごとに保存: "2025-12_amazon", "2025-12_smbc" 等）
  const getBudgetKey = (month, source) => source === 'all' ? month : `${month}_${source}`;
  const updateBudget = useCallback(async (month, amount) => {
    const key = getBudgetKey(month, selectedSource);
    const updated = { ...budgets, [key]: amount };
    setBudgets(updated);
    await saveBudgets(updated);
  }, [budgets, selectedSource]);

  // 学習データのリセット
  const resetLearnedCategories = useCallback(async () => {
    setLearnedCategories({});
    await saveLearnedCategories({});
  }, []);

  // データソースの一覧
  const availableSources = useMemo(
    () => [...new Set(items.map((i) => i.source || 'manual'))],
    [items]
  );

  // ソースでフィルター
  const sourceItems = useMemo(
    () => selectedSource === 'all' ? items : items.filter((i) => (i.source || 'manual') === selectedSource),
    [items, selectedSource]
  );

  // 支払い方法の一覧（ソースフィルター後）
  const paymentMethods = useMemo(
    () => [...new Set(sourceItems.map((i) => i.paymentMethod).filter(Boolean))].sort(),
    [sourceItems]
  );

  // 月でフィルター
  const monthItems = useMemo(
    () => sourceItems.filter((i) => i.date.startsWith(selectedMonth)),
    [sourceItems, selectedMonth]
  );

  // 支払い方法でフィルター
  const filteredItems = useMemo(
    () => selectedPayment === 'all' ? monthItems : monthItems.filter((i) => i.paymentMethod === selectedPayment),
    [monthItems, selectedPayment]
  );

  // 集計対象の判定は画面間で共有する
  const isItemIncludedInTotal = useCallback(
    (item) => !(selectedSource === 'all' && item.excluded === true),
    [selectedSource]
  );
  const calculateItemsTotal = useCallback(
    (itemsToTotal) => itemsToTotal.filter(isItemIncludedInTotal).reduce((sum, item) => sum + item.price, 0),
    [isItemIncludedInTotal]
  );

  // 月間合計
  const monthlyTotal = useMemo(
    () => calculateItemsTotal(filteredItems),
    [filteredItems, calculateItemsTotal]
  );

  // カテゴリ別内訳
  const categoryBreakdown = useMemo(() => {
    const map = {};
    filteredItems.filter(isItemIncludedInTotal).forEach((i) => { map[i.category] = (map[i.category] || 0) + i.price; });
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(map)
      .map(([name, value]) => ({ name, value, percent: Math.round((value / total) * 100) }))
      .sort((a, b) => b.value - a.value);
  }, [filteredItems, isItemIncludedInTotal]);

  // 利用可能な月一覧（ソースフィルター後）
  const months = useMemo(
    () => [...new Set(sourceItems.map((i) => i.date.slice(0, 7)))].sort().reverse(),
    [sourceItems]
  );

  // 現在のソース用の予算
  const currentBudget = useMemo(
    () => budgets[getBudgetKey(selectedMonth, selectedSource)] || 0,
    [budgets, selectedMonth, selectedSource]
  );

  const value = {
    items, filteredItems, months, loading,
    selectedMonth, setSelectedMonth,
    selectedPayment, setSelectedPayment, paymentMethods,
    selectedSource, setSelectedSource, availableSources,
    monthlyTotal, categoryBreakdown,
    isItemIncludedInTotal, calculateItemsTotal,
    budgets, updateBudget, currentBudget,
    lastSyncBySource, updateLastSync, clearAllData,
    addItems, addManualItem, updateItem, deleteItem, deduplicateItems,
    learnedCategories, learnCategory, resetLearnedCategories,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

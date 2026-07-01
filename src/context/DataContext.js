import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  loadItems, saveItems, mergeItems,
  loadBudgets, saveBudgets,
  loadLastSync,
  loadLearnedCategories, saveLearnedCategories,
} from '../utils/storage';
import { normalizeName } from '../utils/categories';

const DataContext = createContext();

export function DataProvider({ children }) {
  const [items, setItems] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [lastSync, setLastSync] = useState(null);
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
      const [loadedItems, loadedBudgets, loadedSync, loadedLearned] = await Promise.all([
        loadItems(), loadBudgets(), loadLastSync(), loadLearnedCategories(),
      ]);
      setItems(loadedItems);
      setBudgets(loadedBudgets);
      setLastSync(loadedSync);
      setLearnedCategories(loadedLearned);
      setLoading(false);
    })();
  }, []);

  // アイテムの追加
  const addItems = useCallback(async (newItems) => {
    const { merged, addedCount } = await mergeItems(items, newItems);
    setItems(merged);
    return addedCount;
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
    const seen = new Map();
    const unique = [];
    for (const item of items) {
      const normName = (item.name || '').replace(/\s+/g, '').replace(/[　\t\u3000]/g, '').replace(/…+/g, '').toLowerCase().substring(0, 20);
      const key = `${item.date}_${normName}_${item.price}_${item.source || ''}`;
      if (!seen.has(key)) { seen.set(key, true); unique.push(item); }
    }
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
    () => [...new Set(items.map((i) => i.source).filter(Boolean))],
    [items]
  );

  // ソースでフィルター
  const sourceItems = useMemo(
    () => selectedSource === 'all' ? items : items.filter((i) => i.source === selectedSource),
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

  // 月間合計
  const monthlyTotal = useMemo(
    () => filteredItems.reduce((s, i) => s + i.price, 0),
    [filteredItems]
  );

  // カテゴリ別内訳
  const categoryBreakdown = useMemo(() => {
    const map = {};
    filteredItems.forEach((i) => { map[i.category] = (map[i.category] || 0) + i.price; });
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(map)
      .map(([name, value]) => ({ name, value, percent: Math.round((value / total) * 100) }))
      .sort((a, b) => b.value - a.value);
  }, [filteredItems]);

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
    budgets, updateBudget, currentBudget,
    lastSync, setLastSync,
    addItems, updateItem, deleteItem, deduplicateItems,
    learnedCategories, learnCategory, resetLearnedCategories,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useData } from '../context/DataContext';
import { CATEGORY_COLORS, CATEGORY_ICONS, formatYen } from '../utils/categories';
import SourceSelector from '../components/SourceSelector';

function PaymentSelector({ paymentMethods, selectedPayment, setSelectedPayment }) {
  if (paymentMethods.length === 0) return null;
  return (
    <View style={psStyles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={psStyles.scroll}>
        <TouchableOpacity
          style={[psStyles.chip, selectedPayment === 'all' && psStyles.chipActive]}
          onPress={() => setSelectedPayment('all')}
        >
          <Text style={[psStyles.chipText, selectedPayment === 'all' && psStyles.chipTextActive]}>💳 すべて</Text>
        </TouchableOpacity>
        {paymentMethods.map((pm) => (
          <TouchableOpacity
            key={pm}
            style={[psStyles.chip, selectedPayment === pm && psStyles.chipActive]}
            onPress={() => setSelectedPayment(pm)}
          >
            <Text style={[psStyles.chipText, selectedPayment === pm && psStyles.chipTextActive]}>💳 {pm}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const psStyles = StyleSheet.create({
  container: { marginBottom: 4 },
  scroll: { paddingHorizontal: 16, gap: 6 },
  chip: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  chipActive: { backgroundColor: 'rgba(129,178,154,0.2)', borderColor: '#81B29A' },
  chipText: { fontSize: 12, color: '#8D99AE' },
  chipTextActive: { color: '#81B29A', fontWeight: '600' },
});

export default function DashboardScreen({ navigation }) {
  const {
    filteredItems, monthlyTotal, categoryBreakdown,
    selectedMonth, setSelectedMonth, months,
    selectedPayment, setSelectedPayment, paymentMethods,
    selectedSource, setSelectedSource, availableSources,
    currentBudget,
  } = useData();

  const budget = currentBudget;
  const remaining = budget ? budget - monthlyTotal : 0;
  const budgetPercent = budget ? Math.min((monthlyTotal / budget) * 100, 100) : 0;

  const prevMonth = () => {
    const idx = months.indexOf(selectedMonth);
    if (idx < months.length - 1) setSelectedMonth(months[idx + 1]);
  };
  const nextMonth = () => {
    const idx = months.indexOf(selectedMonth);
    if (idx > 0) setSelectedMonth(months[idx - 1]);
  };

  if (filteredItems.length === 0 && months.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        {/* ソース切り替えは常に表示（戻れなくなる防止） */}
        <View style={{ width: '100%' }}>
          <SourceSelector availableSources={availableSources} selectedSource={selectedSource} setSelectedSource={setSelectedSource} />
        </View>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>📊</Text>
        <Text style={styles.emptyTitle}>データがありません</Text>
        <Text style={styles.emptyText}>
          {selectedSource !== 'all'
            ? `「${selectedSource === 'amazon' ? 'Amazon' : 'SMBC'}」のデータがありません。\nソースを切り替えてみてください。`
            : '「Amazon同期」または「銀行取込」タブから\nデータを取得してください'}
        </Text>
        {selectedSource === 'all' && (
          <TouchableOpacity style={styles.syncBtn} onPress={() => navigation.navigate('AmazonSync')}>
            <Text style={styles.syncBtnText}>🔄 Amazon同期へ</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* ソース切り替え */}
      <View style={{ paddingTop: 12 }}>
        <SourceSelector availableSources={availableSources} selectedSource={selectedSource} setSelectedSource={setSelectedSource} />
      </View>

      {/* 月セレクター */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={prevMonth} style={styles.monthArrow}>
          <Text style={styles.monthArrowText}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.monthDisplay}>{selectedMonth.replace('-', '年') + '月'}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.monthArrow}>
          <Text style={styles.monthArrowText}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* カード切り替え */}
      <PaymentSelector paymentMethods={paymentMethods} selectedPayment={selectedPayment} setSelectedPayment={setSelectedPayment} />

      {/* 月間サマリー */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>
          {selectedPayment === 'all' ? '今月の支出' : `${selectedPayment} の支出`}
        </Text>
        <Text style={styles.summaryAmount}>{formatYen(monthlyTotal)}</Text>
        <Text style={styles.summaryCount}>{filteredItems.length}件の購入</Text>
        {budget > 0 && selectedPayment === 'all' && (
          <View style={{ marginTop: 14 }}>
            <View style={styles.barBg}>
              <View style={[styles.barFill, {
                width: `${budgetPercent}%`,
                backgroundColor: budgetPercent > 90 ? '#E07A5F' : budgetPercent > 70 ? '#F2CC8F' : '#81B29A',
              }]} />
            </View>
            <View style={styles.budgetRow}>
              <Text style={styles.budgetText}>予算: {formatYen(budget)}</Text>
              <Text style={[styles.budgetText, { color: remaining >= 0 ? '#81B29A' : '#E07A5F' }]}>残り: {formatYen(remaining)}</Text>
            </View>
          </View>
        )}
      </View>

      {/* カテゴリ別内訳 */}
      {categoryBreakdown.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>カテゴリ別内訳</Text>
          <View style={styles.chartContainer}>
            {categoryBreakdown.slice(0, 6).map((c) => (
              <View key={c.name} style={styles.chartBar}>
                <Text style={styles.chartPercent}>{c.percent}%</Text>
                <View style={styles.chartBarBg}>
                  <View style={[styles.chartBarFill, { height: `${c.percent}%`, backgroundColor: CATEGORY_COLORS[c.name] || '#8D99AE' }]} />
                </View>
                <Text style={styles.chartLabel}>{CATEGORY_ICONS[c.name]}</Text>
              </View>
            ))}
          </View>
          {categoryBreakdown.map((c) => (
            <View key={c.name} style={styles.categoryRow}>
              <View style={styles.categoryLeft}>
                <View style={[styles.dot, { backgroundColor: CATEGORY_COLORS[c.name] || '#8D99AE' }]} />
                <Text style={styles.categoryName}>{CATEGORY_ICONS[c.name]} {c.name}</Text>
              </View>
              <View style={styles.categoryRight}>
                <Text style={styles.categoryAmount}>{formatYen(c.value)}</Text>
                <Text style={styles.categoryPercent}>{c.percent}%</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 最近の購入 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>最近の購入</Text>
          <TouchableOpacity onPress={() => navigation.navigate('History')}>
            <Text style={styles.seeAll}>すべて見る →</Text>
          </TouchableOpacity>
        </View>
        {filteredItems.slice(0, 5).map((item) => (
          <View key={item.id} style={styles.listItem}>
            <View style={styles.listItemLeft}>
              <Text style={{ fontSize: 20 }}>{CATEGORY_ICONS[item.category]}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.itemDate}>{item.date}</Text>
              </View>
            </View>
            <Text style={styles.itemPrice}>{formatYen(item.price)}</Text>
          </View>
        ))}
        {filteredItems.length === 0 && (<Text style={styles.noData}>この月のデータはありません</Text>)}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117', paddingHorizontal: 16 },
  emptyContainer: { flex: 1, backgroundColor: '#0d1117', justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#e0e0e0', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#8D99AE', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  syncBtn: { paddingVertical: 14, paddingHorizontal: 28, backgroundColor: '#81B29A', borderRadius: 14 },
  syncBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 12 },
  monthArrow: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  monthArrowText: { color: '#8D99AE', fontSize: 14 },
  monthDisplay: { fontSize: 18, fontWeight: '700', color: '#e0e0e0', minWidth: 120, textAlign: 'center' },
  summaryCard: { padding: 20, borderRadius: 16, marginBottom: 12, marginTop: 8, backgroundColor: 'rgba(129,178,154,0.1)', borderWidth: 1, borderColor: 'rgba(129,178,154,0.2)' },
  summaryLabel: { color: '#8D99AE', fontSize: 13 },
  summaryAmount: { fontSize: 32, fontWeight: '800', color: '#e0e0e0', marginTop: 4, letterSpacing: -1 },
  summaryCount: { fontSize: 12, color: '#8D99AE', marginTop: 4 },
  barBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  budgetText: { fontSize: 12, color: '#8D99AE' },
  card: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#c0c0c0', marginBottom: 12 },
  seeAll: { fontSize: 13, color: '#81B29A' },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 120, marginBottom: 16, paddingHorizontal: 8 },
  chartBar: { alignItems: 'center', flex: 1 },
  chartPercent: { fontSize: 10, color: '#8D99AE', marginBottom: 4 },
  chartBarBg: { width: 24, height: 80, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  chartBarFill: { width: '100%', borderRadius: 4 },
  chartLabel: { fontSize: 14, marginTop: 4 },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  categoryName: { fontSize: 13, color: '#c0c0c0' },
  categoryRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryAmount: { fontSize: 13, fontWeight: '600', color: '#e0e0e0' },
  categoryPercent: { fontSize: 11, color: '#8D99AE', minWidth: 32, textAlign: 'right' },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  listItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  itemName: { fontSize: 13, fontWeight: '600', color: '#e0e0e0' },
  itemDate: { fontSize: 11, color: '#8D99AE', marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: '#e0e0e0' },
  noData: { color: '#8D99AE', fontSize: 13, textAlign: 'center', paddingVertical: 20 },
});
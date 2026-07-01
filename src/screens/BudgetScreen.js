import React from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useData } from '../context/DataContext';
import { CATEGORY_COLORS, CATEGORY_ICONS, formatYen } from '../utils/categories';
import SourceSelector from '../components/SourceSelector';

export default function BudgetScreen() {
  const {
    selectedMonth, setSelectedMonth, months,
    monthlyTotal, categoryBreakdown,
    currentBudget, updateBudget,
    selectedSource, setSelectedSource, availableSources,
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* ソース切り替え */}
      <View style={{ paddingTop: 12 }}>
        <SourceSelector availableSources={availableSources} selectedSource={selectedSource} setSelectedSource={setSelectedSource} />
      </View>

      {/* 月セレクター */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={prevMonth} style={styles.monthArrow}>
          <Text style={styles.arrowText}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>
          {selectedMonth.replace('-', '年') + '月'}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={styles.monthArrow}>
          <Text style={styles.arrowText}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* 予算入力 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>月間予算設定</Text>
        <View style={styles.inputRow}>
          <Text style={styles.yen}>¥</Text>
          <TextInput
            placeholder="50000"
            placeholderTextColor="#8D99AE"
            keyboardType="numeric"
            value={budget ? String(budget) : ''}
            onChangeText={(v) => updateBudget(selectedMonth, parseInt(v) || 0)}
            style={styles.budgetInput}
          />
        </View>
      </View>

      {/* 予算サマリー */}
      {budget > 0 && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>予算</Text>
            <Text style={styles.summaryValue}>{formatYen(budget)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>使用済み</Text>
            <Text style={[styles.summaryValue, { color: '#E07A5F' }]}>{formatYen(monthlyTotal)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>残り</Text>
            <Text style={[styles.remainingValue, { color: remaining >= 0 ? '#81B29A' : '#E07A5F' }]}>{formatYen(remaining)}</Text>
          </View>

          <View style={{ marginTop: 16 }}>
            <View style={styles.barBg}>
              <View style={[styles.barFill, {
                width: `${budgetPercent}%`,
                backgroundColor: budgetPercent > 90 ? '#E07A5F' : budgetPercent > 70 ? '#F2CC8F' : '#81B29A',
              }]} />
            </View>
            <Text style={styles.percentText}>{Math.round(budgetPercent)}% 使用済み</Text>
          </View>

          {remaining > 0 && (() => {
            const [y, m] = selectedMonth.split('-').map(Number);
            const daysInMonth = new Date(y, m, 0).getDate();
            const today = new Date();
            const isCurrentMonth = today.getFullYear() === y && today.getMonth() + 1 === m;
            const remainingDays = isCurrentMonth ? Math.max(daysInMonth - today.getDate(), 1) : daysInMonth;
            const perDay = Math.round(remaining / remainingDays);
            return (
              <View style={styles.perDayBox}>
                <Text style={styles.perDayLabel}>1日あたり使用可能額</Text>
                <Text style={styles.perDayValue}>{formatYen(perDay)}</Text>
                <Text style={styles.perDayDays}>（残り{remainingDays}日）</Text>
              </View>
            );
          })()}
        </View>
      )}

      {/* カテゴリ別消費 */}
      {categoryBreakdown.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>カテゴリ別の消費</Text>
          {categoryBreakdown.map((c) => (
            <View key={c.name} style={styles.categoryItem}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryName}>{CATEGORY_ICONS[c.name]} {c.name}</Text>
                <Text style={styles.categoryAmount}>{formatYen(c.value)}</Text>
              </View>
              <View style={styles.categoryBarBg}>
                <View style={[styles.categoryBarFill, { width: `${c.percent}%`, backgroundColor: CATEGORY_COLORS[c.name] || '#8D99AE' }]} />
              </View>
              <Text style={styles.categoryPercent}>{c.percent}%</Text>
            </View>
          ))}
        </View>
      )}

      {!budget && (
        <View style={styles.tipBox}>
          <Text style={styles.tipIcon}>💡</Text>
          <Text style={styles.tipText}>
            予算を設定すると、支出の進捗や{'\n'}
            1日あたりの使用可能額が表示されます
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117', paddingHorizontal: 16 },
  monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 8 },
  monthArrow: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  arrowText: { color: '#8D99AE', fontSize: 14 },
  monthLabel: { fontSize: 18, fontWeight: '700', color: '#e0e0e0', minWidth: 120, textAlign: 'center' },
  card: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#c0c0c0', marginBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
  yen: { fontSize: 20, color: '#8D99AE' },
  budgetInput: { flex: 1, fontSize: 20, fontWeight: '700', color: '#e0e0e0' },
  summaryCard: { padding: 20, borderRadius: 16, marginBottom: 12, backgroundColor: 'rgba(129,178,154,0.1)', borderWidth: 1, borderColor: 'rgba(129,178,154,0.2)' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryLabel: { fontSize: 13, color: '#8D99AE' },
  summaryValue: { fontSize: 18, fontWeight: '700', color: '#e0e0e0' },
  remainingValue: { fontSize: 22, fontWeight: '800' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 8 },
  barBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  percentText: { fontSize: 13, color: '#8D99AE', textAlign: 'center', marginTop: 8 },
  perDayBox: { marginTop: 16, padding: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, alignItems: 'center' },
  perDayLabel: { fontSize: 12, color: '#8D99AE' },
  perDayValue: { fontSize: 24, fontWeight: '800', color: '#81B29A', marginTop: 4 },
  perDayDays: { fontSize: 11, color: '#8D99AE', marginTop: 2 },
  categoryItem: { marginBottom: 14 },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  categoryName: { fontSize: 13, color: '#e0e0e0' },
  categoryAmount: { fontSize: 13, color: '#8D99AE' },
  categoryBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  categoryBarFill: { height: '100%', borderRadius: 3 },
  categoryPercent: { fontSize: 11, color: '#8D99AE', marginTop: 2 },
  tipBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, backgroundColor: 'rgba(242,204,143,0.08)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(242,204,143,0.15)' },
  tipIcon: { fontSize: 20 },
  tipText: { fontSize: 12, color: '#c0c0c0', lineHeight: 20, flex: 1 },
});
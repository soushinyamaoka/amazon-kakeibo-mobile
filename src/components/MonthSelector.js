import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function MonthSelector({ months, selectedMonth, setSelectedMonth, style }) {
  const prevMonth = () => {
    const idx = months.indexOf(selectedMonth);
    if (idx < months.length - 1) setSelectedMonth(months[idx + 1]);
  };
  const nextMonth = () => {
    const idx = months.indexOf(selectedMonth);
    if (idx > 0) setSelectedMonth(months[idx - 1]);
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity onPress={prevMonth} style={styles.arrow}>
        <Text style={styles.arrowText}>◀</Text>
      </TouchableOpacity>
      <Text style={styles.month}>{selectedMonth.replace('-', '年') + '月'}</Text>
      <TouchableOpacity onPress={nextMonth} style={styles.arrow}>
        <Text style={styles.arrowText}>▶</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  arrow: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  arrowText: { color: '#8D99AE', fontSize: 14 },
  month: { fontSize: 18, fontWeight: '700', color: '#e0e0e0', minWidth: 120, textAlign: 'center' },
});

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

export default function PaymentSelector({ paymentMethods, selectedPayment, setSelectedPayment }) {
  if (paymentMethods.length === 0) return null;
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={[styles.chip, selectedPayment === 'all' && styles.chipActive]} onPress={() => setSelectedPayment('all')}>
          <Text style={[styles.chipText, selectedPayment === 'all' && styles.chipTextActive]}>💳 すべて</Text>
        </TouchableOpacity>
        {paymentMethods.map((pm) => (
          <TouchableOpacity key={pm} style={[styles.chip, selectedPayment === pm && styles.chipActive]} onPress={() => setSelectedPayment(pm)}>
            <Text style={[styles.chipText, selectedPayment === pm && styles.chipTextActive]}>💳 {pm}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 4 },
  scroll: { paddingHorizontal: 16, gap: 6 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  chipActive: { backgroundColor: 'rgba(129,178,154,0.2)', borderColor: '#81B29A' },
  chipText: { fontSize: 12, color: '#8D99AE' },
  chipTextActive: { color: '#81B29A', fontWeight: '600' },
});

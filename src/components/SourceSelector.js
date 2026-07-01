import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const SOURCE_LABELS = {
  all: { icon: '📊', label: 'すべて' },
  amazon: { icon: '📦', label: 'Amazon' },
  smbc: { icon: '🏦', label: 'SMBC' },
};

export default function SourceSelector({ availableSources, selectedSource, setSelectedSource }) {
  if (availableSources.length <= 1) return null;

  const sources = ['all', ...availableSources];

  return (
    <View style={styles.container}>
      {sources.map((src) => {
        const info = SOURCE_LABELS[src] || { icon: '📁', label: src };
        const isActive = selectedSource === src;
        return (
          <TouchableOpacity
            key={src}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => setSelectedSource(src)}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {info.icon} {info.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    padding: 3,
  },
  tab: {
    flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8,
  },
  tabActive: {
    backgroundColor: 'rgba(129,178,154,0.2)',
  },
  tabText: { fontSize: 12, color: '#8D99AE' },
  tabTextActive: { color: '#81B29A', fontWeight: '700' },
});

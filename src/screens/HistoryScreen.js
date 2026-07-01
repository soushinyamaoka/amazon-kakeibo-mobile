import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Modal, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useData } from '../context/DataContext';
import {
  CATEGORIES, CATEGORY_COLORS, CATEGORY_ICONS,
  classifyItem, generateId, formatYen,
} from '../utils/categories';
import SourceSelector from '../components/SourceSelector';

// ============================================================
// Amazon紐づけ機能
// ============================================================

function isAmazonTransaction(item) {
  const name = (item.name || '').toLowerCase();
  return item.source === 'smbc' && (
    name.includes('amazon') || name.includes('ａｍａｚｏｎ') || name.includes('amzn')
  );
}

function findAmazonCandidates(smbcItem, allItems) {
  const smbcDate = new Date(smbcItem.date);
  const from = new Date(smbcDate);
  from.setDate(from.getDate() - 7);

  return allItems.filter((i) => {
    if (i.source !== 'amazon') return false;
    const d = new Date(i.date);
    return d >= from && d <= smbcDate;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));
}

function findMatchingCombination(candidates, targetAmount) {
  // 件数が多すぎる場合はスキップ
  if (candidates.length > 15) return null;

  const n = candidates.length;
  // ビットマスクで全組み合わせを探索
  for (let mask = 1; mask < (1 << n); mask++) {
    let sum = 0;
    const indices = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        sum += candidates[i].price;
        indices.push(candidates[i].id);
      }
    }
    if (sum === targetAmount) return indices;
  }
  return null;
}

function AmazonMatchModal({ visible, onClose, smbcItem, allItems }) {
  const [selectedDetail, setSelectedDetail] = useState(null);

  const candidates = useMemo(
    () => (smbcItem ? findAmazonCandidates(smbcItem, allItems) : []),
    [smbcItem, allItems]
  );
  const matchingIds = useMemo(
    () => (smbcItem ? findMatchingCombination(candidates, smbcItem.price) : null),
    [candidates, smbcItem]
  );

  if (!smbcItem) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={mStyles.overlay}>
        <View style={mStyles.container}>
          {/* ヘッダー */}
          <View style={mStyles.header}>
            <Text style={mStyles.headerTitle}>🔗 Amazon注文の候補</Text>
            <TouchableOpacity onPress={() => { onClose(); setSelectedDetail(null); }}>
              <Text style={mStyles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* SMBC明細情報 */}
          <View style={mStyles.smbcInfo}>
            <Text style={mStyles.smbcLabel}>🏦 SMBC引き落とし</Text>
            <Text style={mStyles.smbcDetail}>{smbcItem.date}　{formatYen(smbcItem.price)}</Text>
          </View>

          {/* 金額一致通知 */}
          {matchingIds && (
            <View style={mStyles.matchBanner}>
              <Text style={mStyles.matchText}>
                ✅ 金額が一致する組み合わせが見つかりました
              </Text>
            </View>
          )}

          {/* 商品詳細表示 */}
          {selectedDetail && (
            <View style={mStyles.detailCard}>
              <TouchableOpacity onPress={() => setSelectedDetail(null)} style={mStyles.detailBack}>
                <Text style={mStyles.detailBackText}>← 一覧に戻る</Text>
              </TouchableOpacity>
              <View style={mStyles.detailContent}>
                <Text style={mStyles.detailIcon}>{CATEGORY_ICONS[selectedDetail.category]}</Text>
                <Text style={mStyles.detailName}>{selectedDetail.name}</Text>
                <View style={mStyles.detailRow}>
                  <Text style={mStyles.detailLabel}>金額</Text>
                  <Text style={mStyles.detailValue}>{formatYen(selectedDetail.price)}</Text>
                </View>
                <View style={mStyles.detailRow}>
                  <Text style={mStyles.detailLabel}>注文日</Text>
                  <Text style={mStyles.detailValue}>{selectedDetail.date}</Text>
                </View>
                <View style={mStyles.detailRow}>
                  <Text style={mStyles.detailLabel}>カテゴリ</Text>
                  <Text style={mStyles.detailValue}>{CATEGORY_ICONS[selectedDetail.category]} {selectedDetail.category}</Text>
                </View>
                {selectedDetail.paymentMethod ? (
                  <View style={mStyles.detailRow}>
                    <Text style={mStyles.detailLabel}>支払い方法</Text>
                    <Text style={mStyles.detailValue}>{selectedDetail.paymentMethod}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}

          {/* 候補一覧 */}
          {!selectedDetail && (
            <ScrollView style={mStyles.list}>
              {candidates.length === 0 ? (
                <Text style={mStyles.noData}>
                  該当期間のAmazon注文が見つかりませんでした{'\n'}
                  （{smbcItem.date} の7日前〜当日）
                </Text>
              ) : (
                <>
                  <Text style={mStyles.listHeader}>
                    📦 {smbcItem.date} の7日前〜当日のAmazon注文（{candidates.length}件）
                  </Text>
                  {candidates.map((item) => {
                    const isMatch = matchingIds && matchingIds.includes(item.id);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[mStyles.candidateItem, isMatch && mStyles.candidateMatch]}
                        onPress={() => setSelectedDetail(item)}
                      >
                        <View style={mStyles.candidateLeft}>
                          <Text style={{ fontSize: 18 }}>{CATEGORY_ICONS[item.category]}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={mStyles.candidateName} numberOfLines={2}>{item.name}</Text>
                            <Text style={mStyles.candidateDate}>{item.date}</Text>
                          </View>
                        </View>
                        <View style={mStyles.candidateRight}>
                          <Text style={[mStyles.candidatePrice, isMatch && mStyles.candidatePriceMatch]}>
                            {formatYen(item.price)}
                          </Text>
                          {isMatch && <Text style={mStyles.matchBadge}>一致</Text>}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  {matchingIds && (
                    <View style={mStyles.matchSummary}>
                      <Text style={mStyles.matchSummaryText}>
                        合計: {formatYen(candidates.filter((c) => matchingIds.includes(c.id)).reduce((s, c) => s + c.price, 0))}
                        　=　SMBC: {formatYen(smbcItem.price)}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const mStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  container: { backgroundColor: '#1a1f28', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#e0e0e0' },
  closeBtn: { fontSize: 18, color: '#8D99AE', padding: 4 },
  smbcInfo: { padding: 12, marginHorizontal: 16, marginTop: 12, backgroundColor: 'rgba(69,123,157,0.1)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(69,123,157,0.2)' },
  smbcLabel: { fontSize: 11, color: '#457B9D', marginBottom: 4 },
  smbcDetail: { fontSize: 14, fontWeight: '600', color: '#e0e0e0' },
  matchBanner: { marginHorizontal: 16, marginTop: 8, padding: 10, backgroundColor: 'rgba(129,178,154,0.15)', borderRadius: 8 },
  matchText: { fontSize: 12, color: '#81B29A', textAlign: 'center', fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  listHeader: { fontSize: 12, color: '#8D99AE', marginTop: 12, marginBottom: 8 },
  candidateItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, marginBottom: 6, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  candidateMatch: { borderColor: 'rgba(129,178,154,0.4)', backgroundColor: 'rgba(129,178,154,0.08)' },
  candidateLeft: { flexDirection: 'row', gap: 10, flex: 1, alignItems: 'center' },
  candidateName: { fontSize: 12, color: '#e0e0e0', lineHeight: 16 },
  candidateDate: { fontSize: 10, color: '#8D99AE', marginTop: 2 },
  candidateRight: { alignItems: 'flex-end', marginLeft: 8 },
  candidatePrice: { fontSize: 14, fontWeight: '700', color: '#e0e0e0' },
  candidatePriceMatch: { color: '#81B29A' },
  matchBadge: { fontSize: 9, color: '#81B29A', backgroundColor: 'rgba(129,178,154,0.2)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginTop: 3, fontWeight: '700' },
  matchSummary: { padding: 10, marginTop: 4, marginBottom: 16, backgroundColor: 'rgba(129,178,154,0.1)', borderRadius: 8 },
  matchSummaryText: { fontSize: 12, color: '#81B29A', textAlign: 'center', fontWeight: '600' },
  noData: { color: '#8D99AE', fontSize: 13, textAlign: 'center', paddingVertical: 30, lineHeight: 22 },
  // Detail
  detailCard: { padding: 16 },
  detailBack: { marginBottom: 12 },
  detailBackText: { fontSize: 13, color: '#457B9D' },
  detailContent: { padding: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  detailIcon: { fontSize: 36, textAlign: 'center', marginBottom: 10 },
  detailName: { fontSize: 15, fontWeight: '700', color: '#e0e0e0', textAlign: 'center', marginBottom: 16, lineHeight: 22 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  detailLabel: { fontSize: 13, color: '#8D99AE' },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#e0e0e0' },
});

// ============================================================
// 支払い方法セレクター
// ============================================================

function PaymentSelector({ paymentMethods, selectedPayment, setSelectedPayment }) {
  if (paymentMethods.length === 0) return null;
  return (
    <View style={psStyles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={psStyles.scroll}>
        <TouchableOpacity style={[psStyles.chip, selectedPayment === 'all' && psStyles.chipActive]} onPress={() => setSelectedPayment('all')}>
          <Text style={[psStyles.chipText, selectedPayment === 'all' && psStyles.chipTextActive]}>💳 すべて</Text>
        </TouchableOpacity>
        {paymentMethods.map((pm) => (
          <TouchableOpacity key={pm} style={[psStyles.chip, selectedPayment === pm && psStyles.chipActive]} onPress={() => setSelectedPayment(pm)}>
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
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  chipActive: { backgroundColor: 'rgba(129,178,154,0.2)', borderColor: '#81B29A' },
  chipText: { fontSize: 12, color: '#8D99AE' },
  chipTextActive: { color: '#81B29A', fontWeight: '600' },
});

// ============================================================
// メイン画面
// ============================================================

export default function HistoryScreen() {
  const {
    filteredItems, monthlyTotal, items,
    selectedMonth, setSelectedMonth, months,
    selectedPayment, setSelectedPayment, paymentMethods,
    selectedSource, setSelectedSource, availableSources,
    updateItem, deleteItem, addItems,
    learnedCategories, learnCategory,
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [amazonMatchItem, setAmazonMatchItem] = useState(null);
  const [addForm, setAddForm] = useState({
    name: '', price: '', category: 'その他',
    date: new Date().toISOString().slice(0, 10),
  });

  const searched = searchQuery
    ? filteredItems.filter((i) =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.category.toLowerCase().includes(searchQuery.toLowerCase()))
    : filteredItems;

  const handleAdd = useCallback(async () => {
    if (!addForm.name || !addForm.price) {
      Alert.alert('入力エラー', '商品名と金額を入力してください');
      return;
    }
    const newItem = {
      id: generateId(), date: addForm.date, name: addForm.name,
      price: parseFloat(addForm.price) || 0,
      category: addForm.category || classifyItem(addForm.name, learnedCategories),
      paymentMethod: '', source: selectedSource === 'all' ? '' : selectedSource, memo: '',
    };
    await addItems([newItem]);
    setAddForm({ name: '', price: '', category: 'その他', date: new Date().toISOString().slice(0, 10) });
    setShowAddModal(false);
  }, [addForm, addItems, selectedSource, learnedCategories]);

  const handleDelete = useCallback((id, name) => {
    const displayName = name.length > 20 ? name.slice(0, 20) + '...' : name;
    Alert.alert('削除確認', `「${displayName}」を削除しますか？`,
      [{ text: 'キャンセル', style: 'cancel' }, { text: '削除', style: 'destructive', onPress: () => deleteItem(id) }]);
  }, [deleteItem]);

  const handleItemPress = useCallback((item) => {
    if (isAmazonTransaction(item)) {
      setAmazonMatchItem(item);
    }
  }, []);

  const prevMonth = () => { const idx = months.indexOf(selectedMonth); if (idx < months.length - 1) setSelectedMonth(months[idx + 1]); };
  const nextMonth = () => { const idx = months.indexOf(selectedMonth); if (idx > 0) setSelectedMonth(months[idx - 1]); };

  return (
    <View style={styles.container}>
      {/* ソース切り替え */}
      <View style={{ paddingTop: 8 }}>
        <SourceSelector availableSources={availableSources} selectedSource={selectedSource} setSelectedSource={setSelectedSource} />
      </View>

      {/* 月セレクター */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={prevMonth} style={styles.monthArrow}><Text style={styles.arrowText}>◀</Text></TouchableOpacity>
        <Text style={styles.monthDisplay}>{selectedMonth.replace('-', '年') + '月'}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.monthArrow}><Text style={styles.arrowText}>▶</Text></TouchableOpacity>
      </View>

      {/* カード切り替え */}
      <PaymentSelector paymentMethods={paymentMethods} selectedPayment={selectedPayment} setSelectedPayment={setSelectedPayment} />

      {/* 検索バー */}
      <View style={styles.searchContainer}>
        <TextInput placeholder="🔍 商品名・カテゴリで検索" placeholderTextColor="#8D99AE" value={searchQuery} onChangeText={setSearchQuery} style={styles.searchInput} />
      </View>

      <Text style={styles.summary}>{searched.length}件 ・ 合計 {formatYen(monthlyTotal)}</Text>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 }}>
        {searched.map((item) => {
          const isAmazon = isAmazonTransaction(item);
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.itemCard, isAmazon && styles.itemCardAmazon]}
              onPress={() => handleItemPress(item)}
              activeOpacity={isAmazon ? 0.6 : 1}
            >
              <View style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <Text style={{ fontSize: 24 }}>{CATEGORY_ICONS[item.category]}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.itemDate}>
                      {item.date}
                      {item.paymentMethod ? `  ・  💳 ${item.paymentMethod}` : ''}
                      {item.source ? `  ・  ${item.source === 'amazon' ? '📦' : '🏦'}` : ''}
                    </Text>
                    <View style={styles.badgeRow}>
                      <TouchableOpacity onPress={() => setEditingId(editingId === item.id ? null : item.id)} style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{item.category} ▾</Text>
                      </TouchableOpacity>
                      {isAmazon && (
                        <View style={styles.amazonBadge}>
                          <Text style={styles.amazonBadgeText}>🔗 Amazon明細を表示</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                <View style={styles.itemRight}>
                  <Text style={styles.itemPrice}>{formatYen(item.price)}</Text>
                  <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}>
                    <Text style={styles.deleteText}>削除</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {editingId === item.id && (
                <View style={styles.categoryPicker}>
                  {CATEGORIES.map((c) => (
                    <TouchableOpacity key={c} onPress={() => { updateItem(item.id, { category: c }); learnCategory(item.name, c); setEditingId(null); }}
                      style={[styles.categoryOption, item.category === c && styles.categoryOptionActive]}>
                      <Text style={styles.categoryOptionText}>{CATEGORY_ICONS[c]} {c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
        {searched.length === 0 && (<Text style={styles.noData}>データがありません</Text>)}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}><Text style={styles.fabText}>＋</Text></TouchableOpacity>

      {/* Amazon紐づけモーダル */}
      <AmazonMatchModal
        visible={!!amazonMatchItem}
        onClose={() => setAmazonMatchItem(null)}
        smbcItem={amazonMatchItem}
        allItems={items}
      />

      {/* 手動追加モーダル */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>支出を追加</Text>
            <TextInput placeholder="日付 (YYYY-MM-DD)" placeholderTextColor="#8D99AE" value={addForm.date} onChangeText={(v) => setAddForm({ ...addForm, date: v })} style={styles.input} />
            <TextInput placeholder="商品名" placeholderTextColor="#8D99AE" value={addForm.name} onChangeText={(v) => setAddForm({ ...addForm, name: v })} style={styles.input} />
            <TextInput placeholder="金額" placeholderTextColor="#8D99AE" keyboardType="numeric" value={addForm.price} onChangeText={(v) => setAddForm({ ...addForm, price: v })} style={styles.input} />
            <ScrollView horizontal style={styles.categoryScroll} showsHorizontalScrollIndicator={false}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity key={c} onPress={() => setAddForm({ ...addForm, category: c })} style={[styles.categoryChip, addForm.category === c && styles.categoryChipActive]}>
                  <Text style={[styles.categoryChipText, addForm.category === c && styles.categoryChipTextActive]}>{CATEGORY_ICONS[c]} {c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}><Text style={styles.cancelBtnText}>キャンセル</Text></TouchableOpacity>
              <TouchableOpacity style={styles.addBtn} onPress={handleAdd}><Text style={styles.addBtnText}>追加する</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },
  monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 8, paddingHorizontal: 16 },
  monthArrow: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  arrowText: { color: '#8D99AE', fontSize: 14 },
  monthDisplay: { fontSize: 18, fontWeight: '700', color: '#e0e0e0', minWidth: 120, textAlign: 'center' },
  searchContainer: { paddingHorizontal: 16, marginTop: 8, marginBottom: 8 },
  searchInput: { padding: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, color: '#e0e0e0', fontSize: 14 },
  summary: { color: '#8D99AE', fontSize: 12, textAlign: 'center', marginBottom: 8 },
  itemCard: { marginHorizontal: 16, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 12 },
  itemCardAmazon: { borderColor: 'rgba(242,204,143,0.25)', backgroundColor: 'rgba(242,204,143,0.04)' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  itemLeft: { flexDirection: 'row', gap: 10, flex: 1, alignItems: 'flex-start' },
  itemRight: { alignItems: 'flex-end' },
  itemName: { fontSize: 13, fontWeight: '600', color: '#e0e0e0', lineHeight: 18 },
  itemDate: { fontSize: 11, color: '#8D99AE', marginTop: 2 },
  itemPrice: { fontSize: 15, fontWeight: '700', color: '#e0e0e0' },
  deleteText: { fontSize: 11, color: '#E07A5F', marginTop: 4 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  categoryBadge: { paddingVertical: 2, paddingHorizontal: 8, backgroundColor: 'rgba(129,178,154,0.1)', borderRadius: 6 },
  categoryBadgeText: { fontSize: 11, color: '#81B29A' },
  amazonBadge: { paddingVertical: 2, paddingHorizontal: 8, backgroundColor: 'rgba(242,204,143,0.15)', borderRadius: 6 },
  amazonBadgeText: { fontSize: 11, color: '#F2CC8F' },
  categoryPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 10, padding: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10 },
  categoryOption: { paddingVertical: 4, paddingHorizontal: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 6 },
  categoryOptionActive: { backgroundColor: 'rgba(129,178,154,0.2)', borderColor: '#81B29A' },
  categoryOptionText: { fontSize: 11, color: '#c0c0c0' },
  noData: { color: '#8D99AE', fontSize: 13, textAlign: 'center', paddingVertical: 40 },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: '#81B29A', justifyContent: 'center', alignItems: 'center', shadowColor: '#2A9D8F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  fabText: { fontSize: 24, color: '#fff', fontWeight: '300' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { backgroundColor: '#1a1f28', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#e0e0e0', marginBottom: 16 },
  input: { padding: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10, color: '#e0e0e0', fontSize: 14, marginBottom: 10 },
  categoryScroll: { marginVertical: 10, maxHeight: 40 },
  categoryChip: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, marginRight: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  categoryChipActive: { backgroundColor: 'rgba(129,178,154,0.2)', borderColor: '#81B29A' },
  categoryChipText: { fontSize: 12, color: '#8D99AE' },
  categoryChipTextActive: { color: '#81B29A' },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center' },
  cancelBtnText: { color: '#8D99AE', fontSize: 14, fontWeight: '600' },
  addBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#81B29A', alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, SafeAreaView, ScrollView, Linking,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useData } from '../context/DataContext';
import { parseAmazonCSV, parseAmazonZip } from '../utils/csvParser';
import { saveLastSync } from '../utils/storage';

const AMAZON_DATA_REQUEST_URL = 'https://www.amazon.co.jp/gp/privacycentral/dsar/preview.html';

export default function AmazonSyncScreen() {
  const { addItems, lastSync, setLastSync, items, deduplicateItems, learnedCategories, resetLearnedCategories } = useData();
  const [csvLoading, setCsvLoading] = useState(false);

  // ==================== ファイルインポート ====================
  const handleFileImport = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv',
               'application/zip', 'application/x-zip-compressed', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      setCsvLoading(true);
      const file = result.assets[0];
      const fileName = (file.name || '').toLowerCase();
      const isZip = fileName.endsWith('.zip') || file.mimeType?.includes('zip');

      let parsedItems = [];
      let skipped = 0;
      let error = null;
      let usedFileName = '';

      if (isZip) {
        const response = await fetch(file.uri);
        const arrayBuffer = await response.arrayBuffer();
        const zipResult = await parseAmazonZip(arrayBuffer, learnedCategories);
        parsedItems = zipResult.items;
        skipped = zipResult.skipped || 0;
        error = zipResult.error;
        usedFileName = zipResult.fileName || '';
      } else {
        const response = await fetch(file.uri);
        const csvText = await response.text();
        const csvResult = parseAmazonCSV(csvText, learnedCategories);
        parsedItems = csvResult.items;
        skipped = csvResult.skipped || 0;
        error = csvResult.error;
      }

      if (error) {
        Alert.alert('エラー', error);
        setCsvLoading(false);
        return;
      }

      const addedCount = await addItems(parsedItems);
      const now = new Date().toISOString().slice(0, 10);
      await saveLastSync(now);
      setLastSync(now);

      setCsvLoading(false);

      let message = `${parsedItems.length}件の注文を読み込みました\n新規追加: ${addedCount}件`;
      if (skipped > 0) message += `\nスキップ: ${skipped}件`;
      if (usedFileName) message += `\n\n読み込んだファイル:\n${usedFileName}`;

      Alert.alert('インポート完了', message);
    } catch (e) {
      setCsvLoading(false);
      Alert.alert('エラー', `ファイルの読み込みに失敗しました: ${e.message}`);
    }
  }, [addItems, setLastSync, learnedCategories]);

  // ==================== Amazonデータリクエスト ====================
  const handleDataRequest = useCallback(() => {
    Linking.openURL(AMAZON_DATA_REQUEST_URL).catch(() => {
      Alert.alert('エラー', 'ブラウザを開けませんでした');
    });
  }, []);

  // ==================== メイン画面 ====================
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.icon}>📄</Text>
        <Text style={styles.title}>Amazon データ取り込み</Text>

        {/* STEP 1: データリクエスト */}
        <View style={styles.card}>
          <View style={styles.stepHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>STEP 1</Text>
            </View>
            <Text style={styles.cardTitle}>Amazonにデータをリクエスト</Text>
          </View>
          <Text style={styles.cardDesc}>
            Amazonから注文履歴データ（ZIP）を取得します。{'\n'}
            リクエスト後、数日でメールにダウンロードリンクが届きます。
          </Text>

          <TouchableOpacity style={styles.requestBtn} onPress={handleDataRequest}>
            <Text style={styles.requestBtnIcon}>🌐</Text>
            <Text style={styles.requestBtnText}>Amazonのデータリクエストページを開く</Text>
          </TouchableOpacity>

          <View style={styles.helpBox}>
            <Text style={styles.helpTitle}>リクエスト手順</Text>
            <Text style={styles.helpItem}>1. 上のボタンをタップ → ブラウザが開きます</Text>
            <Text style={styles.helpItem}>2. Amazonにログイン</Text>
            <Text style={styles.helpItem}>3.「データをリクエスト」で注文履歴を選択</Text>
            <Text style={styles.helpItem}>4. 数日後、メールでZIPファイルのリンクが届きます</Text>
            <Text style={styles.helpItem}>5. ZIPをダウンロードしたら、下のSTEP 2へ</Text>
          </View>
        </View>

        {/* STEP 2: ファイルインポート */}
        <View style={styles.card}>
          <View style={styles.stepHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>STEP 2</Text>
            </View>
            <Text style={styles.cardTitle}>データを読み込む</Text>
          </View>
          <Text style={styles.cardDesc}>
            ダウンロードしたZIPまたはCSVファイルを選択してください
          </Text>

          <TouchableOpacity
            style={styles.importBtn}
            onPress={handleFileImport}
            disabled={csvLoading}
          >
            {csvLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.importBtnIcon}>📁</Text>
                <Text style={styles.importBtnText}>CSV / ZIPファイルを選択</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.formatNote}>
            <Text style={styles.formatNoteTitle}>対応フォーマット</Text>
            <Text style={styles.formatNoteItem}>✅ ZIPファイル → 自動解凍してCSVを読み込み</Text>
            <Text style={styles.formatNoteItem}>✅ CSVファイル → そのまま読み込み</Text>
          </View>
        </View>

        {/* ステータス情報 */}
        {(lastSync || items.length > 0) && (
          <View style={styles.statusCard}>
            {items.length > 0 && (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>登録済みデータ</Text>
                <Text style={styles.statusValue}>{items.length}件</Text>
              </View>
            )}
            {lastSync && (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>最終更新</Text>
                <Text style={styles.statusValue}>{lastSync}</Text>
              </View>
            )}
            {Object.keys(learnedCategories).length > 0 && (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>🧠 学習済みルール</Text>
                <Text style={styles.statusValue}>{Object.keys(learnedCategories).length}件</Text>
              </View>
            )}
          </View>
        )}

        {/* データ管理 */}
        {items.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>データ管理</Text>
            <TouchableOpacity
              style={styles.dangerBtn}
              onPress={() => {
                Alert.alert(
                  '重複除去',
                  '重複しているデータを自動で除去します。よろしいですか？',
                  [
                    { text: 'キャンセル', style: 'cancel' },
                    {
                      text: '実行',
                      onPress: async () => {
                        const removed = await deduplicateItems();
                        Alert.alert('完了', removed + '件の重複データを除去しました');
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.dangerBtnIcon}>🧹</Text>
              <Text style={styles.dangerBtnText}>重複データを除去</Text>
            </TouchableOpacity>
            {Object.keys(learnedCategories).length > 0 && (
              <TouchableOpacity
                style={[styles.dangerBtn, { backgroundColor: '#F2CC8F', marginTop: 10 }]}
                onPress={() => {
                  Alert.alert(
                    '学習データリセット',
                    `${Object.keys(learnedCategories).length}件の学習済みカテゴリルールをリセットします。\nキーワードによる初期分類に戻ります。`,
                    [
                      { text: 'キャンセル', style: 'cancel' },
                      {
                        text: 'リセット',
                        style: 'destructive',
                        onPress: async () => {
                          await resetLearnedCategories();
                          Alert.alert('完了', '学習データをリセットしました');
                        },
                      },
                    ]
                  );
                }}
              >
                <Text style={styles.dangerBtnIcon}>🧠</Text>
                <Text style={[styles.dangerBtnText, { color: '#3D405B' }]}>学習データをリセット</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.dangerBtn, { backgroundColor: '#8D99AE', marginTop: 10 }]}
              onPress={() => {
                Alert.alert(
                  'データ全削除',
                  'すべてのデータを削除します。この操作は取り消せません。',
                  [
                    { text: 'キャンセル', style: 'cancel' },
                    {
                      text: '全削除',
                      style: 'destructive',
                      onPress: async () => {
                        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                        await AsyncStorage.clear();
                        Alert.alert('完了', 'すべてのデータを削除しました。アプリを再読み込みしてください。');
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.dangerBtnIcon}>🗑️</Text>
              <Text style={styles.dangerBtnText}>すべてのデータを削除</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* セキュリティノート */}
        <View style={styles.securityNote}>
          <Text style={styles.securityIcon}>🔒</Text>
          <Text style={styles.securityText}>
            データはすべてアプリ内に保存され、{'\n'}
            外部サーバには一切送信されません
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },
  scrollContent: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  icon: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#e0e0e0', marginBottom: 20 },
  // Card
  card: {
    width: '100%', padding: 16, borderRadius: 16, marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  stepBadge: {
    backgroundColor: '#81B29A', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  stepBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#e0e0e0' },
  cardDesc: { fontSize: 12, color: '#8D99AE', lineHeight: 18, marginBottom: 14 },
  // Request Button
  requestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12, marginBottom: 14,
    backgroundColor: '#F2CC8F',
  },
  requestBtnIcon: { fontSize: 18 },
  requestBtnText: { fontSize: 14, fontWeight: '700', color: '#3D405B' },
  // Import Button
  importBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12, marginBottom: 14,
    backgroundColor: '#81B29A',
  },
  importBtnIcon: { fontSize: 18 },
  importBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  // Format Note
  formatNote: {
    padding: 10, borderRadius: 8,
    backgroundColor: 'rgba(129,178,154,0.08)',
  },
  formatNoteTitle: { fontSize: 12, fontWeight: '700', color: '#81B29A', marginBottom: 6 },
  formatNoteItem: { fontSize: 11, color: '#e0e0e0', lineHeight: 20 },
  // Help
  helpBox: {
    padding: 12, backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  helpTitle: { fontSize: 12, fontWeight: '700', color: '#F2CC8F', marginBottom: 8 },
  helpItem: { fontSize: 11, color: '#8D99AE', lineHeight: 20, marginBottom: 2 },
  // Status
  statusCard: {
    width: '100%', padding: 14, borderRadius: 14, marginBottom: 16,
    backgroundColor: 'rgba(129,178,154,0.08)',
    borderWidth: 1, borderColor: 'rgba(129,178,154,0.15)',
  },
  statusRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 4,
  },
  statusLabel: { fontSize: 13, color: '#8D99AE' },
  statusValue: { fontSize: 13, fontWeight: '600', color: '#81B29A' },
  // Danger Buttons
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#E07A5F',
  },
  dangerBtnIcon: { fontSize: 18 },
  dangerBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  // Security
  securityNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8,
  },
  securityIcon: { fontSize: 16 },
  securityText: { fontSize: 11, color: '#8D99AE', lineHeight: 18 },
});

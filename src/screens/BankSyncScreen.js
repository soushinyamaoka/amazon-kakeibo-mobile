import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, SafeAreaView, ScrollView, Linking,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useData } from '../context/DataContext';
import { parseSMBCCSV } from '../utils/csvParser';
import { saveLastSync } from '../utils/storage';

const SMBC_DIRECT_URL = 'https://direct.smbc.co.jp/aib/aibgsjsw5001.jsp';
const SMBC_APP_URL = 'https://www.smbc.co.jp/kojin/app/';

export default function BankSyncScreen() {
  const { addItems, lastSync, setLastSync, items, deduplicateItems, learnedCategories } = useData();
  const [loading, setLoading] = useState(false);

  // ==================== ファイルインポート ====================
  const handleFileImport = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      setLoading(true);
      const file = result.assets[0];

      const response = await fetch(file.uri);
      const arrayBuffer = await response.arrayBuffer();
      const csvResult = await parseSMBCCSV(arrayBuffer, learnedCategories);

      if (csvResult.error) {
        Alert.alert('エラー', csvResult.error);
        setLoading(false);
        return;
      }

      const addedCount = await addItems(csvResult.items);
      const now = new Date().toISOString().slice(0, 10);
      await saveLastSync(now);
      setLastSync(now);

      setLoading(false);

      let message = `${csvResult.items.length}件の取引を読み込みました\n新規追加: ${addedCount}件`;
      if (csvResult.skipped > 0) message += `\nスキップ（入金等）: ${csvResult.skipped}件`;

      Alert.alert('インポート完了', message);
    } catch (e) {
      setLoading(false);
      Alert.alert('エラー', `ファイルの読み込みに失敗しました: ${e.message}`);
    }
  }, [addItems, setLastSync, learnedCategories]);

  // ==================== リンクを開く ====================
  const openSMBCDirect = useCallback(() => {
    Linking.openURL(SMBC_DIRECT_URL).catch(() => {
      Alert.alert('エラー', 'ブラウザを開けませんでした');
    });
  }, []);

  const openSMBCApp = useCallback(() => {
    Linking.openURL(SMBC_APP_URL).catch(() => {
      Alert.alert('エラー', 'ブラウザを開けませんでした');
    });
  }, []);

  // ==================== メイン画面 ====================
  const bankItems = items.filter((i) => i.source === 'smbc');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.icon}>🏦</Text>
        <Text style={styles.title}>銀行データ取り込み</Text>

        {/* STEP 1: SMBCダイレクトでCSV取得 */}
        <View style={styles.card}>
          <View style={styles.stepHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>STEP 1</Text>
            </View>
            <Text style={styles.cardTitle}>SMBCダイレクトでCSVを取得</Text>
          </View>
          <Text style={styles.cardDesc}>
            三井住友銀行の入出金明細をCSVでダウンロードします。{'\n'}
            以下のボタンからSMBCダイレクトを開いてください。
          </Text>

          <TouchableOpacity style={styles.smbcBtn} onPress={openSMBCDirect}>
            <Text style={styles.smbcBtnIcon}>🌐</Text>
            <Text style={styles.smbcBtnText}>SMBCダイレクト（Web）を開く</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.smbcAppBtn} onPress={openSMBCApp}>
            <Text style={styles.smbcAppBtnIcon}>📱</Text>
            <Text style={styles.smbcAppBtnText}>三井住友銀行アプリの案内を見る</Text>
          </TouchableOpacity>

          <View style={styles.helpBox}>
            <Text style={styles.helpTitle}>CSVダウンロード手順</Text>
            <View style={styles.helpStep}>
              <View style={styles.helpStepNum}><Text style={styles.helpStepNumText}>1</Text></View>
              <Text style={styles.helpStepText}>SMBCダイレクトにログイン</Text>
            </View>
            <View style={styles.helpStep}>
              <View style={styles.helpStepNum}><Text style={styles.helpStepNumText}>2</Text></View>
              <Text style={styles.helpStepText}>「入出金明細照会」を選択</Text>
            </View>
            <View style={styles.helpStep}>
              <View style={styles.helpStepNum}><Text style={styles.helpStepNumText}>3</Text></View>
              <Text style={styles.helpStepText}>照会期間を指定して検索</Text>
            </View>
            <View style={styles.helpStep}>
              <View style={styles.helpStepNum}><Text style={styles.helpStepNumText}>4</Text></View>
              <Text style={styles.helpStepText}>「CSVダウンロード」ボタンをタップ</Text>
            </View>
            <View style={styles.helpStep}>
              <View style={styles.helpStepNum}><Text style={styles.helpStepNumText}>5</Text></View>
              <Text style={styles.helpStepText}>ダウンロードしたら下のSTEP 2へ ↓</Text>
            </View>
          </View>
        </View>

        {/* STEP 2: ファイルインポート */}
        <View style={styles.card}>
          <View style={styles.stepHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>STEP 2</Text>
            </View>
            <Text style={styles.cardTitle}>CSVを読み込む</Text>
          </View>
          <Text style={styles.cardDesc}>
            ダウンロードしたCSVファイルを選択してください。{'\n'}
            お引出し（支出）のみが家計簿に取り込まれます。
          </Text>

          <TouchableOpacity
            style={styles.importBtn}
            onPress={handleFileImport}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.importBtnIcon}>📁</Text>
                <Text style={styles.importBtnText}>CSVファイルを選択</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.formatNote}>
            <Text style={styles.formatNoteTitle}>取り込み内容</Text>
            <Text style={styles.formatNoteItem}>✅ お引出し（支出）→ 自動でカテゴリ分類</Text>
            <Text style={styles.formatNoteItem}>⏭️ お預入れ（入金）→ 自動スキップ</Text>
            <Text style={styles.formatNoteItem}>🔍 Amazon引き落とし → 注文明細と紐づけ可能</Text>
          </View>
        </View>

        {/* ステータス情報 */}
        {(lastSync || bankItems.length > 0) && (
          <View style={styles.statusCard}>
            {bankItems.length > 0 && (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>銀行データ</Text>
                <Text style={styles.statusValue}>{bankItems.length}件</Text>
              </View>
            )}
            {lastSync && (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>最終更新</Text>
                <Text style={styles.statusValue}>{lastSync}</Text>
              </View>
            )}
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
    backgroundColor: '#457B9D', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  stepBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#e0e0e0' },
  cardDesc: { fontSize: 12, color: '#8D99AE', lineHeight: 18, marginBottom: 14 },
  // SMBC Direct Button
  smbcBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12, marginBottom: 8,
    backgroundColor: '#457B9D',
  },
  smbcBtnIcon: { fontSize: 18 },
  smbcBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  // SMBC App Button
  smbcAppBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 12, marginBottom: 14,
    backgroundColor: 'rgba(69,123,157,0.15)',
    borderWidth: 1, borderColor: 'rgba(69,123,157,0.3)',
  },
  smbcAppBtnIcon: { fontSize: 16 },
  smbcAppBtnText: { fontSize: 13, fontWeight: '600', color: '#457B9D' },
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
  helpTitle: { fontSize: 12, fontWeight: '700', color: '#457B9D', marginBottom: 10 },
  helpStep: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8,
  },
  helpStepNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(69,123,157,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  helpStepNumText: { fontSize: 11, fontWeight: '800', color: '#457B9D' },
  helpStepText: { fontSize: 12, color: '#c0c0c0', flex: 1 },
  // Status
  statusCard: {
    width: '100%', padding: 14, borderRadius: 14, marginBottom: 16,
    backgroundColor: 'rgba(69,123,157,0.08)',
    borderWidth: 1, borderColor: 'rgba(69,123,157,0.15)',
  },
  statusRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 4,
  },
  statusLabel: { fontSize: 13, color: '#8D99AE' },
  statusValue: { fontSize: 13, fontWeight: '600', color: '#457B9D' },
  // Security
  securityNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8,
  },
  securityIcon: { fontSize: 16 },
  securityText: { fontSize: 11, color: '#8D99AE', lineHeight: 18 },
});

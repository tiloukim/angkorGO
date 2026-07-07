// Provider wallet — balance, payout request, and withdrawal history.
import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useLocale } from '@/lib/locale';
import type { Language } from '@angkorgo/shared';

const L: Record<Language, Record<string, string>> = {
  en: {
    enterAmount: 'Enter an amount', withdrawalFailed: 'Withdrawal failed',
    title: 'Wallet',
    availableBalance: 'Available balance',
    cashCommissionOwed: 'Cash commission owed',
    amountPh: 'Amount to withdraw',
    requestPayout: 'Request payout',
    history: 'History',
    noWithdrawals: 'No withdrawals yet',
    back: 'Back',
  },
  km: {
    enterAmount: 'បញ្ចូល​ចំនួន​ទឹកប្រាក់', withdrawalFailed: 'ដក​ប្រាក់​បរាជ័យ',
    title: 'កាបូប',
    availableBalance: 'សមតុល្យ​ដែល​អាច​ប្រើ​បាន',
    cashCommissionOwed: 'កម្រៃ​ជើងសា​ជា​សាច់ប្រាក់​ដែល​ជំពាក់',
    amountPh: 'ចំនួន​ដែល​ត្រូវ​ដក',
    requestPayout: 'ស្នើ​ដក​ប្រាក់',
    history: 'ប្រវត្តិ',
    noWithdrawals: 'មិន​ទាន់​មាន​ការ​ដក​ប្រាក់',
    back: 'ថយក្រោយ',
  },
  zh: {
    enterAmount: '请输入金额', withdrawalFailed: '提现失败',
    title: '钱包',
    availableBalance: '可用余额',
    cashCommissionOwed: '欠付现金佣金',
    amountPh: '提现金额',
    requestPayout: '申请提现',
    history: '历史记录',
    noWithdrawals: '暂无提现记录',
    back: '返回',
  },
};

interface Withdrawal { id: string; amount: number; status: string; requested_at: string }

export default function WalletScreen() {
  const router = useRouter();
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
  const [balance, setBalance] = useState(0);
  const [ledger, setLedger] = useState(0);
  const [amount, setAmount] = useState('');
  const [rows, setRows] = useState<Withdrawal[]>([]);

  const load = useCallback(async () => {
    const [{ data: w }, { data: wd }, { data: lb }] = await Promise.all([
      supabase.from('wallets').select('balance').maybeSingle(),
      supabase.from('withdrawals').select('id, amount, status, requested_at').order('requested_at', { ascending: false }),
      supabase.rpc('driver_ledger_balance'),
    ]);
    setBalance(Number(w?.balance ?? 0));
    setLedger(Number(lb ?? 0));
    setRows((wd ?? []) as Withdrawal[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function withdraw() {
    const value = Number(amount);
    if (!value || value <= 0) return Alert.alert(t.enterAmount);
    const { error } = await supabase.rpc('request_withdrawal', {
      p_amount: value, p_method: 'aba_payway', p_destination: 'default',
    });
    if (error) return Alert.alert(t.withdrawalFailed, error.message);
    setAmount('');
    load();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>{t.title}</Text>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>{t.availableBalance}</Text>
        <Text style={styles.balance}>${balance.toFixed(2)}</Text>
        {ledger < 0 && (
          <Text style={styles.owed}>{t.cashCommissionOwed}: ${Math.abs(ledger).toFixed(2)}</Text>
        )}
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input} placeholder={t.amountPh} placeholderTextColor="#9AA0A6"
          keyboardType="decimal-pad" value={amount} onChangeText={setAmount}
        />
        <Pressable style={styles.primary} onPress={withdraw}>
          <Text style={styles.primaryText}>{t.requestPayout}</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>{t.history}</Text>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        ListEmptyComponent={<Text style={styles.empty}>{t.noWithdrawals}</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowAmount}>${Number(item.amount).toFixed(2)}</Text>
            <Text style={[styles.rowStatus, item.status === 'paid' && { color: '#00B14F' }]}>{item.status}</Text>
          </View>
        )}
      />

      <Pressable style={styles.back} onPress={() => router.replace('/(provider)')}>
        <Text style={styles.backText}>{t.back}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7', padding: 24, paddingTop: 72 },
  h1: { color: '#1C1C1C', fontSize: 24, fontWeight: '800' },
  balanceCard: { backgroundColor: '#00B14F', borderRadius: 16, padding: 24, marginTop: 16, borderWidth: 1, borderColor: '#00B14F' },
  balanceLabel: { color: '#DDF3E6', fontSize: 14 },
  balance: { color: '#fff', fontSize: 40, fontWeight: '800', marginTop: 4 },
  owed: { color: '#FF6D00', fontSize: 13, marginTop: 8 },
  form: { gap: 10, marginTop: 20 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, color: '#1C1C1C', fontSize: 16, borderWidth: 1, borderColor: '#ECECEC' },
  primary: { backgroundColor: '#00B14F', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  section: { color: '#1C1C1C', fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 8 },
  empty: { color: '#9AA0A6', marginTop: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ECECEC' },
  rowAmount: { color: '#1C1C1C', fontWeight: '700' },
  rowStatus: { color: '#7A7A7A', textTransform: 'capitalize' },
  back: { padding: 16, alignItems: 'center' },
  backText: { color: '#7A7A7A', fontWeight: '600' },
});

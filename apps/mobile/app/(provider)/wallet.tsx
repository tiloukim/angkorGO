// Provider wallet — balance, payout request, and withdrawal history.
import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

interface Withdrawal { id: string; amount: number; status: string; requested_at: string }

export default function WalletScreen() {
  const router = useRouter();
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
    if (!value || value <= 0) return Alert.alert('Enter an amount');
    const { error } = await supabase.rpc('request_withdrawal', {
      p_amount: value, p_method: 'aba_payway', p_destination: 'default',
    });
    if (error) return Alert.alert('Withdrawal failed', error.message);
    setAmount('');
    load();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Wallet</Text>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available balance</Text>
        <Text style={styles.balance}>${balance.toFixed(2)}</Text>
        {ledger < 0 && (
          <Text style={styles.owed}>Cash commission owed: ${Math.abs(ledger).toFixed(2)}</Text>
        )}
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input} placeholder="Amount to withdraw" placeholderTextColor="#5B6B84"
          keyboardType="decimal-pad" value={amount} onChangeText={setAmount}
        />
        <Pressable style={styles.primary} onPress={withdraw}>
          <Text style={styles.primaryText}>Request payout</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>History</Text>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        ListEmptyComponent={<Text style={styles.empty}>No withdrawals yet</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowAmount}>${Number(item.amount).toFixed(2)}</Text>
            <Text style={[styles.rowStatus, item.status === 'paid' && { color: '#10B981' }]}>{item.status}</Text>
          </View>
        )}
      />

      <Pressable style={styles.back} onPress={() => router.replace('/(provider)')}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220', padding: 24, paddingTop: 72 },
  h1: { color: '#fff', fontSize: 24, fontWeight: '800' },
  balanceCard: { backgroundColor: '#151E30', borderRadius: 16, padding: 24, marginTop: 16, borderWidth: 1, borderColor: '#1F2A40' },
  balanceLabel: { color: '#8FA3BF', fontSize: 14 },
  balance: { color: '#10B981', fontSize: 40, fontWeight: '800', marginTop: 4 },
  owed: { color: '#F5A524', fontSize: 13, marginTop: 8 },
  form: { gap: 10, marginTop: 20 },
  input: { backgroundColor: '#151E30', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#1F2A40' },
  primary: { backgroundColor: '#F04438', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  section: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 8 },
  empty: { color: '#5B6B84', marginTop: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#151E30' },
  rowAmount: { color: '#fff', fontWeight: '700' },
  rowStatus: { color: '#8FA3BF', textTransform: 'capitalize' },
  back: { padding: 16, alignItems: 'center' },
  backText: { color: '#8FA3BF', fontWeight: '600' },
});

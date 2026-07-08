// Courier active parcel — advance pickup → delivering, then complete with
// proof-of-delivery (the recipient's 4-digit code + optional photo).
import { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Language } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';
import { useLocationBroadcast } from '@/hooks/useLocationBroadcast';
import { useLocale } from '@/lib/locale';
import { pickImage } from '@/lib/imagePicker';
import { uploadParcelPhoto } from '@/lib/uploads';

type ParcelStatus = 'requested' | 'searching' | 'courier_assigned' | 'picked_up' | 'delivering' | 'delivered' | 'cancelled';
const ACTIVE: ParcelStatus[] = ['courier_assigned', 'picked_up', 'delivering'];

const L: Record<Language, Record<string, string>> = {
  en: {
    pickup: 'Pick up', dropoff: 'Deliver to', recipient: 'Recipient', fee: 'Fee', navigate: 'Navigate ↗',
    picked: "I've picked it up", startDelivery: 'Start delivery',
    proofTitle: 'Proof of delivery', codePlaceholder: 'Recipient 4-digit code',
    addProof: 'Add proof photo', proofAdded: 'Photo added ✓', deliver: 'Confirm delivery',
    delivered: 'Delivered ✓', settled: 'Cashless parcels are paid by the sender in-app.',
    back: 'Back to dashboard', wrongCode: 'Wrong delivery code', enterCode: 'Enter the recipient code', updateFailed: 'Update failed',
    photoAdd: 'Add photo', takePhoto: 'Take photo', choosePhoto: 'Choose from library', cancel: 'Cancel', cameraDenied: 'Camera permission is required.', uploadFailed: 'Upload failed',
  },
  km: {
    pickup: 'ទទួល', dropoff: 'ដឹកទៅ', recipient: 'អ្នកទទួល', fee: 'ថ្លៃ', navigate: 'នាំផ្លូវ ↗',
    picked: 'ខ្ញុំបានយកវា', startDelivery: 'ចាប់ផ្តើមដឹកជញ្ជូន',
    proofTitle: 'ភស្តុតាងនៃការដឹកជញ្ជូន', codePlaceholder: 'លេខកូដ ៤ ខ្ទង់របស់អ្នកទទួល',
    addProof: 'បន្ថែមរូបភស្តុតាង', proofAdded: 'បានបន្ថែមរូប ✓', deliver: 'បញ្ជាក់ការដឹកជញ្ជូន',
    delivered: 'បានដឹកជញ្ជូន ✓', settled: 'កញ្ចប់គ្មានសាច់ប្រាក់ត្រូវបង់ដោយអ្នកផ្ញើក្នុងកម្មវិធី។',
    back: 'ត្រឡប់ទៅផ្ទាំងគ្រប់គ្រង', wrongCode: 'លេខកូដមិនត្រឹមត្រូវ', enterCode: 'បញ្ចូលលេខកូដអ្នកទទួល', updateFailed: 'ធ្វើបច្ចុប្បន្នភាពបរាជ័យ',
    photoAdd: 'បន្ថែមរូបភាព', takePhoto: 'ថតរូប', choosePhoto: 'ជ្រើសពីបណ្ណាល័យ', cancel: 'បោះបង់', cameraDenied: 'ត្រូវការការអនុញ្ញាតកាមេរ៉ា។', uploadFailed: 'ការផ្ទុកឡើងបរាជ័យ',
  },
  zh: {
    pickup: '取件', dropoff: '送至', recipient: '收件人', fee: '费用', navigate: '导航 ↗',
    picked: '我已取件', startDelivery: '开始派送',
    proofTitle: '送达凭证', codePlaceholder: '收件人4位验证码',
    addProof: '添加凭证照片', proofAdded: '已添加照片 ✓', deliver: '确认送达',
    delivered: '已送达 ✓', settled: '无现金包裹由寄件人在应用内支付。',
    back: '返回仪表板', wrongCode: '验证码错误', enterCode: '请输入收件人验证码', updateFailed: '更新失败',
    photoAdd: '添加照片', takePhoto: '拍照', choosePhoto: '从相册选择', cancel: '取消', cameraDenied: '需要相机权限。', uploadFailed: '上传失败',
  },
};

export default function CourierParcel() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
  const [status, setStatus] = useState<ParcelStatus>('courier_assigned');
  const [pickup, setPickup] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [dropoff, setDropoff] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [recipient, setRecipient] = useState('');
  const [fee, setFee] = useState<number | null>(null);
  const [code, setCode] = useState('');
  const [proof, setProof] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useLocationBroadcast(ACTIVE.includes(status));

  async function load() {
    const { data } = await supabase.from('parcels')
      .select('status, pickup_lat, pickup_lng, pickup_address, dropoff_lat, dropoff_lng, dropoff_address, recipient_name, fee').eq('id', id).maybeSingle();
    if (!data) return;
    setStatus(data.status as ParcelStatus);
    setPickup({ lat: data.pickup_lat, lng: data.pickup_lng, address: data.pickup_address ?? '' });
    setDropoff({ lat: data.dropoff_lat, lng: data.dropoff_lng, address: data.dropoff_address ?? '' });
    setRecipient(data.recipient_name ?? '');
    setFee(Number(data.fee));
  }

  useEffect(() => {
    if (!id) return;
    load();
    const channel = supabase.channel(`cparcel:${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'parcels', filter: `id=eq.${id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  async function advance(to: 'picked_up' | 'delivering') {
    const { error } = await supabase.rpc('advance_parcel', { p_parcel: id, p_to: to });
    if (error) Alert.alert(t.updateFailed, error.message);
  }

  async function addProof() {
    const uri = await pickImage({ addPhoto: t.photoAdd, takePhoto: t.takePhoto, choosePhoto: t.choosePhoto, cancel: t.cancel, cameraDenied: t.cameraDenied });
    if (!uri) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setProof(await uploadParcelPhoto(user?.id ?? 'anon', uri));
    } catch (e: any) { Alert.alert(t.uploadFailed, e.message); }
  }

  async function deliver() {
    if (code.trim().length < 4) return Alert.alert(t.enterCode);
    setBusy(true);
    const { error } = await supabase.rpc('deliver_parcel', { p_parcel: id, p_code: code.trim(), p_proof_photo_url: proof });
    setBusy(false);
    if (error) return Alert.alert(t.wrongCode, error.message);
  }

  function navigateTo() {
    const target = status === 'delivering' ? dropoff : pickup;
    if (target) Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}`);
  }

  const heading = status === 'delivering' ? dropoff : pickup;

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{status.replace(/_/g, ' ').toUpperCase()}</Text>
      <Text style={styles.label}>{status === 'delivering' ? t.dropoff : t.pickup}</Text>
      <Text style={styles.addr}>{heading?.address}</Text>
      {status === 'delivering' && recipient ? <Text style={styles.recipient}>{t.recipient}: {recipient}</Text> : null}
      {fee != null && <Text style={styles.fee}>{t.fee} ${Number(fee).toFixed(2)}</Text>}

      <View style={styles.actions}>
        {status === 'delivered' && (
          <View style={styles.doneCard}>
            <Text style={styles.doneTitle}>{t.delivered}</Text>
            <Text style={styles.doneSub}>{t.settled}</Text>
          </View>
        )}

        {status === 'delivering' && (
          <View style={styles.proof}>
            <Text style={styles.proofTitle}>{t.proofTitle}</Text>
            <TextInput style={styles.codeInput} placeholder={t.codePlaceholder} placeholderTextColor="#9AA0A6"
              keyboardType="number-pad" maxLength={4} value={code} onChangeText={setCode} />
            <Pressable style={styles.proofBtn} onPress={addProof}>
              <Text style={[styles.proofBtnText, proof && { color: '#00B14F' }]}>{proof ? t.proofAdded : `📷 ${t.addProof}`}</Text>
            </Pressable>
          </View>
        )}

        {ACTIVE.includes(status) && (
          <Pressable style={styles.nav} onPress={navigateTo}><Text style={styles.navText}>{t.navigate}</Text></Pressable>
        )}

        {status === 'courier_assigned' && (
          <Pressable style={styles.primary} onPress={() => advance('picked_up')}><Text style={styles.primaryText}>{t.picked}</Text></Pressable>
        )}
        {status === 'picked_up' && (
          <Pressable style={styles.primary} onPress={() => advance('delivering')}><Text style={styles.primaryText}>{t.startDelivery}</Text></Pressable>
        )}
        {status === 'delivering' && (
          <Pressable style={[styles.primary, busy && { opacity: 0.6 }]} onPress={deliver} disabled={busy}><Text style={styles.primaryText}>{t.deliver}</Text></Pressable>
        )}

        <Pressable style={styles.back} onPress={() => router.replace('/(provider)')}><Text style={styles.backText}>{t.back}</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7', padding: 24, paddingTop: 80 },
  status: { color: '#00B14F', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  label: { color: '#7A7A7A', fontSize: 13, marginTop: 16 },
  addr: { color: '#1C1C1C', fontSize: 22, fontWeight: '700', marginTop: 4 },
  recipient: { color: '#7A7A7A', fontSize: 14, marginTop: 8 },
  fee: { color: '#00B14F', fontSize: 18, fontWeight: '800', marginTop: 12 },
  actions: { marginTop: 'auto', gap: 10 },
  proof: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#ECECEC' },
  proofTitle: { color: '#1C1C1C', fontSize: 15, fontWeight: '700', marginBottom: 10 },
  codeInput: { backgroundColor: '#F5F6F7', borderRadius: 10, padding: 14, color: '#1C1C1C', fontSize: 20, fontWeight: '800', letterSpacing: 4, textAlign: 'center', borderWidth: 1, borderColor: '#ECECEC' },
  proofBtn: { padding: 14, alignItems: 'center', marginTop: 8 },
  proofBtnText: { color: '#7A7A7A', fontWeight: '700' },
  doneCard: { backgroundColor: '#E4F7EC', borderRadius: 12, padding: 16 },
  doneTitle: { color: '#00B14F', fontSize: 18, fontWeight: '800' },
  doneSub: { color: '#3A7D57', fontSize: 13, marginTop: 4 },
  nav: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#ECECEC' },
  navText: { color: '#1C1C1C', fontWeight: '700' },
  primary: { backgroundColor: '#00B14F', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  back: { padding: 14, alignItems: 'center' },
  backText: { color: '#7A7A7A', fontWeight: '600' },
});

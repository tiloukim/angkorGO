// Post-trip star rating (rider→driver or driver→rider). Calls submit_trip_review,
// which folds a driver's rating into their provider average.
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { type Language } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';
import { useLocale } from '@/lib/locale';

const L: Record<Language, Record<string, string>> = {
  en: { thanks: 'Thanks for your feedback!', comment: 'Add a comment (optional)', submit: 'Submit rating', tapStar: 'Tap a star to rate', couldNotSubmit: 'Could not submit' },
  km: { thanks: 'អរគុណសម្រាប់មតិរបស់អ្នក!', comment: 'បន្ថែមមតិ (ស្រេចចិត្ត)', submit: 'ដាក់ស្នើការវាយតម្លៃ', tapStar: 'ចុចផ្កាយដើម្បីវាយតម្លៃ', couldNotSubmit: 'មិនអាចដាក់ស្នើ' },
  zh: { thanks: '感谢您的反馈！', comment: '添加评论（可选）', submit: '提交评分', tapStar: '点击星星评分', couldNotSubmit: '无法提交' },
};

export function TripRating({ tripId, title, onDone }: { tripId: string; title: string; onDone?: () => void }) {
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);

  async function submit() {
    if (!rating) return Alert.alert(t.tapStar);
    const { error } = await supabase.rpc('submit_trip_review', {
      p_trip: tripId, p_rating: rating, p_comment: comment || null,
    });
    if (error) return Alert.alert(t.couldNotSubmit, error.message);
    setDone(true);
    onDone?.();
  }

  if (done) return <Text style={styles.thanks}>{t.thanks}</Text>;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setRating(n)} hitSlop={6}>
            <Text style={[styles.star, n <= rating && styles.starOn]}>★</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        style={styles.input} placeholder={t.comment} placeholderTextColor="#9AA0A6"
        value={comment} onChangeText={setComment}
      />
      <Pressable style={styles.btn} onPress={submit}><Text style={styles.btnText}>{t.submit}</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#ECECEC', marginTop: 12 },
  title: { color: '#1C1C1C', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  thanks: { color: '#1C1C1C', fontSize: 16, fontWeight: '700', textAlign: 'center', marginTop: 20 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 16 },
  star: { fontSize: 40, color: '#D0D0D0' },
  starOn: { color: '#FFC400' },
  input: { backgroundColor: '#F5F6F7', borderRadius: 12, padding: 14, color: '#1C1C1C', borderWidth: 1, borderColor: '#ECECEC', marginBottom: 14 },
  btn: { backgroundColor: '#00B14F', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
});

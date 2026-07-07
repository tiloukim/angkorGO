// Post-job review — customer rates the provider 1–5. Inserting a review fires
// the recompute_provider_rating trigger to update the provider's average.
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { type Language } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';
import { useLocale } from '@/lib/locale';

const L: Record<Language, Record<string, string>> = {
  en: {
    title: 'Rate your provider', thanks: 'Thanks for your feedback!', done: 'Done',
    comment: 'Add a comment (optional)', submit: 'Submit review',
    tapStar: 'Tap a star to rate', couldNotSubmit: 'Could not submit',
  },
  km: {
    title: 'វាយតម្លៃអ្នកផ្តល់សេវា', thanks: 'អរគុណសម្រាប់មតិរបស់អ្នក!', done: 'រួចរាល់',
    comment: 'បន្ថែមមតិ (ស្រេចចិត្ត)', submit: 'ដាក់ស្នើការវាយតម្លៃ',
    tapStar: 'ចុចផ្កាយដើម្បីវាយតម្លៃ', couldNotSubmit: 'មិនអាចដាក់ស្នើ',
  },
  zh: {
    title: '评价服务商', thanks: '感谢您的反馈！', done: '完成',
    comment: '添加评论（可选）', submit: '提交评价',
    tapStar: '点击星星评分', couldNotSubmit: '无法提交',
  },
};

export function ReviewPrompt({
  requestId, providerId, onDone,
}: { requestId: string; providerId: string; onDone: () => void }) {
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);

  async function submit() {
    if (!rating) return Alert.alert(t.tapStar);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('reviews').insert({
      request_id: requestId, provider_id: providerId, customer_id: user?.id, rating, comment: comment || null,
    });
    if (error) return Alert.alert(t.couldNotSubmit, error.message);
    setDone(true);
  }

  if (done) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.thanks}>{t.thanks}</Text>
        <Pressable style={styles.primary} onPress={onDone}><Text style={styles.primaryText}>{t.done}</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t.title}</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setRating(n)}>
            <Text style={[styles.star, n <= rating && styles.starOn]}>★</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        style={styles.input} placeholder={t.comment} placeholderTextColor="#9AA0A6"
        value={comment} onChangeText={setComment}
      />
      <Pressable style={styles.primary} onPress={submit}><Text style={styles.primaryText}>{t.submit}</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 8 },
  title: { color: '#1C1C1C', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  thanks: { color: '#1C1C1C', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 16 },
  star: { fontSize: 40, color: '#D0D0D0' },
  starOn: { color: '#FFC400' },
  input: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, color: '#1C1C1C', borderWidth: 1, borderColor: '#ECECEC', marginBottom: 16 },
  primary: { backgroundColor: '#00B14F', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
});

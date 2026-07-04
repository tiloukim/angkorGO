// Post-job review — customer rates the provider 1–5. Inserting a review fires
// the recompute_provider_rating trigger to update the provider's average.
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';

export function ReviewPrompt({
  requestId, providerId, onDone,
}: { requestId: string; providerId: string; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);

  async function submit() {
    if (!rating) return Alert.alert('Tap a star to rate');
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('reviews').insert({
      request_id: requestId, provider_id: providerId, customer_id: user?.id, rating, comment: comment || null,
    });
    if (error) return Alert.alert('Could not submit', error.message);
    setDone(true);
  }

  if (done) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.thanks}>Thanks for your feedback!</Text>
        <Pressable style={styles.primary} onPress={onDone}><Text style={styles.primaryText}>Done</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Rate your provider</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setRating(n)}>
            <Text style={[styles.star, n <= rating && styles.starOn]}>★</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        style={styles.input} placeholder="Add a comment (optional)" placeholderTextColor="#5B6B84"
        value={comment} onChangeText={setComment}
      />
      <Pressable style={styles.primary} onPress={submit}><Text style={styles.primaryText}>Submit review</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 8 },
  title: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  thanks: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 16 },
  star: { fontSize: 40, color: '#1F2A40' },
  starOn: { color: '#F5A524' },
  input: { backgroundColor: '#151E30', borderRadius: 12, padding: 14, color: '#fff', borderWidth: 1, borderColor: '#1F2A40', marginBottom: 16 },
  primary: { backgroundColor: '#F04438', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
});

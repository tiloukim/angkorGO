// Edge Function: send-push
// Wire as a Database Webhook on INSERT into public.notifications. Looks up the
// recipient's Expo push tokens and delivers the notification.
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface NotificationRow {
  user_id: string;
  title: string;
  body: string | null;
  type: string | null;
  data: Record<string, unknown>;
}

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Database Webhook payload: { type, table, record, ... }
  const payload = await req.json().catch(() => null);
  const record: NotificationRow | undefined = payload?.record ?? payload;
  if (!record?.user_id) {
    return new Response(JSON.stringify({ error: 'no record' }), { status: 400 });
  }

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', record.user_id);

  if (!tokens?.length) return new Response(JSON.stringify({ sent: 0 }));

  const messages = tokens.map((t) => ({
    to: t.token,
    sound: 'default',
    title: record.title,
    body: record.body ?? '',
    data: { type: record.type, ...record.data },
    priority: 'high',
  }));

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });

  return new Response(JSON.stringify({ sent: messages.length, expo: await res.json() }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

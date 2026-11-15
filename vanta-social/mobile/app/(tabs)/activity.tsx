import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/auth/AuthProvider';
import { supabase } from '../../src/lib/supabase';

type Notice = {
  id: string;
  type: 'follow' | 'like' | 'comment';
  body: string | null;
  created_at: string;
  is_read: boolean;
  actor: { username: string; display_name: string | null } | null;
};

export default function ActivityScreen() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (!userId) {
      setItems([]); setLoading(false); return;
    }
    if (refresh) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const { data, error: queryError } = await supabase.from('notifications')
        .select('id,type,body,created_at,is_read,actor:profiles!notifications_actor_id_fkey(username,display_name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }).limit(50);
      if (queryError) throw queryError;
      const notices = (data || []) as unknown as Notice[];
      setItems(notices);
      const unreadIds = notices.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length) {
        const { error: updateError } = await supabase.from('notifications')
          .update({ is_read: true }).eq('user_id', userId).in('id', unreadIds);
        if (!updateError) setItems(current => current.map(n => unreadIds.includes(n.id) ? { ...n, is_read: true } : n));
      }
    } catch {
      setError('No se pudo cargar la actividad. Revisá tu conexión e intentá nuevamente.');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
    if (!userId) return;
    const channel = supabase.channel(`activity:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => { void load(true); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [userId, load]);

  return <View style={s.root}>
    <Text style={s.title}>Actividad</Text>
    {loading && items.length === 0 ? <ActivityIndicator color="#c4b5fd" /> : <>
      {error ? <View style={s.error}><Text style={s.errorText}>{error}</Text>
        <Pressable onPress={() => void load(true)} accessibilityRole="button"><Text style={s.retry}>Reintentar</Text></Pressable>
      </View> : null}
      <FlatList data={items} keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#c4b5fd" />}
        renderItem={({ item }) => <View style={s.row}>
          <View style={[s.dot, item.is_read && s.readDot]} />
          <View style={{ flex: 1 }}>
            <Text style={s.text}><Text style={s.actor}>{item.actor?.display_name || item.actor?.username || 'Alguien'}</Text>{' '}
              {item.body || (item.type === 'follow' ? 'comenzó a seguirte' : item.type === 'like' ? 'indicó que le gusta tu publicación' : 'comentó tu publicación')}
            </Text>
            <Text style={s.date}>{new Date(item.created_at).toLocaleString()}</Text>
          </View>
        </View>}
        ListEmptyComponent={!error ? <Text style={s.empty}>Todavía no tenés actividad nueva.</Text> : null} />
    </>}
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#09090b', padding: 18 },
  title: { color: '#fafafa', fontSize: 28, fontWeight: '900', marginTop: 12, marginBottom: 20 },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 15, borderBottomColor: '#27272a', borderBottomWidth: 1 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#a78bfa', marginTop: 5 },
  readDot: { backgroundColor: '#3f3f46' },
  text: { color: '#d4d4d8', fontSize: 13, lineHeight: 19 },
  actor: { fontWeight: '900', color: '#fafafa' },
  date: { color: '#71717a', fontSize: 10, marginTop: 6 },
  empty: { color: '#a1a1aa', textAlign: 'center', padding: 30 },
  error: { borderColor: '#7f1d1d', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  errorText: { color: '#fca5a5', lineHeight: 20 },
  retry: { color: '#c4b5fd', fontWeight: '700', marginTop: 10 }
});

import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/auth/AuthProvider';
import { supabase } from '../../src/lib/supabase';

type Person = { id: string; username: string; display_name: string; avatar_url: string; bio: string };
type Post = { id: string; caption: string; kind: 'post' | 'clip'; created_at: string; user_id: string };
type Tab = 'people' | 'posts';

export default function ExploreScreen() {
  const { session } = useAuth();
  const [term, setTerm] = useState('');
  const [tab, setTab] = useState<Tab>('people');
  const [people, setPeople] = useState<Person[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (nextTab: Tab = tab) => {
    const q = term.trim().replace(/[^\p{L}\p{N}_.\s-]/gu, '').slice(0, 60);
    if (!q) {
      setSearched(false); setPeople([]); setPosts([]); return;
    }
    setLoading(true);
    try {
      // Escape SQL LIKE wildcards so user input is treated as a literal search term.
      const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
      if (nextTab === 'people') {
        const { data, error } = await supabase.from('profiles')
          .select('id,username,display_name,avatar_url,bio')
          .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
          .order('followers_count', { ascending: false }).limit(30);
        if (error) throw error;
        const rows = (data || []) as Person[];
        setPeople(rows);
        if (session?.user.id && rows.length) {
          const { data: relations, error: followError } = await supabase.from('follows')
            .select('following_id').eq('follower_id', session.user.id)
            .in('following_id', rows.map(p => p.id));
          if (followError) throw followError;
          setFollowed(new Set((relations || []).map(r => r.following_id)));
        } else setFollowed(new Set());
      } else {
        const { data, error } = await supabase.from('posts')
          .select('id,caption,kind,created_at,user_id')
          .ilike('caption', pattern).order('created_at', { ascending: false }).limit(30);
        if (error) throw error;
        setPosts((data || []) as Post[]);
      }
      setSearched(true);
    } catch {
      Alert.alert('Error al buscar', 'No se pudieron cargar los resultados. Intentá nuevamente.');
    } finally { setLoading(false); }
  }, [term, tab, session?.user.id]);

  const changeTab = (next: Tab) => {
    if (next === tab) return;
    setTab(next);
    if (term.trim()) void search(next);
  };

  const toggleFollow = async (id: string) => {
    if (!session?.user.id || id === session.user.id) return;
    const isFollowing = followed.has(id);
    const { error } = isFollowing
      ? await supabase.from('follows').delete().eq('follower_id', session.user.id).eq('following_id', id)
      : await supabase.from('follows').insert({ follower_id: session.user.id, following_id: id });
    if (error) { Alert.alert('No se pudo actualizar', 'Intentá nuevamente.'); return; }
    setFollowed(prev => {
      const next = new Set(prev);
      if (isFollowing) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openChat = async (id: string) => {
    const { data, error } = await supabase.rpc('get_or_create_conversation', { other: id });
    if (error) { Alert.alert('No se pudo abrir el chat', error.message); return; }
    router.push({ pathname: '/chat/[id]', params: { id: String(data) } });
  };

  return <View style={s.root}>
    <Text style={s.title}>Explorar</Text>
    <View style={s.search}>
      <Ionicons name="search" color="#a1a1aa" size={19} />
      <TextInput value={term} onChangeText={setTerm} onSubmitEditing={() => void search()}
        placeholder="Buscar personas o publicaciones" placeholderTextColor="#71717a"
        style={s.input} returnKeyType="search" accessibilityLabel="Buscar en VANTA" />
      <Pressable onPress={() => void search()} disabled={loading} accessibilityRole="button" accessibilityLabel="Buscar">
        <Text style={s.go}>Buscar</Text>
      </Pressable>
    </View>
    <View style={s.tabs}>
      <Pressable style={[s.tab, tab === 'people' && s.activeTab]} onPress={() => changeTab('people')}
        accessibilityRole="tab" accessibilityState={{ selected: tab === 'people' }}>
        <Text style={[s.tabText, tab === 'people' && s.activeText]}>Personas</Text>
      </Pressable>
      <Pressable style={[s.tab, tab === 'posts' && s.activeTab]} onPress={() => changeTab('posts')}
        accessibilityRole="tab" accessibilityState={{ selected: tab === 'posts' }}>
        <Text style={[s.tabText, tab === 'posts' && s.activeText]}>Publicaciones</Text>
      </Pressable>
    </View>
    {loading ? <ActivityIndicator color="#a78bfa" style={{ marginTop: 48 }} /> :
      !searched ? <View style={s.discover}><Ionicons name="aperture-outline" size={42} color="#a78bfa" />
        <Text style={s.empty}>Encontrá personas, ideas y nuevas perspectivas.</Text></View> :
      tab === 'people' ?
        <FlatList keyboardShouldPersistTaps="handled" data={people} keyExtractor={p => p.id}
          renderItem={({ item }) => <View style={s.person}>
            <View style={s.avatar}><Text style={s.initial}>{(item.display_name || item.username).slice(0, 1).toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}><Text style={s.name}>{item.display_name || item.username}</Text>
              <Text style={s.handle}>@{item.username}</Text></View>
            {item.id !== session?.user.id && <>
              <Pressable onPress={() => void toggleFollow(item.id)} style={s.follow} accessibilityRole="button">
                <Text style={s.followText}>{followed.has(item.id) ? 'Siguiendo' : 'Seguir'}</Text>
              </Pressable>
              <Pressable onPress={() => void openChat(item.id)} style={s.message} accessibilityLabel={`Mensaje a ${item.username}`} accessibilityRole="button">
                <Ionicons name="paper-plane-outline" color="#d4d4d8" size={17} />
              </Pressable>
            </>}
          </View>}
          ListEmptyComponent={<Text style={s.empty}>No encontramos perfiles con ese nombre.</Text>} /> :
        <FlatList keyboardShouldPersistTaps="handled" data={posts} keyExtractor={p => p.id}
          renderItem={({ item }) => <Pressable style={s.post} onPress={() => router.push({ pathname: '/post/[id]', params: { id: item.id } })} accessibilityRole="button">
            <Ionicons name={item.kind === 'clip' ? 'videocam-outline' : 'images-outline'} size={22} color="#a78bfa" />
            <View style={{ flex: 1 }}>
              <Text style={s.name} numberOfLines={2}>{item.caption || (item.kind === 'clip' ? 'Clip' : 'Publicación')}</Text>
              <Text style={s.handle}>{item.kind === 'clip' ? 'Clip' : 'Publicación'} · {new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#71717a" />
          </Pressable>}
          ListEmptyComponent={<Text style={s.empty}>No encontramos publicaciones con ese texto.</Text>} />}
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#09090b', padding: 18 },
  title: { color: '#fafafa', fontSize: 28, fontWeight: '900', marginTop: 12, marginBottom: 22 },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', borderColor: '#303036', borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, gap: 9 },
  input: { flex: 1, color: '#fafafa', paddingVertical: 14 },
  go: { color: '#c4b5fd', fontWeight: '800' },
  tabs: { flexDirection: 'row', marginTop: 18, marginBottom: 6, gap: 10 },
  tab: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 20, backgroundColor: '#18181b' },
  activeTab: { backgroundColor: '#7c3aed' },
  tabText: { color: '#a1a1aa', fontWeight: '700' },
  activeText: { color: '#fff' },
  person: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, borderBottomColor: '#27272a', borderBottomWidth: 1 },
  post: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 18, borderBottomColor: '#27272a', borderBottomWidth: 1 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#312e81', alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#ddd6fe', fontWeight: '900' },
  name: { color: '#fafafa', fontWeight: '800' },
  handle: { color: '#71717a', fontSize: 12, marginTop: 3 },
  follow: { backgroundColor: '#c4b5fd', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9 },
  followText: { color: '#09090b', fontSize: 11, fontWeight: '900' },
  message: { padding: 8 },
  empty: { color: '#a1a1aa', textAlign: 'center', padding: 24, lineHeight: 21 },
  discover: { alignItems: 'center', justifyContent: 'center', paddingTop: 100, gap: 14 }
});

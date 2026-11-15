import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/auth/AuthProvider';
import { supabase } from '../../src/lib/supabase';

type ProfilePost = { id: string; media_urls: string[]; poster_url: string | null; kind: 'post' | 'clip' };
type Tab = 'posts' | 'clips' | 'saved';

export default function ProfileScreen() {
  const { session, profile, signOut, refreshProfile } = useAuth();
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [tab, setTab] = useState<Tab>('posts');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session?.user.id) return;
    supabase.from('posts').select('id,media_urls,poster_url,kind').eq('user_id', session.user.id).order('created_at', { ascending: false })
      .then(({ data }) => setPosts((data || []) as ProfilePost[]));
  }, [session?.user.id]);

  const visiblePosts = useMemo(() => tab === 'posts' ? posts.filter(p => p.kind === 'post') : tab === 'clips' ? posts.filter(p => p.kind === 'clip') : [], [posts, tab]);
  const logout = () => Alert.alert('Cerrar sesión', '¿Querés salir de VANTA?', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Salir', style: 'destructive', onPress: async () => { setBusy(true); await signOut(); setBusy(false); } }
  ]);
  const initial = (profile?.display_name || profile?.username || 'V').slice(0, 1).toUpperCase();

  return (
    <ScrollView style={s.root} contentContainerStyle={{ paddingBottom: 34 }}>
      <View style={s.cover}>
        {profile?.banner_url ? <Image source={{ uri: profile.banner_url }} style={StyleSheet.absoluteFillObject} resizeMode="cover" /> :
          <View style={[s.coverGlow, { backgroundColor: profile?.theme_color || '#8b5cf6', opacity: 0.4 }]} />}
        <Pressable style={s.logoutButton} onPress={logout}><Text style={s.logoutIcon}>×</Text></Pressable>
      </View>

      <View style={s.content}>
        <View style={s.identityRow}>
          {profile?.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={s.avatar} /> : <View style={[s.avatar, s.avatarFallback]}><Text style={s.avatarText}>{initial}</Text></View>}
          <Pressable style={s.profileButton} onPress={() => router.push('/edit-profile')}><Text style={s.profileButtonText}>Tu perfil</Text></Pressable>
        </View>

        <View style={s.identity}>
          <View style={s.nameRow}>
            <Text style={[s.name, { color: profile?.theme_color || '#fafafa' }]}>{profile?.display_name || 'Tu perfil'}</Text>
            {profile?.is_verified && <Text style={s.verified}>✓</Text>}
          </View>
          <Text style={s.handle}>@{profile?.username || 'usuario'}</Text>
          {!!profile?.bio && <Text style={s.bio}>{profile.bio}</Text>}
        </View>

        <View style={s.stats}>
          <View style={s.statItem}><Text style={s.stat}>{profile?.posts_count ?? posts.filter(p => p.kind === 'post').length}</Text><Text style={s.statLabel}>Publicaciones</Text></View>
          <View style={s.statItem}><Text style={s.stat}>{profile?.followers_count ?? 0}</Text><Text style={s.statLabel}>Seguidores</Text></View>
          <View style={s.statItem}><Text style={s.stat}>{profile?.following_count ?? 0}</Text><Text style={s.statLabel}>Siguiendo</Text></View>
        </View>
      </View>

      <View style={s.tabs}>
        {([{ id: 'posts', label: '▦  Posts' }, { id: 'clips', label: '▤  Clips' }, { id: 'saved', label: '♧  Guardados' }] as const).map(item => (
          <Pressable key={item.id} onPress={() => setTab(item.id)} style={[s.tab, tab === item.id && s.activeTab]}><Text style={[s.tabText, tab === item.id && s.activeTabText]}>{item.label}</Text></Pressable>
        ))}
      </View>

      {busy && <ActivityIndicator color="#d4d4d8" style={{ marginTop: 20 }} />}
      {tab === 'saved' ? <Text style={s.empty}>Tus publicaciones guardadas aparecerán aquí.</Text> : visiblePosts.length ? (
        <View style={s.grid}>{visiblePosts.map(post => <Image key={post.id} source={{ uri: post.poster_url || post.media_urls?.[0] }} style={s.tile} />)}</View>
      ) : <Text style={s.empty}>{tab === 'clips' ? 'Todavía no publicaste clips.' : 'Todavía no publicaste nada.'}</Text>}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#09090b' },
  cover: { height: 190, backgroundColor: '#19191d', borderBottomWidth: 1, borderBottomColor: '#303035', overflow: 'hidden', justifyContent: 'flex-start', alignItems: 'flex-end', padding: 18 },
  coverGlow: { ...StyleSheet.absoluteFillObject, backgroundColor: '#19191d', opacity: 1 },
  logoutButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#08080a', alignItems: 'center', justifyContent: 'center' },
  logoutIcon: { color: '#fff', fontSize: 34, lineHeight: 38, fontWeight: '300' },
  content: { paddingHorizontal: 20, backgroundColor: '#111115', paddingBottom: 22 },
  identityRow: { marginTop: -78, minHeight: 100, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  avatar: { width: 144, height: 144, borderRadius: 72, borderWidth: 5, borderColor: '#111115', backgroundColor: '#24242b' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#f4f4f5', fontSize: 48, fontWeight: '800' },
  profileButton: { marginBottom: 7, borderWidth: 1, borderColor: '#34343a', borderRadius: 17, paddingHorizontal: 22, paddingVertical: 11, backgroundColor: '#19191d' },
  profileButtonText: { color: '#e4e4e7', fontSize: 15, fontWeight: '500' },
  identity: { marginTop: 24 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  name: { color: '#fafafa', fontSize: 26, fontWeight: '800' },
  verified: { color: '#d4d4d8', borderWidth: 2, borderColor: '#a1a1aa', width: 23, height: 23, borderRadius: 12, textAlign: 'center', textAlignVertical: 'center', fontSize: 14, overflow: 'hidden' },
  handle: { color: '#85858e', fontSize: 18, marginTop: 7 },
  bio: { color: '#d4d4d8', fontSize: 16, lineHeight: 25, marginTop: 20 },
  stats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 26, paddingTop: 23, borderTopWidth: 1, borderTopColor: '#29292e' },
  statItem: { alignItems: 'center', minWidth: 85 },
  stat: { color: '#fafafa', fontSize: 25, fontWeight: '700' },
  statLabel: { color: '#777780', fontSize: 13, marginTop: 8 },
  tabs: { height: 62, flexDirection: 'row', backgroundColor: '#09090b', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#242428' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#f4f4f5' },
  tabText: { color: '#71717a', fontSize: 14, fontWeight: '600' },
  activeTabText: { color: '#fafafa' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 7, padding: 10 },
  tile: { width: '31.9%', aspectRatio: 1, borderRadius: 12, backgroundColor: '#18181b' },
  empty: { color: '#71717a', textAlign: 'center', paddingVertical: 48, fontSize: 14 }
});

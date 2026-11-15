import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, useWindowDimensions, View, type ViewToken } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { supabase } from '../../src/lib/supabase';

type Clip = {
  id: string;
  media_urls: string[];
  poster_url: string | null;
  caption: string;
  created_at: string;
  author: { username: string; display_name: string } | null;
};
const PAGE_SIZE = 12;
const CLIP_SELECT = 'id,media_urls,poster_url,caption,created_at,author:profiles!posts_user_id_fkey(username,display_name)';

function ClipTile({ clip, active, height }: { clip: Clip; active: boolean; height: number }) {
  const uri = clip.media_urls?.[0];
  const player = useVideoPlayer(uri ? { uri, useCaching: true } : null, (instance) => { instance.loop = true; });
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    if (!uri || !active) { player.pause(); return; }
    if (paused) player.pause(); else player.play();
    return () => { player.pause(); };
  }, [active, paused, player, uri]);
  useEffect(() => { player.muted = muted; }, [muted, player]);
  useEffect(() => { if (!active) setPaused(false); }, [active]);

  return <View style={[styles.tile, { height }]}>
    {uri ? <VideoView player={player} style={StyleSheet.absoluteFillObject} contentFit="cover" nativeControls={false} /> :
      <View style={styles.unavailable}><Text style={styles.unavailableText}>Este clip no tiene vídeo disponible.</Text></View>}
    <Pressable style={styles.playArea} accessibilityRole="button"
      accessibilityLabel={paused ? 'Reproducir clip' : 'Pausar clip'}
      onPress={() => setPaused((value) => !value)}>
      {paused && <Ionicons name="play-circle" size={60} color="#fff" />}
    </Pressable>
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={styles.info} pointerEvents="none">
        <Text style={styles.author}>@{clip.author?.username || 'usuario'}</Text>
        <Text style={styles.caption} numberOfLines={3}>{clip.caption}</Text>
      </View>
      <Pressable style={styles.soundButton} onPress={() => setMuted((value) => !value)}
        accessibilityRole="button" accessibilityLabel={muted ? 'Activar sonido' : 'Silenciar clip'}>
        <Ionicons name={muted ? 'volume-mute-outline' : 'volume-high-outline'} size={22} color="#fff" />
      </Pressable>
    </View>
  </View>;
}

export default function ClipsScreen() {
  const focused = useIsFocused();
  const { height: screenHeight } = useWindowDimensions();
  const tileHeight = Math.max(320, screenHeight - 205);
  const [clips, setClips] = useState<Clip[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const cursor = useRef<{ created_at: string; id: string } | null>(null);
  const viewConfig = useRef({ itemVisiblePercentThreshold: 65 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken<Clip>[] }) => {
    const first = viewableItems.find((item) => item.isViewable);
    setActiveId(first?.item.id ?? null);
  }).current;

  const load = useCallback(async (reset: boolean) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (reset) { setRefreshing(true); setError(null); } else { setLoadingMore(true); }
    try {
      let query = supabase.from('posts').select(CLIP_SELECT)
        .eq('kind', 'clip').order('created_at', { ascending: false }).order('id', { ascending: false }).limit(PAGE_SIZE);
      if (!reset && cursor.current) {
        const { created_at, id } = cursor.current;
        // Stable keyset pagination: include clips sharing the same timestamp.
        query = query.or(`created_at.lt.${created_at},and(created_at.eq.${created_at},id.lt.${id})`);
      }
      const { data, error: requestError } = await query;
      if (requestError) throw requestError;
      const rows = (data ?? []) as unknown as Clip[];
      if (reset) {
        setClips(rows);
        setActiveId(rows[0]?.id ?? null);
      } else {
        setClips((previous) => {
          const known = new Set(previous.map((item) => item.id));
          return [...previous, ...rows.filter((item) => !known.has(item.id))];
        });
      }
      cursor.current = rows.length ? { created_at: rows[rows.length - 1].created_at, id: rows[rows.length - 1].id } : (reset ? null : cursor.current);
      setHasMore(rows.length === PAGE_SIZE);
      setError(null);
    } catch {
      setError('No pudimos cargar los clips. Revisá tu conexión e intentá nuevamente.');
    } finally {
      inFlight.current = false;
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { void load(true); }, [load]);
  const refresh = () => { cursor.current = null; setHasMore(true); void load(true); };
  return <View style={styles.root}>
    <Text style={styles.title}>CLIPS</Text>
    <Text style={styles.subtitle}>Videos cortos de la comunidad</Text>
    {loading ? <ActivityIndicator color="#c4b5fd" style={styles.center} /> :
      <FlatList data={clips} keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ClipTile clip={item} active={focused && activeId === item.id} height={tileHeight} />}
        onViewableItemsChanged={onViewableItemsChanged} viewabilityConfig={viewConfig}
        pagingEnabled snapToInterval={tileHeight + 12} decelerationRate="fast"
        getItemLayout={(_, index) => ({ length: tileHeight + 12, offset: (tileHeight + 12) * index, index })}
        showsVerticalScrollIndicator={false} initialNumToRender={2} maxToRenderPerBatch={2} windowSize={3}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#c4b5fd" />}
        onEndReached={() => { if (hasMore && !inFlight.current) void load(false); }} onEndReachedThreshold={0.7}
        ListEmptyComponent={<View style={styles.center}><Text style={styles.empty}>{error || 'Todavía no hay clips publicados.'}</Text>
          {error && <Pressable accessibilityRole="button" onPress={refresh} style={styles.retry}><Text style={styles.retryText}>Reintentar</Text></Pressable>}</View>}
        ListFooterComponent={loadingMore ? <ActivityIndicator color="#c4b5fd" style={{ padding: 16 }} /> : error && clips.length > 0 ?
          <Pressable accessibilityRole="button" onPress={() => void load(false)} style={styles.retry}><Text style={styles.retryText}>Reintentar carga</Text></Pressable> : null}
      />}
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#09090b', paddingHorizontal: 16 },
  title: { color: '#fafafa', fontSize: 26, fontWeight: '900', letterSpacing: 5, marginTop: 8 },
  subtitle: { color: '#a1a1aa', marginTop: 5, marginBottom: 18, fontSize: 12 },
  tile: { width: '100%', backgroundColor: '#18181b', borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  playArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'flex-end', padding: 16, gap: 10, backgroundColor: 'rgba(0,0,0,0.45)' },
  info: { flex: 1 }, author: { color: '#fff', fontSize: 14, fontWeight: '800' },
  caption: { color: '#f4f4f5', fontSize: 13, lineHeight: 19, marginTop: 5 },
  soundButton: { backgroundColor: '#27272aaa', padding: 10, borderRadius: 30 },
  unavailable: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  unavailableText: { color: '#a1a1aa' }, center: { paddingVertical: 40, alignItems: 'center' },
  empty: { color: '#a1a1aa', textAlign: 'center', padding: 20 },
  retry: { backgroundColor: '#7c3aed', borderRadius: 12, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 12, marginVertical: 12 },
  retryText: { color: '#fff', fontWeight: '700' },
});

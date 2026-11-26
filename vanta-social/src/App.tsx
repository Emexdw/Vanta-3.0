import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Comment, Post, Story, User, ActiveTab, FeedMode, NotificationItem } from './types';
import { supabase } from './lib/supabase';
import * as api from './lib/api';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { StoriesRow } from './components/StoriesRow';
import { PostCard } from './components/PostCard';
import { TikTokReelView } from './components/TikTokReelView';
import { ExplorarView } from './components/ExplorarView';
import { ActividadView } from './components/ActividadView';
import { StoryViewerModal } from './components/StoryViewerModal';
import { CommentDrawer } from './components/CommentDrawer';
import { ShareModal } from './components/ShareModal';
import { CrearModal, CreateInput, CreateType } from './components/CrearModal';
import { UserProfileModal } from './components/UserProfileModal';
import { EditProfileModal } from './components/EditProfileModal';
import { MessagesPanel } from './components/MessagesPanel';
import { PostDetailModal } from './components/PostDetailModal';
import { soundEngine } from './utils/audioSynth';
import { postToClip } from './utils/clips';
import { extractTags } from './utils/time';
import { captureVideoPoster, compressImage, getVideoDuration } from './utils/media';

interface AppProps {
  me: User;
  onSignOut: () => Promise<void>;
  onProfileUpdated: () => Promise<void>;
}

function interestScore(post: Post, interests: string) {
  const text = `${post.caption} ${post.tags.join(' ')}`.toLowerCase();
  return interests.toLowerCase().split(',').map(s=>s.trim()).filter(Boolean).reduce((n,s)=>n+Number(text.includes(s)),0);
}
const PAGE_SIZE = 15;
const SWIPE_TOUCH_MIN = 45;
const SWIPE_MOUSE_MIN = 55;
const isNoSwipeTarget = (target: EventTarget | null) => target instanceof Element && !!target.closest('[data-no-swipe]');

export default function App({ me, onSignOut, onProfileUpdated }: AppProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('inicio');
  const [feedMode, setFeedMode] = useState<FeedMode>('feed');
  const [interests, setInterests] = useState('');
  const [repostCollection,setRepostCollection]=useState<Post[] | null>(null);
  const loadReposts=async()=>{try{const {data,error}=await supabase.from('reposts').select('post_id').order('created_at',{ascending:false}).limit(50);if(error)throw error;const rows=await Promise.all((data??[]).map(r=>api.fetchPostById(me.id,r.post_id)));setRepostCollection(rows.filter((r):r is Post=>r!==null));}catch{showToast('No se pudo cargar la colección de republicaciones.');}};
  const [feedAudience, setFeedAudience] = useState<'forYou' | 'following'>('forYou');
  const [followingFeedIds, setFollowingFeedIds] = useState<string[]>([]);
  const [followingHasMore, setFollowingHasMore] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [boot, setBoot] = useState<'loading' | 'ready' | 'error'>('loading');
  const [toast, setToast] = useState<string | null>(null);

  // Todas las publicaciones y clips viven en un único mapa: un "me gusta" se refleja en cualquier pantalla
  const [store, setStore] = useState<Record<string, Post>>({});
  const [feedIds, setFeedIds] = useState<string[]>([]);
  const [clipIds, setClipIds] = useState<string[]>([]);
  const [clipsKey, setClipsKey] = useState(0);
  const [hasMoreFeed, setHasMoreFeed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [stories, setStories] = useState<Story[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [viewer, setViewer] = useState<{ stories: Story[]; index: number } | null>(null);
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [sharingPost, setSharingPost] = useState<Post | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [createType, setCreateType] = useState<CreateType | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<User | null>(null);
  const [profileIds, setProfileIds] = useState<Record<string, string[]>>({});
  const [profileLoading, setProfileLoading] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [isMuted, setIsMuted] = useState(() => soundEngine.getMuted());
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [chatTargetId, setChatTargetId] = useState<string | null>(null);
  const [messageUnread, setMessageUnread] = useState(0);

  const toastTimer = useRef<number | null>(null);
  const viewedClips = useRef<Set<string>>(new Set());
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const upsertPosts = useCallback((list: Post[]) => {
    if (list.length === 0) return;
    setStore((prev) => {
      const next = { ...prev };
      list.forEach((p) => {
        next[p.id] = p;
      });
      return next;
    });
  }, []);

  const patchPost = useCallback((id: string, patch: Partial<Post>) => {
    setStore((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], ...patch } } : prev));
  }, []);

  // ---------- Carga inicial ----------
  const loadInitial = useCallback(async () => {
    setBoot('loading');
    try {
      const [feed, clipList, storyList, following, notifs] = await Promise.all([
        api.fetchPosts({ meId: me.id, kind: 'post', limit: PAGE_SIZE }),
        api.fetchPosts({ meId: me.id, kind: 'clip', limit: 30 }),
        api.fetchStories(me.id),
        api.fetchFollowingIds(me.id),
        api.fetchNotifications(me.id)
      ]);
      upsertPosts([...feed, ...clipList]);
      setFeedIds(feed.map((p) => p.id));
      setHasMoreFeed(feed.length === PAGE_SIZE);
      setClipIds(clipList.map((p) => p.id));
      setStories(storyList);
      setFollowingIds(following);
      setFollowingFeedIds([]);
      setFollowingHasMore(false);
      setNotifications(notifs);
      setBoot('ready');
    } catch {
      setBoot('error');
    }
  }, [me.id, upsertPosts]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // Feed «Siguiendo»: se consulta en Supabase, no se limita a filtrar la primera página global.
  const loadFollowingFeed = useCallback(async () => {
    setFollowingLoading(true);
    try {
      const ids = Array.from(followingIds);
      const list = await api.fetchPosts({ meId: me.id, kind: 'post', authorIds: ids, limit: PAGE_SIZE });
      upsertPosts(list);
      setFollowingFeedIds(list.map((post) => post.id));
      setFollowingHasMore(list.length === PAGE_SIZE);
    } catch {
      showToast('No se pudo cargar el feed de seguidos.');
    } finally {
      setFollowingLoading(false);
    }
  }, [followingIds, me.id, showToast, upsertPosts]);

  useEffect(() => {
    if (feedAudience === 'following' && boot === 'ready') {
      void loadFollowingFeed();
    }
  }, [feedAudience, boot, loadFollowingFeed]);

  // ---------- Notificaciones en tiempo real ----------
  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${me.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${me.id}` },
        async (payload) => {
          try {
            const item = await api.fetchNotification((payload.new as { id: string }).id);
            if (item) {
              setNotifications((prev) => (prev.some((n) => n.id === item.id) ? prev : [item, ...prev]));
              soundEngine.playTap();
            }
          } catch {
            /* se verá al recargar */
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [me.id]);

  // Sincronizar notificaciones al volver a la app o abrir Actividad.
  // Complementa Realtime cuando el navegador suspende la conexión.
  useEffect(() => {
    const sync = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        setNotifications(await api.fetchNotifications(me.id));
      } catch {
        // Mantener la última lista visible si falla la red.
      }
    };
    const onFocus = () => { void sync(); };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    if (activeTab === 'actividad') void sync();
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [me.id, activeTab]);

  // ---------- Mensajes sin leer (tiempo real) ----------
  const refreshUnread = useCallback(() => {
    api.unreadMessages().then(setMessageUnread).catch(() => {});
  }, []);

  useEffect(() => {
    refreshUnread();
    const channel = supabase
      .channel(`unread:${me.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if ((payload.new as { sender_id: string }).sender_id !== me.id) {
          soundEngine.playTap();
          refreshUnread();
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [me.id, refreshUnread]);

  // ---------- Derivados ----------
  const feed = useMemo(() => feedIds.map((id) => store[id]).filter(Boolean), [feedIds, store]);
  const visibleFeed = useMemo(() => feedAudience === 'following' ? followingFeedIds.map((id) => store[id]).filter(Boolean) : feed, [feedAudience, followingFeedIds, store, feed]);
  const clips = useMemo(() => clipIds.map((id) => store[id]).filter(Boolean).map(postToClip), [clipIds, store]);
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const commentingPost = commentingId ? (store[commentingId] ?? null) : null;
  const detailPost = detailId ? (store[detailId] ?? null) : null;
  const isFollowing = useCallback((userId: string) => followingIds.has(userId), [followingIds]);

  const idsToPosts = (ids: string[] | undefined) => (ids ?? []).map((id) => store[id]).filter(Boolean);
  const myPosts = useMemo(() => idsToPosts(profileIds[me.id]), [profileIds, store, me.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const viewedPosts = useMemo(
    () => (viewingProfile ? idsToPosts(profileIds[viewingProfile.id]) : []),
    [profileIds, store, viewingProfile] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const savedPosts = useMemo(() => idsToPosts(savedIds), [savedIds, store]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Historias (agrupadas por persona) ----------
  const storyGroups = useMemo(() => {
    const byUser = new Map<string, Story[]>();
    stories.forEach((s) => byUser.set(s.userId, [...(byUser.get(s.userId) ?? []), s]));
    const groups = Array.from(byUser.values()).map((list) => ({
      list,
      allViewed: list.every((s) => s.hasViewed),
      mine: list[0].userId === me.id
    }));
    groups.sort((a, b) => Number(b.mine) - Number(a.mine) || Number(a.allViewed) - Number(b.allViewed));
    return groups;
  }, [stories, me.id]);

  const storyBubbles = useMemo(
    () =>
      storyGroups.map((g) => {
        const first = g.list.find((s) => !s.hasViewed) ?? g.list[0];
        return { ...first, hasViewed: g.allViewed };
      }),
    [storyGroups]
  );

  const openStory = (bubbleIndex: number) => {
    // Se congela el orden al abrir: marcar historias como vistas no debe reordenar el visor
    const snapshot = storyGroups.flatMap((g) => g.list);
    const index = snapshot.findIndex((s) => s.id === storyBubbles[bubbleIndex].id);
    setViewer({ stories: snapshot, index: Math.max(0, index) });
  };

  const markStoryViewed = useCallback(
    (storyId: string) => {
      setStories((prev) =>
        prev.some((s) => s.id === storyId && !s.hasViewed) ? prev.map((s) => (s.id === storyId ? { ...s, hasViewed: true } : s)) : prev
      );
      api.markStoryViewed(me.id, storyId).catch(() => {});
    },
    [me.id]
  );
  const closeViewer = useCallback(() => setViewer(null), []);

  // ---------- Acciones sobre publicaciones ----------
  const handleLike = (id: string) => {
    const p = store[id];
    if (!p) return;
    const liked = !p.isLiked;
    patchPost(id, { isLiked: liked, likesCount: p.likesCount + (liked ? 1 : -1) });
    api.setPostLike(me.id, id, liked).catch(() => {
      patchPost(id, { isLiked: p.isLiked, likesCount: p.likesCount });
      showToast('No se pudo registrar el me gusta.');
    });
  };

  const handleBookmark = (id: string) => {
    const p = store[id];
    if (!p) return;
    const saved = !p.isBookmarked;
    patchPost(id, { isBookmarked: saved });
    setSavedIds((prev) => (saved ? (prev.includes(id) ? prev : [id, ...prev]) : prev.filter((x) => x !== id)));
    api.setBookmark(me.id, id, saved).catch(() => {
      patchPost(id, { isBookmarked: p.isBookmarked });
      setSavedIds(prev => p.isBookmarked ? Array.from(new Set([id, ...prev])) : prev.filter(x=>x!==id));
      showToast('No se pudo guardar.');
    });
  };

  const handleDelete = async (post: Post) => {
    if (!window.confirm('¿Eliminar esta publicación? No se puede deshacer.')) return;
    try {
      await api.deletePost(post.id);
      const drop = (ids: string[]) => ids.filter((x) => x !== post.id);
      setFeedIds(drop);
      setClipIds(drop);
      setSavedIds(drop);
      setProfileIds((prev) => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, drop(v)])));
      setDetailId(null);
      showToast('Publicación eliminada.');
      void onProfileUpdated();
    } catch {
      showToast('No se pudo eliminar.');
    }
  };

  const handleReport = async (post: Post) => {
    try {
      await api.reportPost(me.id, post.id);
      showToast('Gracias por avisarnos. Lo revisaremos.');
    } catch {
      showToast('No se pudo enviar el reporte.');
    }
  };

  const handleViewClip = useCallback((clipId: string) => {
    if (viewedClips.current.has(clipId)) return;
    viewedClips.current.add(clipId);
    api.incrementViews(clipId).catch(() => { viewedClips.current.delete(clipId); });
  }, []);

  const loadMoreFeed = async () => {
    if (loadingMore || followingLoading || visibleFeed.length === 0) return;
    setLoadingMore(true);
    try {
      const more = await api.fetchPosts({ meId: me.id, kind: 'post', before: visibleFeed[visibleFeed.length - 1].createdAt, limit: PAGE_SIZE, ...(feedAudience === 'following' ? { authorIds: Array.from(followingIds) } : {}) });
      upsertPosts(more);
      if (feedAudience === 'following') {
        setFollowingFeedIds((prev) => [...prev, ...more.map((p) => p.id).filter((id) => !prev.includes(id))]);
        setFollowingHasMore(more.length === PAGE_SIZE);
      } else {
        setFeedIds((prev) => [...prev, ...more.map((p) => p.id).filter((id) => !prev.includes(id))]);
        setHasMoreFeed(more.length === PAGE_SIZE);
      }
    } catch {
      showToast('No se pudo cargar más contenido.');
    } finally {
      setLoadingMore(false);
    }
  };

  // ---------- Abrir contenido ----------
  const openClip = useCallback((id: string) => {
    setClipIds((prev) => [id, ...prev.filter((x) => x !== id)]);
    setClipsKey((k) => k + 1);
    setDetailId(null);
    setViewingProfile(null);
    setFeedMode('clips');
    setActiveTab('inicio');
  }, []);

  const openPost = useCallback(
    (post: Post) => {
      upsertPosts([post]);
      if (post.kind === 'clip') openClip(post.id);
      else {
        setViewingProfile(null);
        setDetailId(post.id);
      }
    },
    [upsertPosts, openClip]
  );

  const openPostById = async (postId: string) => {
    try {
      const post = await api.fetchPostById(me.id, postId);
      if (post) openPost(post);
      else showToast('Esa publicación ya no existe.');
    } catch {
      showToast('No se pudo abrir la publicación.');
    }
  };

  // Enlaces compartidos: /?p=ID
  useEffect(() => {
    if (boot !== 'ready') return;
    const shared = new URLSearchParams(window.location.search).get('p');
    if (!shared) return;
    window.history.replaceState({}, '', window.location.pathname);
    void openPostById(shared);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boot]);

  // ---------- Comentarios ----------
  useEffect(() => {
    if (!commentingId) {
      setComments([]);
      return;
    }
    let cancelled = false;
    setCommentsLoading(true);
    api
      .fetchComments(me.id, commentingId)
      .then((list) => !cancelled && setComments(list))
      .catch(() => !cancelled && showToast('No se pudieron cargar los comentarios.'))
      .finally(() => !cancelled && setCommentsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [commentingId, me.id, showToast]);

  const handleAddComment = async (postId: string, text: string) => {
    try {
      const created = await api.addComment(me.id, postId, text);
      setComments((prev) => [created, ...prev]);
      const p = store[postId];
      if (p) patchPost(postId, { commentsCount: p.commentsCount + 1 });
    } catch (err) {
      showToast('No se pudo publicar el comentario.');
      throw err;
    }
  };

  const handleToggleCommentLike = (commentId: string) => {
    const c = comments.find((x) => x.id === commentId);
    if (!c) return;
    const liked = !c.isLiked;
    const apply = (isLiked: boolean, likesCount: number) =>
      setComments((prev) => prev.map((x) => (x.id === commentId ? { ...x, isLiked, likesCount } : x)));
    apply(liked, c.likesCount + (liked ? 1 : -1));
    api.setCommentLike(me.id, commentId, liked).catch(() => {
      apply(!!c.isLiked, c.likesCount);
      showToast('No se pudo registrar el me gusta.');
    });
  };

  // ---------- Seguidores ----------
  const toggleFollow = (userId: string) => {
    if (userId === me.id) return;
    const now = !followingIds.has(userId);
    const applyFollow = (on: boolean) => {
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (on) next.add(userId);
        else next.delete(userId);
        return next;
      });
      setViewingProfile((v) => (v && v.id === userId ? { ...v, followersCount: Math.max(0, v.followersCount + (on ? 1 : -1)) } : v));
    };
    applyFollow(now);
    api.setFollow(me.id, userId, now).catch(() => {
      applyFollow(!now);
      showToast('No se pudo actualizar el seguimiento.');
    });
  };

  // ---------- Perfiles ----------
  const loadProfileContent = useCallback(
    async (userId: string) => {
      setProfileLoading(true);
      try {
        const list = await api.fetchPosts({ meId: me.id, userId, limit: 60 });
        upsertPosts(list);
        setProfileIds((prev) => ({ ...prev, [userId]: list.map((p) => p.id) }));
      } catch {
        showToast('No se pudo cargar el perfil.');
      } finally {
        setProfileLoading(false);
      }
    },
    [me.id, upsertPosts, showToast]
  );

  const loadSaved = useCallback(async () => {
    try {
      const list = await api.fetchSaved(me.id);
      upsertPosts(list);
      setSavedIds(list.map((p) => p.id));
    } catch {
      /* se reintenta al volver a entrar */
    }
  }, [me.id, upsertPosts]);

  useEffect(() => {
    if (activeTab !== 'perfil') return;
    void loadProfileContent(me.id);
    void loadSaved();
  }, [activeTab, me.id, loadProfileContent, loadSaved]);

  const openProfile = async (username: string) => {
    soundEngine.playTap();
    const clean = username.replace('@', '');
    setViewer(null);
    setCommentingId(null);
    try {
      const user = clean === me.username ? me : await api.fetchProfileByUsername(clean);
      if (!user) return showToast('No encontramos ese perfil.');
      if (user.id === me.id && activeTab === 'perfil') return;
      setViewingProfile(user);
      void loadProfileContent(user.id);
      if (user.id === me.id) void loadSaved();
    } catch {
      showToast('No se pudo abrir el perfil.');
    }
  };

  // ---------- Publicar ----------
  const handlePublish = async (input: CreateInput) => {
    const tags = extractTags(input.caption);

    if (input.type === 'post') {
      const blobs = await Promise.all(input.files.map((f) => compressImage(f)));
      const urls = await Promise.all(blobs.map((b) => api.uploadMedia(me.id, b, 'jpg', 'image/jpeg')));
      const post = await api.createPost(me.id, { urls, caption: input.caption, tags, location: input.location });
      upsertPosts([post]);
      setFeedIds((prev) => [post.id, ...prev]);
      setFeedMode('feed');
    } else if (input.type === 'clip') {
      const file = input.files[0];
      const [duration, posterBlob] = await Promise.all([getVideoDuration(file), captureVideoPoster(file)]);
      const ext = file.type === 'video/webm' ? 'webm' : file.type === 'video/quicktime' ? 'mov' : 'mp4';
      const videoUrl = await api.uploadMedia(me.id, file, ext, file.type || 'video/mp4');
      const posterUrl = posterBlob ? await api.uploadMedia(me.id, posterBlob, 'jpg', 'image/jpeg') : undefined;
      const clip = await api.createClip(me.id, {
        videoUrl,
        posterUrl,
        duration,
        caption: input.caption,
        tags,
        sound: input.sound,
        artist: me.displayName
      });
      upsertPosts([clip]);
      setClipIds((prev) => [clip.id, ...prev]);
      setClipsKey((k) => k + 1);
      setFeedMode('clips');
    } else {
      const blob = await compressImage(input.files[0]);
      const mediaUrl = await api.uploadMedia(me.id, blob, 'jpg', 'image/jpeg');
      await api.createStory(me.id, { mediaUrl, caption: input.caption, sound: input.sound });
      setStories(await api.fetchStories(me.id));
      setFeedMode('feed');
    }

    setActiveTab('inicio');
    showToast(input.type === 'story' ? 'Historia publicada (dura 24 h).' : 'Publicado.');
    soundEngine.playPublish();
    void onProfileUpdated();
  };

  // ---------- Deslizar entre Feed y Clips ----------
  const resolveSwipe = (dx: number, dy: number, min: number) => {
    if (Math.abs(dx) > min && Math.abs(dx) > Math.abs(dy) * 1.25) {
      if (dx < 0 && feedMode === 'feed') {
        soundEngine.playTap();
        setFeedMode('clips');
      } else if (dx > 0 && feedMode === 'clips') {
        soundEngine.playTap();
        setFeedMode('feed');
      }
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    swipeStartRef.current = isNoSwipeTarget(e.target) ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = swipeStartRef.current;
    swipeStartRef.current = null;
    if (s) resolveSwipe(e.changedTouches[0].clientX - s.x, e.changedTouches[0].clientY - s.y, SWIPE_TOUCH_MIN);
  };
  const onMouseDown = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (e.button !== 0 || isNoSwipeTarget(t) || t.closest('button, input, textarea, a, select, video')) {
      swipeStartRef.current = null;
      return;
    }
    swipeStartRef.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseUp = (e: React.MouseEvent) => {
    const s = swipeStartRef.current;
    swipeStartRef.current = null;
    if (s) resolveSwipe(e.clientX - s.x, e.clientY - s.y, SWIPE_MOUSE_MIN);
  };

  const cardHandlers = (post: Post) => ({
    onLike: handleLike,
    onBookmark: handleBookmark,
    onOpenComments: (p: Post) => setCommentingId(p.id),
    onOpenShare: (p: Post) => setSharingPost(p),
    onOpenProfile: openProfile,
    onReport: handleReport,
    onDelete: handleDelete,
    isOwner: post.userId === me.id
  });

  // ---------- Chat, bloqueos y cuenta ----------
  const openChat = (user: User | null) => {
    setViewingProfile(null);
    setChatTargetId(user ? user.id : null);
    setMessagesOpen(true);
  };

  const handleBlocked = (user: User) => {
    setFollowingIds((prev) => {
      const next = new Set(prev);
      next.delete(user.id);
      return next;
    });
    const hidden = (id: string) => store[id]?.userId === user.id;
    setFeedIds((ids) => ids.filter((id) => !hidden(id)));
    setClipIds((ids) => ids.filter((id) => !hidden(id)));
    setViewingProfile(null);
    showToast(`Bloqueaste a @${user.username}.`);
    refreshUnread();
  };

  const handleBlockUser = async (user: User) => {
    if (!window.confirm(`¿Bloquear a @${user.username}? No podrán verse el contenido ni escribirse.`)) return;
    try {
      await api.blockUser(me.id, user.id);
      handleBlocked(user);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo bloquear.');
    }
  };

  const handleReportUser = async (user: User) => {
    try {
      await api.reportUser(me.id, user.id, 'profile');
      showToast('Gracias por avisarnos. Revisaremos este perfil.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo enviar el reporte.');
    }
  };

  const handleDeleteAccount = async () => {
    await api.deleteMyAccount(me.id);
    onSignOut();
  };

  const slide = feedMode === 'clips' ? 32 : -32;

  if (boot !== 'ready') {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center gap-4 text-sm text-zinc-500">
        <span className="text-2xl font-semibold text-white tracking-tight">Vanta</span>
        {boot === 'loading' ? (
          <p>Cargando tu feed...</p>
        ) : (
          <>
            <p>No pudimos conectar con el servidor.</p>
            <button onClick={loadInitial} className="px-4 py-1.5 rounded-full bg-white text-black text-xs font-semibold">
              Reintentar
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-start antialiased selection:bg-white/20 selection:text-white">
      <div className="w-full max-w-2xl min-h-screen flex flex-col relative pb-16 overflow-x-hidden">
        <Header
          activeTab={activeTab}
          feedMode={feedMode}
          onFeedModeChange={setFeedMode}
          unreadCount={unreadCount}
          onOpenActivity={() => setActiveTab('actividad')}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted(soundEngine.toggleMute())}
          onOpenMessages={() => openChat(null)}
          messageUnread={messageUnread}
        />

        <main className="flex-1 w-full">
          {activeTab === 'inicio' && (
            <div className="w-full overflow-hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onMouseDown={onMouseDown} onMouseUp={onMouseUp}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={feedMode}
                  initial={{ opacity: 0, x: slide }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -slide }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  {feedMode === 'feed' ? (
                    <>
                      <StoriesRow stories={storyBubbles} onSelectStory={openStory} onCreateStory={() => setCreateType('story')} />
                      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                        <div role="group" aria-label="Elegir publicaciones" className="flex gap-1 p-1 rounded-full bg-zinc-900/90 border border-white/[0.07]">
                          {(['forYou', 'following'] as const).map((audience) => (
                            <button key={audience} type="button" aria-pressed={feedAudience === audience}
                              onClick={() => setFeedAudience(audience)}
                              className={`px-4 py-2 text-xs font-semibold rounded-full transition-colors ${feedAudience === audience ? 'bg-violet-500 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
                              {audience === 'forYou' ? 'Para ti' : 'Siguiendo'}
                            </button>
                          ))}
                        </div>
                        <button type="button" onClick={() => feedAudience === 'following' ? void loadFollowingFeed() : void loadInitial()}
                          aria-label="Actualizar publicaciones" className="text-xs text-zinc-400 hover:text-white px-3 py-2 rounded-full hover:bg-white/5">
                          Actualizar
                        </button>
                      </div>

                      {feedAudience === 'forYou' && <div className="px-4 py-2"><label className="text-xs text-zinc-400">Intereses (separados por comas; vacío = cronológico)<input value={interests} maxLength={150} onChange={e=>setInterests(e.target.value)} className="block w-full rounded-xl bg-zinc-900 p-2 text-white" placeholder="Música, fotografía, arte" /></label></div>}
                      <div className="px-4 py-2"><button className="text-sm text-violet-300" onClick={()=>repostCollection===null?void loadReposts():setRepostCollection(null)}>{repostCollection===null?'Mi colección de republicaciones':'Cerrar colección'}</button>{repostCollection!==null && <div className="space-y-2 mt-2">{repostCollection.length===0?'Colección vacía':repostCollection.map(p=><button key={p.id} className="block text-left text-sm text-zinc-200" onClick={()=>setSharingPost(p)}>@{p.user.username} · {p.caption || p.kind}</button>)}</div>}</div>
                      {followingLoading && feedAudience === 'following' ? (
                        <p role="status" className="text-center text-zinc-400 text-sm py-16">Cargando publicaciones de tus seguidos...</p>
                      ) : visibleFeed.length === 0 ? (
                        <div className="py-20 px-6 text-center">
                          <p className="text-sm font-medium text-zinc-200">{feedAudience === 'following' ? 'Todavía no hay publicaciones de tus seguidos' : 'Todavía no hay publicaciones'}</p>
                          <p className="text-xs text-zinc-500 mt-1">{feedAudience === 'following' ? 'Seguí a creadores desde Explorar para ver su contenido aquí.' : 'Publicá la primera o explorá a otras personas.'}</p>
                          <div className="flex justify-center gap-2 mt-4">
                            <button onClick={() => setCreateType('post')} className="px-4 py-1.5 rounded-full bg-white text-black text-xs font-semibold">
                              Crear publicación
                            </button>
                            <button onClick={() => setActiveTab('explorar')} className="px-4 py-1.5 rounded-full border border-white/15 text-xs text-zinc-300">
                              Explorar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1 pb-16">
                          {(feedAudience === "forYou" && interests.trim() ? [...visibleFeed].sort((a,b)=>interestScore(b,interests)-interestScore(a,interests)) : visibleFeed).map((post) => (
                            <PostCard key={post.id} post={post} onPlayClip={() => openClip(post.id)} {...cardHandlers(post)} />
                          ))}
                          {(feedAudience === 'following' ? followingHasMore : hasMoreFeed) && (
                            <div className="flex justify-center py-4">
                              <button
                                onClick={loadMoreFeed}
                                disabled={loadingMore}
                                className="px-5 py-2 rounded-full border border-white/15 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-50"
                              >
                                {loadingMore ? 'Cargando...' : 'Ver más'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : clips.length === 0 ? (
                    <div className="py-20 px-6 text-center">
                      <p className="text-sm font-medium text-zinc-200">Todavía no hay clips</p>
                      <button onClick={() => setCreateType('clip')} className="mt-4 px-4 py-1.5 rounded-full bg-white text-black text-xs font-semibold">
                        Subir un clip
                      </button>
                    </div>
                  ) : (
                    <div className="p-2 sm:p-4">
                      <TikTokReelView
                        key={clipsKey}
                        suspended={messagesOpen}
                        clips={clips}
                        isMuted={isMuted}
                        onToggleMute={() => setIsMuted(soundEngine.toggleMute())}
                        isFollowing={isFollowing}
                        onToggleLike={handleLike}
                        onToggleBookmark={handleBookmark}
                        onToggleFollow={toggleFollow}
                        onOpenComments={(p) => setCommentingId(p.id)}
                        onOpenShare={(p) => setSharingPost(p)}
                        onOpenProfile={openProfile}
                        onViewClip={handleViewClip}
                      />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {activeTab === 'explorar' && (
            <ExplorarView meId={me.id} onOpenProfile={openProfile} onOpenPost={openPost} isFollowing={isFollowing} onToggleFollow={toggleFollow} />
          )}

          {activeTab === 'actividad' && (
            <ActividadView
              meId={me.id}
              notifications={notifications}
              onMarkAllRead={() => {
                setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
                api.markAllNotificationsRead(me.id).catch(() => showToast('No se pudo marcar como leídas.'));
              }}
              isFollowing={isFollowing}
              onToggleFollow={toggleFollow}
              onOpenProfile={openProfile}
              onOpenPost={openPost}
              onOpenPostById={openPostById}
            />
          )}

          {activeTab === 'perfil' && (
            <div className="pb-24">
              <UserProfileModal
                variant="page"
                viewerId={me.id}
                onOpenProfile={(u) => void openProfile(u)}
                user={me}
                isCurrentUser
                posts={myPosts}
                saved={savedPosts}
                loading={profileLoading}
                isFollowing={false}
                onToggleFollow={toggleFollow}
                onClose={() => setActiveTab('inicio')}
                onSelectPost={openPost}
                onEditProfile={() => setEditingProfile(true)}
                onSignOut={onSignOut}
              />
            </div>
          )}
        </main>

        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          currentUser={me}
          hasUnreadNotifications={unreadCount > 0}
          onOpenCreate={() => setCreateType('post')}
        />
      </div>

      {viewer && (
        <StoryViewerModal stories={viewer.stories} initialIndex={viewer.index} onClose={closeViewer} onViewed={markStoryViewed} onOpenProfile={(u) => { closeViewer(); void openProfile(u); }} />
      )}

      {detailPost && <PostDetailModal post={detailPost} onClose={() => setDetailId(null)} onPlayClip={() => openClip(detailPost.id)} {...cardHandlers(detailPost)} />}

      {commentingPost && (
        <CommentDrawer
          post={commentingPost}
          comments={comments}
          loading={commentsLoading}
          currentUser={me}
          onClose={() => setCommentingId(null)}
          onAddComment={handleAddComment}
          onToggleCommentLike={handleToggleCommentLike}
          onOpenProfile={(u) => void openProfile(u)}
        />
      )}

      {sharingPost && <ShareModal post={sharingPost} onClose={() => setSharingPost(null)} />}

      {createType && <CrearModal initialType={createType} onClose={() => setCreateType(null)} onPublish={handlePublish} />}

      {editingProfile && <EditProfileModal me={me} onClose={() => setEditingProfile(false)} onSaved={onProfileUpdated} onDeleteAccount={handleDeleteAccount} />}

      {viewingProfile && !(activeTab === 'perfil' && viewingProfile.id === me.id) && (
        <UserProfileModal
          variant="modal"
          viewerId={me.id}
          onOpenProfile={(u) => void openProfile(u)}
          user={viewingProfile.id === me.id ? me : viewingProfile}
          isCurrentUser={viewingProfile.id === me.id}
          posts={viewedPosts}
          saved={savedPosts}
          loading={profileLoading}
          isFollowing={isFollowing(viewingProfile.id)}
          onToggleFollow={toggleFollow}
          onClose={() => setViewingProfile(null)}
          onSelectPost={openPost}
          onMessage={openChat}
          onBlock={handleBlockUser}
          onReportUser={handleReportUser}
          onEditProfile={() => setEditingProfile(true)}
          onSignOut={onSignOut}
        />
      )}

      {messagesOpen && (
        <MessagesPanel
          me={me}
          startWithUserId={chatTargetId}
          onClose={() => {
            setMessagesOpen(false);
            setChatTargetId(null);
            refreshUnread();
          }}
          onUnreadChange={refreshUnread}
          onOpenProfile={(u) => {
            setMessagesOpen(false);
            void openProfile(u);
          }}
          onBlocked={handleBlocked}
        />
      )}

      {toast && (
        <div role="status" className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] px-4 py-2 rounded-full bg-zinc-900/95 border border-white/10 text-xs text-white shadow-2xl animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}

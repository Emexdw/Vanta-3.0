import { supabase } from './supabase';
import { ActivityMetric, ChatMessage, Comment, Conversation, NotificationItem, Post, Story, TrendingItem, User } from '../types';
import { timeAgo } from '../utils/time';
import { formatCount } from '../utils/format';

// ---------- Filas de la base de datos ----------
interface ProfileRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  banner_url?: string | null;
  theme_color?: string | null;
  bio: string;
  location: string;
  is_verified: boolean;
  followers_count: number;
  following_count: number;
  posts_count: number;
}

interface PostRow {
  id: string;
  user_id: string;
  kind: 'post' | 'clip';
  media_urls: string[];
  poster_url: string | null;
  duration: string | null;
  caption: string;
  tags: string[];
  location: string | null;
  sound_title: string | null;
  sound_artist: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  created_at: string;
  author: ProfileRow;
}

interface CommentRow {
  id: string;
  user_id: string;
  text: string;
  likes_count: number;
  created_at: string;
  author: ProfileRow;
}

interface StoryRow {
  id: string;
  user_id: string;
  media_url: string;
  caption: string | null;
  sound_title: string | null;
  created_at: string;
  author: ProfileRow;
}

interface NotificationRow {
  id: string;
  type: 'like' | 'comment' | 'follow';
  body: string | null;
  is_read: boolean;
  created_at: string;
  post_id: string | null;
  actor: ProfileRow;
  post: { media_urls: string[]; poster_url: string | null; kind: 'post' | 'clip' } | null;
}


// Los mensajes internos de la base de datos pueden revelar su estructura: se traducen a textos seguros.
const ERROR_MESSAGES: Record<string, string> = {
  rate_limit: 'Estás haciendo esto muy rápido. Esperá un momento y probá de nuevo.',
  blocked: 'No se puede completar esta acción.',
  invalid_target: 'No se puede completar esta acción.',
  message_request_limit: 'Esta persona todavía no aceptó tus mensajes. Podrás escribir de nuevo cuando te responda.',
  invalid_media: 'El archivo no es válido.',
  reserved_username: 'Ese nombre de usuario no está disponible.',
  not_authenticated: 'Tu sesión expiró. Volvé a iniciar sesión.',
  'maximum allowed size': 'El archivo es demasiado grande.',
  'mime type': 'Ese tipo de archivo no está permitido.'
};

function friendly(err: { message: string; code?: string }): string {
  for (const [key, text] of Object.entries(ERROR_MESSAGES)) {
    if (err.message.includes(key)) return text;
  }
  if (err.code === '42501') return 'No tenés permiso para hacer esto.';
  if (err.code === '23505') return 'Ese dato ya existe.';
  if (err.code === '23514') return 'Hay un dato con un formato inválido.';
  return 'Ocurrió un error. Probá de nuevo.';
}

function fail(err: { message: string; code?: string }): never {
  console.error('[vanta]', err);
  throw new Error(friendly(err));
}

function must<T>(res: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (res.error) fail(res.error);
  return res.data as T;
}

// ---------- Mapeos a los tipos de la app ----------
export function avatarFallback(name: string): string {
  const ch = (name.trim()[0] ?? '?').toUpperCase();
  const letter = /[\p{L}\p{N}]/u.test(ch) ? ch : '?';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><rect width='200' height='200' fill='#27272a'/><text x='50%' y='54%' font-family='sans-serif' font-size='96' fill='#e4e4e7' text-anchor='middle' dominant-baseline='middle'>${letter}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const POSTER_FALLBACK = `data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='720' height='1280'><rect width='720' height='1280' fill='#111115'/></svg>"
)}`;

export function toUser(r: ProfileRow): User {
  const name = r.display_name || r.username;
  return {
    id: r.id,
    username: r.username,
    displayName: name,
    avatar: r.avatar_url || avatarFallback(name),
    isVerified: r.is_verified,
    followersCount: r.followers_count,
    followingCount: r.following_count,
    postsCount: r.posts_count,
    bio: r.bio,
    location: r.location || undefined,
    bannerUrl: r.banner_url || undefined,
    themeColor: r.theme_color || undefined
  };
}

function toPost(r: PostRow, liked: Set<string>, saved: Set<string>): Post {
  const isClip = r.kind === 'clip';
  return {
    id: r.id,
    userId: r.user_id,
    user: toUser(r.author),
    kind: r.kind,
    location: r.location ?? undefined,
    timestamp: timeAgo(r.created_at),
    createdAt: r.created_at,
    mediaUrls: isClip ? [r.poster_url || POSTER_FALLBACK] : r.media_urls,
    videoUrl: isClip ? r.media_urls[0] : undefined,
    mediaType: isClip ? 'video' : r.media_urls.length > 1 ? 'gallery' : 'image',
    videoDuration: isClip ? (r.duration ?? undefined) : undefined,
    caption: r.caption,
    tags: r.tags,
    likesCount: r.likes_count,
    isLiked: liked.has(r.id),
    commentsCount: r.comments_count,
    sharesCount: r.shares_count,
    isBookmarked: saved.has(r.id),
    soundTitle: r.sound_title ?? undefined,
    soundArtist: r.sound_artist ?? undefined,
    viewsCount: r.views_count
  };
}

async function hydratePosts(rows: PostRow[], meId: string): Promise<Post[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [likes, marks] = await Promise.all([
    supabase.from('post_likes').select('post_id').eq('user_id', meId).in('post_id', ids),
    supabase.from('bookmarks').select('post_id').eq('user_id', meId).in('post_id', ids)
  ]);
  const liked = new Set(must<{ post_id: string }[]>(likes).map((x) => x.post_id));
  const saved = new Set(must<{ post_id: string }[]>(marks).map((x) => x.post_id));
  return rows.map((r) => toPost(r, liked, saved));
}

const POST_SELECT = '*, author:profiles!posts_user_id_fkey(*)';

// ---------- Perfiles ----------
export async function fetchProfileByUsername(username: string): Promise<User | null> {
  const res = await supabase.from('profiles').select('*').eq('username', username.toLowerCase()).maybeSingle();
  const row = must<ProfileRow | null>(res);
  return row ? toUser(row) : null;
}

export async function fetchProfileById(id: string): Promise<User | null> {
  const res = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  const row = must<ProfileRow | null>(res);
  return row ? toUser(row) : null;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const res = await supabase.rpc('username_available', { uname: username.toLowerCase() });
  return must<boolean>(res) === true;
}

export async function updateProfile(
  meId: string,
  patch: { username?: string; displayName?: string; bio?: string; location?: string; avatarUrl?: string; bannerUrl?: string; themeColor?: string }
): Promise<void> {
  const row: Record<string, string> = {};
  if (patch.username !== undefined) row.username = patch.username.toLowerCase();
  if (patch.displayName !== undefined) row.display_name = patch.displayName;
  if (patch.bio !== undefined) row.bio = patch.bio;
  if (patch.location !== undefined) row.location = patch.location;
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
  if (patch.bannerUrl !== undefined) row.banner_url = patch.bannerUrl;
  if (patch.themeColor !== undefined) row.theme_color = patch.themeColor;
  const { error } = await supabase.from('profiles').update(row).eq('id', meId);
  if (error) {
    if (error.code === '23505') throw new Error('Ese nombre de usuario ya está en uso.');
    fail(error);
  }
}

export async function searchProfiles(term: string, limit = 12): Promise<User[]> {
  const t = term.trim().slice(0, 50);
  if (!t) return [];
  const res = await supabase.rpc('search_profiles', { term: t, max_rows: limit });
  return must<ProfileRow[]>(res).map(toUser);
}

export async function suggestedProfiles(limit = 8): Promise<User[]> {
  const res = await supabase.rpc('suggested_profiles', { max_rows: limit });
  return must<ProfileRow[]>(res).map(toUser);
}

export async function fetchRecentFollowers(meId: string, limit = 6): Promise<User[]> {
  const res = await supabase
    .from('follows')
    .select('profile:profiles!follows_follower_id_fkey(*)')
    .eq('following_id', meId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return must<{ profile: ProfileRow }[]>(res).map((r) => toUser(r.profile));
}

// ---------- Seguidores ----------
export async function fetchFollowingIds(meId: string): Promise<Set<string>> {
  const res = await supabase.from('follows').select('following_id').eq('follower_id', meId).limit(5000);
  return new Set(must<{ following_id: string }[]>(res).map((r) => r.following_id));
}

export async function setFollow(meId: string, userId: string, follow: boolean): Promise<void> {
  const res = follow
    ? await supabase.from('follows').upsert({ follower_id: meId, following_id: userId }, { onConflict: 'follower_id,following_id', ignoreDuplicates: true })
    : await supabase.from('follows').delete().eq('follower_id', meId).eq('following_id', userId);
  if (res.error) fail(res.error);
}

// ---------- Publicaciones ----------
export async function fetchPosts(opts: {
  meId: string;
  kind?: 'post' | 'clip';
  userId?: string;
  authorIds?: string[];
  before?: string;
  limit?: number;
  popular?: boolean;
}): Promise<Post[]> {
  let q = supabase.from('posts').select(POST_SELECT).limit(opts.limit ?? 20);
  if (opts.popular) q = q.order('likes_count', { ascending: false }).order('created_at', { ascending: false });
  else q = q.order('created_at', { ascending: false });
  if (opts.kind) q = q.eq('kind', opts.kind);
  if (opts.userId) q = q.eq('user_id', opts.userId);
  if (opts.authorIds) {
    if (opts.authorIds.length === 0) return [];
    q = q.in('user_id', opts.authorIds);
  }
  if (opts.before) q = q.lt('created_at', opts.before);
  return hydratePosts(must<PostRow[]>(await q), opts.meId);
}

export async function fetchPostById(meId: string, id: string): Promise<Post | null> {
  const res = await supabase.from('posts').select(POST_SELECT).eq('id', id).maybeSingle();
  const row = must<PostRow | null>(res);
  if (!row) return null;
  return (await hydratePosts([row], meId))[0];
}

export async function searchPosts(meId: string, term: string, limit = 30): Promise<Post[]> {
  const clean = term.trim();
  if (!clean) return [];
  let q = supabase.from('posts').select(POST_SELECT).order('likes_count', { ascending: false }).limit(limit);
  if (clean.startsWith('#')) q = q.contains('tags', [clean.slice(1).toLowerCase()]);
  else q = q.ilike('caption', `%${clean.slice(0, 80).replace(/[%_\\]/g, ' ')}%`);
  return hydratePosts(must<PostRow[]>(await q), meId);
}

export async function fetchSaved(meId: string): Promise<Post[]> {
  const res = await supabase
    .from('bookmarks')
    .select('post:posts(*, author:profiles!posts_user_id_fkey(*))')
    .eq('user_id', meId)
    .order('created_at', { ascending: false })
    .limit(60);
  const rows = must<{ post: PostRow | null }[]>(res)
    .map((r) => r.post)
    .filter((p): p is PostRow => !!p);
  return hydratePosts(rows, meId);
}

export async function setPostLike(meId: string, postId: string, liked: boolean): Promise<void> {
  const res = liked
    ? await supabase.from('post_likes').upsert({ post_id: postId, user_id: meId }, { onConflict: 'post_id,user_id', ignoreDuplicates: true })
    : await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', meId);
  if (res.error) fail(res.error);
}

export async function setBookmark(meId: string, postId: string, saved: boolean): Promise<void> {
  const res = saved
    ? await supabase.from('bookmarks').upsert({ post_id: postId, user_id: meId }, { onConflict: 'post_id,user_id', ignoreDuplicates: true })
    : await supabase.from('bookmarks').delete().eq('post_id', postId).eq('user_id', meId);
  if (res.error) fail(res.error);
}

export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) fail(error);
}

export async function reportPost(meId: string, postId: string, reason = 'other'): Promise<void> {
  const { error } = await supabase
    .from('reports')
    .upsert({ reporter_id: meId, post_id: postId, reason }, { onConflict: 'reporter_id,post_id', ignoreDuplicates: true });
  if (error) fail(error);
}

export async function incrementViews(postId: string): Promise<void> {
  await supabase.rpc('increment_views', { target: postId });
}

// ---------- Subida y creación ----------
export async function uploadMedia(meId: string, body: Blob, ext: string, contentType: string): Promise<string> {
  const path = `${meId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, body, { contentType, cacheControl: '31536000' });
  if (error) fail(error);
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
}

export async function createPost(
  meId: string,
  input: { urls: string[]; caption: string; tags: string[]; location?: string }
): Promise<Post> {
  const res = await supabase
    .from('posts')
    .insert({ user_id: meId, kind: 'post', media_urls: input.urls, caption: input.caption, tags: input.tags, location: input.location || null })
    .select(POST_SELECT)
    .single();
  return toPost(must<PostRow>(res), new Set(), new Set());
}

export async function createClip(
  meId: string,
  input: { videoUrl: string; posterUrl?: string; duration: string; caption: string; tags: string[]; sound?: string; artist: string }
): Promise<Post> {
  const res = await supabase
    .from('posts')
    .insert({
      user_id: meId,
      kind: 'clip',
      media_urls: [input.videoUrl],
      poster_url: input.posterUrl ?? null,
      duration: input.duration,
      caption: input.caption,
      tags: input.tags,
      sound_title: input.sound || 'Sonido original',
      sound_artist: input.artist
    })
    .select(POST_SELECT)
    .single();
  return toPost(must<PostRow>(res), new Set(), new Set());
}

// ---------- Comentarios ----------
function toComment(r: CommentRow, liked: Set<string>): Comment {
  const author = toUser(r.author);
  return {
    id: r.id,
    userId: r.user_id,
    username: author.username,
    userAvatar: author.avatar,
    text: r.text,
    timestamp: timeAgo(r.created_at),
    likesCount: r.likes_count,
    isLiked: liked.has(r.id)
  };
}

export async function fetchComments(meId: string, postId: string): Promise<Comment[]> {
  const res = await supabase
    .from('comments')
    .select('*, author:profiles!comments_user_id_fkey(*)')
    .eq('post_id', postId)
    .order('created_at', { ascending: false })
    .limit(100);
  const rows = must<CommentRow[]>(res);
  if (rows.length === 0) return [];
  const likes = await supabase
    .from('comment_likes')
    .select('comment_id')
    .eq('user_id', meId)
    .in('comment_id', rows.map((r) => r.id));
  const liked = new Set(must<{ comment_id: string }[]>(likes).map((l) => l.comment_id));
  return rows.map((r) => toComment(r, liked));
}

export async function addComment(meId: string, postId: string, text: string): Promise<Comment> {
  const res = await supabase
    .from('comments')
    .insert({ post_id: postId, user_id: meId, text })
    .select('*, author:profiles!comments_user_id_fkey(*)')
    .single();
  return toComment(must<CommentRow>(res), new Set());
}

export async function setCommentLike(meId: string, commentId: string, liked: boolean): Promise<void> {
  const res = liked
    ? await supabase.from('comment_likes').upsert({ comment_id: commentId, user_id: meId }, { onConflict: 'comment_id,user_id', ignoreDuplicates: true })
    : await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', meId);
  if (res.error) fail(res.error);
}

// ---------- Historias ----------
export async function fetchStories(meId: string): Promise<Story[]> {
  const res = await supabase
    .from('stories')
    .select('*, author:profiles!stories_user_id_fkey(*)')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(200);
  const rows = must<StoryRow[]>(res);
  if (rows.length === 0) return [];
  const views = await supabase.from('story_views').select('story_id').eq('user_id', meId).in('story_id', rows.map((r) => r.id));
  const seen = new Set(must<{ story_id: string }[]>(views).map((v) => v.story_id));
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    user: toUser(r.author),
    mediaUrl: r.media_url,
    mediaType: 'image' as const,
    duration: '0:05',
    timestamp: timeAgo(r.created_at),
    hasViewed: r.user_id === meId || seen.has(r.id),
    caption: r.caption ?? undefined,
    soundTitle: r.sound_title ?? undefined
  }));
}

export async function createStory(meId: string, input: { mediaUrl: string; caption?: string; sound?: string }): Promise<void> {
  const { error } = await supabase
    .from('stories')
    .insert({ user_id: meId, media_url: input.mediaUrl, caption: input.caption || null, sound_title: input.sound || null });
  if (error) fail(error);
}

export async function markStoryViewed(meId: string, storyId: string): Promise<void> {
  await supabase
    .from('story_views')
    .upsert({ story_id: storyId, user_id: meId }, { onConflict: 'story_id,user_id', ignoreDuplicates: true });
}

// ---------- Notificaciones ----------
const NOTIFICATION_SELECT =
  '*, actor:profiles!notifications_actor_id_fkey(*), post:posts(media_urls, poster_url, kind)';

function toNotification(r: NotificationRow): NotificationItem {
  const isClip = r.post?.kind === 'clip';
  const text =
    r.type === 'like'
      ? `le dio Me gusta a tu ${isClip ? 'clip' : 'publicación'}`
      : r.type === 'comment'
        ? `comentó: "${r.body ?? ''}"`
        : 'comenzó a seguirte';
  return {
    id: r.id,
    type: r.type,
    user: toUser(r.actor),
    text,
    timestamp: timeAgo(r.created_at),
    mediaThumbnail: r.post ? (isClip ? (r.post.poster_url ?? undefined) : r.post.media_urls[0]) : undefined,
    postId: r.post_id ?? undefined,
    isRead: r.is_read
  };
}

export async function fetchNotifications(meId: string): Promise<NotificationItem[]> {
  const res = await supabase
    .from('notifications')
    .select(NOTIFICATION_SELECT)
    .eq('user_id', meId)
    .order('created_at', { ascending: false })
    .limit(50);
  return must<NotificationRow[]>(res).map(toNotification);
}

export async function fetchNotification(id: string): Promise<NotificationItem | null> {
  const res = await supabase.from('notifications').select(NOTIFICATION_SELECT).eq('id', id).maybeSingle();
  const row = must<NotificationRow | null>(res);
  return row ? toNotification(row) : null;
}

export async function markAllNotificationsRead(meId: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', meId).eq('is_read', false);
  if (error) fail(error);
}

// ---------- Explorar y actividad ----------
export async function trendingTags(limit = 10): Promise<TrendingItem[]> {
  const res = await supabase.rpc('trending_tags', { max_rows: limit });
  return must<{ tag: string; uses: number; thumb: string | null }[]>(res).map((r) => ({
    id: `tag_${r.tag}`,
    tag: `#${r.tag}`,
    views: `${formatCount(Number(r.uses))} ${Number(r.uses) === 1 ? 'publicación' : 'publicaciones'}`,
    imageUrl: r.thumb ?? POSTER_FALLBACK
  }));
}

export async function myActivity(): Promise<ActivityMetric[]> {
  const res = await supabase.rpc('my_activity');
  const d = must<{ likes: number; comments: number; followers: number; views: number }>(res);
  return [
    { id: 'm_likes', label: 'Me gusta (7 días)', value: formatCount(d.likes), icon: 'heart' },
    { id: 'm_comments', label: 'Comentarios (7 días)', value: formatCount(d.comments), icon: 'comment' },
    { id: 'm_followers', label: 'Nuevos seguidores', value: formatCount(d.followers), icon: 'users' },
    { id: 'm_views', label: 'Reproducciones', value: formatCount(d.views), icon: 'views' }
  ];
}


// ---------- Bloqueos y reportes ----------
export async function blockUser(meId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('blocks')
    .upsert({ blocker_id: meId, blocked_id: userId }, { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true });
  if (error) fail(error);
}

export async function unblockUser(meId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('blocks').delete().eq('blocker_id', meId).eq('blocked_id', userId);
  if (error) fail(error);
}

export async function fetchBlocked(meId: string): Promise<User[]> {
  const res = await supabase
    .from('blocks')
    .select('profile:profiles!blocks_blocked_id_fkey(*)')
    .eq('blocker_id', meId)
    .order('created_at', { ascending: false })
    .limit(200);
  return must<{ profile: ProfileRow }[]>(res).map((r) => toUser(r.profile));
}

export async function reportUser(meId: string, userId: string, reason = 'other'): Promise<void> {
  const { error } = await supabase
    .from('user_reports')
    .upsert({ reporter_id: meId, reported_id: userId, reason }, { onConflict: 'reporter_id,reported_id', ignoreDuplicates: true });
  if (error) fail(error);
}

// ---------- Chat ----------
interface ConversationRow {
  id: string;
  other_user: string;
  last_body: string;
  last_sender: string;
  last_at: string;
  unread: number;
  is_request: boolean;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export function toMessage(r: MessageRow): ChatMessage {
  return { id: r.id, conversationId: r.conversation_id, senderId: r.sender_id, body: r.body, createdAt: r.created_at, readAt: r.read_at };
}

export async function fetchConversations(meId: string): Promise<Conversation[]> {
  const rows = must<ConversationRow[]>(await supabase.rpc('my_conversations'));
  if (rows.length === 0) return [];
  const profiles = must<ProfileRow[]>(
    await supabase.from('profiles').select('*').in('id', rows.map((r) => r.other_user))
  );
  const byId = new Map(profiles.map((p) => [p.id, toUser(p)]));
  return rows
    .filter((r) => byId.has(r.other_user))
    .map((r) => ({
      id: r.id,
      other: byId.get(r.other_user)!,
      lastBody: r.last_body,
      lastFromMe: r.last_sender === meId,
      lastAt: r.last_at,
      unread: Number(r.unread),
      isRequest: r.is_request
    }));
}

export async function openConversation(otherId: string): Promise<string> {
  return must<string>(await supabase.rpc('get_or_create_conversation', { other: otherId }));
}

export async function fetchMessages(conversationId: string, before?: string, limit = 40): Promise<ChatMessage[]> {
  let q = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (before) q = q.lt('created_at', before);
  return must<MessageRow[]>(await q).map(toMessage).reverse();
}

export async function sendMessage(conversationId: string, meId: string, body: string): Promise<ChatMessage> {
  const res = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: meId, body: body.trim() })
    .select('*')
    .single();
  return toMessage(must<MessageRow>(res));
}

export async function deleteMessage(messageId: string): Promise<void> {
  const { error } = await supabase.from('messages').delete().eq('id', messageId);
  if (error) fail(error);
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await supabase.rpc('mark_conversation_read', { cid: conversationId });
}

export async function unreadMessages(): Promise<number> {
  return Number(must<number>(await supabase.rpc('my_unread_messages')) ?? 0);
}

// ---------- Cuenta ----------
// Borra primero los archivos (desde la API de almacenamiento) y después la cuenta y todos sus datos.
export async function deleteMyAccount(meId: string): Promise<void> {
  for (let i = 0; i < 50; i++) {
    const { data, error } = await supabase.storage.from('media').list(meId, { limit: 100 });
    if (error) fail(error);
    if (!data || data.length === 0) break;
    const { error: rmError } = await supabase.storage.from('media').remove(data.map((f) => `${meId}/${f.name}`));
    if (rmError) fail(rmError);
  }
  const { error } = await supabase.rpc('delete_my_account');
  if (error) fail(error);
}

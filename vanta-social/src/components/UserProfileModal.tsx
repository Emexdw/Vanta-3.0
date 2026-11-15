import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, MapPin, Play, Layers, Bookmark, Grid3X3, Film, Settings, LogOut, ShieldCheck, Pin, PinOff } from 'lucide-react';
import { Post, User } from '../types';
import { fetchPinnedPostIds, setPinnedPost } from '../lib/api';
import { soundEngine } from '../utils/audioSynth';
import { useModalBehavior } from '../hooks/useModalBehavior';
import { formatCount } from '../utils/format';

type ProfileTab = 'posts' | 'clips' | 'saved';

interface UserProfileModalProps {
  user: User;
  isCurrentUser: boolean;
  variant: 'page' | 'modal';
  posts: Post[];
  saved: Post[];
  loading: boolean;
  isFollowing: boolean;
  onToggleFollow: (userId: string) => void;
  onClose: () => void;
  onSelectPost: (post: Post) => void;
  onEditProfile?: () => void;
  onSignOut?: () => void | Promise<void>;
  onMessage?: (user: User) => void;
  onBlock?: (user: User) => void;
  onReportUser?: (user: User) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  isCurrentUser,
  variant,
  posts,
  saved,
  loading,
  isFollowing,
  onToggleFollow,
  onClose,
  onSelectPost,
  onEditProfile,
  onSignOut,
  onMessage,
  onBlock,
  onReportUser
}) => {
  const [tab, setTab] = useState<ProfileTab>('posts');
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [pinBusy, setPinBusy] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setPinnedIds([]);
    fetchPinnedPostIds(user.id).then((ids) => { if (alive) setPinnedIds(ids); })
      .catch(() => { if (alive) setPinError('No se pudieron cargar las publicaciones fijadas.'); });
    return () => { alive = false; };
  }, [user.id]);

  const togglePin = async (post: Post) => {
    if (!isCurrentUser || pinBusy) return;
    const pinned = pinnedIds.includes(post.id);
    if (!pinned && pinnedIds.length >= 3) {
      setPinError('Solo podés fijar hasta tres publicaciones.');
      return;
    }
    setPinBusy(post.id);
    setPinError(null);
    try {
      await setPinnedPost(user.id, post.id, !pinned);
      setPinnedIds((ids) => pinned ? ids.filter((id) => id !== post.id) : [post.id, ...ids]);
    } catch (error) {
      setPinError(error instanceof Error ? error.message : 'No se pudo modificar la publicación fijada.');
    } finally { setPinBusy(null); }
  };
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = async () => {
    if (!onSignOut || loggingOut) return;
    setLoggingOut(true);
    setLogoutError(null);
    try {
      await onSignOut();
    } catch {
      setLogoutError('No se pudo cerrar la sesión. Intentá nuevamente.');
      setLoggingOut(false);
    }
  };
  useModalBehavior(onClose, variant === 'modal');

  const items = tab === 'posts' ? posts.filter((p) => p.kind === 'post').sort((a, b) => Number(pinnedIds.includes(b.id)) - Number(pinnedIds.includes(a.id))) : tab === 'clips' ? posts.filter((p) => p.kind === 'clip') : saved;
  const emptyText = tab === 'saved' ? 'Todavía no guardaste nada.' : tab === 'clips' ? 'Sin clips por ahora.' : 'Sin publicaciones por ahora.';

  const tabs: { id: ProfileTab; label: string; icon: React.ReactNode }[] = [
    { id: 'posts', label: 'Posts', icon: <Grid3X3 className="w-4 h-4" /> },
    { id: 'clips', label: 'Clips', icon: <Film className="w-4 h-4" /> },
    ...(isCurrentUser ? [{ id: 'saved' as const, label: 'Guardados', icon: <Bookmark className="w-4 h-4" /> }] : [])
  ];

  const bannerBackground = user.bannerStyle === 'minimal'
    ? 'linear-gradient(135deg, #17171c, #09090b)'
    : user.bannerStyle === 'gradient'
      ? `linear-gradient(115deg, ${user.themeColor || '#8b5cf6'}, #111115 85%)`
      : `radial-gradient(circle at 20% 10%, ${user.themeColor || '#8b5cf6'}55, transparent 55%), linear-gradient(135deg, #202024, #09090b)`;
  const body = (
    <div className="bg-[#111115] border border-white/[0.07] rounded-[28px] overflow-hidden text-white">
      {/* Portada */}
      <div className={`relative overflow-hidden bg-[#19191d] ${user.profileStyle === 'compact' ? 'h-32 sm:h-40' : user.profileStyle === 'spotlight' ? 'h-56 sm:h-64' : 'h-48 sm:h-56'}`}>
        {user.bannerUrl ? (
          <img src={user.bannerUrl} alt={`Portada de ${user.username}`} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: bannerBackground }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-white/10" />
        {variant === 'modal' && <button onClick={onClose} aria-label="Cerrar perfil" className="absolute top-5 right-5 z-10 w-12 h-12 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"><X className="w-6 h-6" /></button>}
      </div>

      <div className="px-5 sm:px-7 pb-5">
        <div className={`${user.profileStyle === 'compact' ? '-mt-12' : '-mt-20'} relative z-[1] flex items-end justify-between gap-3`}>
          <img src={user.avatar} alt={user.username} className={`${user.profileStyle === 'compact' ? 'w-24 h-24 sm:w-28 sm:h-28' : 'w-36 h-36 sm:w-40 sm:h-40'} rounded-full object-cover border-[5px] border-[#111115] bg-black shadow-xl`} />
          {isCurrentUser ? (
            <div className="mb-1 flex items-center gap-2">
              <button onClick={onEditProfile} className="px-4 sm:px-6 py-2.5 rounded-2xl border border-white/10 bg-[#19191d] text-sm font-medium text-zinc-200 hover:bg-white/10 transition-colors">Tu perfil</button>
              <button type="button" onClick={() => { setMenuOpen(true); setLogoutError(null); }} aria-label="Configuración" title="Configuración" className="p-3 rounded-2xl border border-white/10 bg-[#19191d] text-zinc-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-violet-400"><Settings className="w-5 h-5" /></button>
            </div>
          ) : (
            <div className="mb-1 flex gap-2">
              {onMessage && <button onClick={() => onMessage(user)} className="px-4 py-2.5 rounded-2xl border border-white/15 text-sm text-zinc-200">Mensaje</button>}
              <button onClick={() => onToggleFollow(user.id)} aria-pressed={isFollowing} className={`px-5 py-2.5 rounded-2xl text-sm font-semibold ${isFollowing ? 'bg-zinc-800 border border-white/10' : 'bg-white text-black'}`}>{isFollowing ? 'Siguiendo' : 'Seguir'}</button>
            </div>
          )}
        </div>

        <div className="mt-5">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: user.themeColor || undefined }}>{user.displayName}</h2>
            {user.isVerified && <CheckCircle2 className="w-5 h-5 text-zinc-300 fill-zinc-800" aria-label="Verificado" />}
          </div>
          <p className="text-base text-zinc-500 mt-1">@{user.username}</p>
          {user.bio && <p className="text-[15px] text-zinc-300 leading-relaxed mt-5 whitespace-pre-wrap break-words">{user.bio}</p>}
          {user.websiteUrl && /^https:\/\//i.test(user.websiteUrl) && <a href={user.websiteUrl} target="_blank" rel="noopener noreferrer nofollow ugc" className="inline-flex mt-3 text-sm font-medium hover:underline break-all" style={{ color: user.themeColor || '#a78bfa' }}>{user.websiteUrl.replace(/^https:\/\//i, '').slice(0, 65)}</a>}
          {user.location && <p className="flex items-center gap-2 text-sm text-zinc-500 mt-3"><MapPin className="w-4 h-4" />{user.location}</p>}
        </div>

        <div className="grid grid-cols-3 gap-2 mt-7 py-5 border-y border-white/[0.08] text-center">
          {[
            { label: 'Publicaciones', value: user.postsCount },
            { label: 'Seguidores', value: user.followersCount },
            { label: 'Siguiendo', value: user.followingCount }
          ].map((stat) => <div key={stat.label}><p className="text-2xl font-semibold text-white tabular-nums">{formatCount(stat.value)}</p><p className="text-sm text-zinc-500 mt-2">{stat.label}</p></div>)}
        </div>

        <div className="flex -mx-5 sm:-mx-7 mt-0 border-b border-white/[0.08] bg-black/20" role="tablist">
          {tabs.map((t) => <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => { soundEngine.playTap(); setTab(t.id); }} className={`flex-1 min-w-0 py-4 flex items-center justify-center gap-2 text-sm sm:text-base font-medium border-b-2 transition-colors ${tab === t.id ? 'text-white border-white' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}>{t.icon}<span>{t.label}</span></button>)}
        </div>

        {pinError && <p role="alert" className="mt-3 text-sm text-red-300">{pinError}</p>}
        {isCurrentUser && tab === 'posts' && <p className="mt-3 text-xs text-zinc-500">Podés fijar hasta 3 publicaciones en la parte superior de tu perfil.</p>}
        {loading && items.length === 0 ? <p className="py-10 text-center text-sm text-zinc-500">Cargando...</p> : items.length === 0 ? <div className="py-14 text-center text-sm text-zinc-500 flex flex-col items-center gap-2">{tab === 'saved' && <Bookmark className="w-5 h-5" />}{emptyText}</div> : (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {items.map((post) => <div key={post.id} className="relative aspect-square rounded-xl overflow-hidden bg-zinc-900 border border-white/5 group">
              <button onClick={() => { soundEngine.playTap(); onSelectPost(post); }} aria-label={`Abrir publicación: ${post.caption || 'sin descripción'}`} className="absolute inset-0 w-full h-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"><img src={post.mediaUrls[0]} alt={post.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />{post.kind === 'clip' && <Play className="absolute top-2 right-2 w-4 h-4 text-white fill-white drop-shadow" />}{post.mediaUrls.length > 1 && <Layers className="absolute top-2 right-2 w-4 h-4 text-white drop-shadow" />}</button>
              {pinnedIds.includes(post.id) && <span className="absolute top-2 left-2 rounded-full bg-violet-600/90 p-1 pointer-events-none" title="Publicación fijada"><Pin className="w-3.5 h-3.5 text-white" /></span>}
              {isCurrentUser && tab === 'posts' && <button type="button" disabled={pinBusy !== null} onClick={() => void togglePin(post)} aria-label={pinnedIds.includes(post.id) ? 'Desfijar publicación' : 'Fijar publicación'} title={pinnedIds.includes(post.id) ? 'Desfijar' : 'Fijar'} className="absolute bottom-2 right-2 rounded-lg bg-black/80 p-2 text-white hover:bg-violet-600 disabled:opacity-50">{pinnedIds.includes(post.id) ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}</button>}
            </div>)}
          </div>
        )}
      </div>
    </div>
  );

  const settingsDialog = menuOpen && isCurrentUser && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4" onClick={() => !loggingOut && setMenuOpen(false)}>
      <div role="dialog" aria-modal="true" aria-label="Configuración de cuenta" onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#17171c] p-5 sm:p-6 text-white shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Configuración</h2>
          <button type="button" aria-label="Cerrar configuración" onClick={() => setMenuOpen(false)} disabled={loggingOut} className="rounded-xl p-2 hover:bg-white/10"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 mb-3">
          <ShieldCheck className="w-5 h-5 text-violet-300" />
          <div><p className="font-medium text-sm">Cuenta y seguridad</p><p className="text-xs text-zinc-400 mt-1">Sesión iniciada como @{user.username}</p></div>
        </div>
        <button type="button" onClick={() => { setMenuOpen(false); onEditProfile?.(); }} className="w-full text-left rounded-2xl border border-white/10 p-4 text-sm hover:bg-white/10 mb-3">Editar mi perfil</button>
        <div className="border-t border-white/10 pt-4">
          <button type="button" onClick={handleLogout} disabled={loggingOut || !onSignOut} className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white text-black font-semibold py-3.5 disabled:opacity-50 hover:bg-zinc-200"><LogOut className="w-5 h-5" />{loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}</button>
          {logoutError && <p role="alert" className="mt-3 text-sm text-red-300">{logoutError}</p>}
          <p className="text-xs text-zinc-500 mt-3 text-center">Cerrar sesión no elimina tu cuenta ni tus publicaciones.</p>
        </div>
      </div>
    </div>
  );

  if (variant === 'page') return <>{body}{settingsDialog}</>;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Perfil de ${user.username}`} className="relative w-full max-w-md max-h-[92vh] overflow-y-auto no-scrollbar rounded-t-3xl sm:rounded-3xl">
        {body}
      </div>
      {settingsDialog}
    </div>
  );
};

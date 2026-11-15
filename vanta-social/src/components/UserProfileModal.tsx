import React, { useState } from 'react';
import { X, CheckCircle2, MapPin, Play, Layers, Bookmark, Grid3X3, Film } from 'lucide-react';
import { Post, User } from '../types';
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
  onSignOut?: () => void;
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
  const [menuOpen, setMenuOpen] = useState(false);
  useModalBehavior(onClose, variant === 'modal');

  const items = tab === 'posts' ? posts.filter((p) => p.kind === 'post') : tab === 'clips' ? posts.filter((p) => p.kind === 'clip') : saved;
  const emptyText = tab === 'saved' ? 'Todavía no guardaste nada.' : tab === 'clips' ? 'Sin clips por ahora.' : 'Sin publicaciones por ahora.';

  const tabs: { id: ProfileTab; label: string; icon: React.ReactNode }[] = [
    { id: 'posts', label: 'Posts', icon: <Grid3X3 className="w-4 h-4" /> },
    { id: 'clips', label: 'Clips', icon: <Film className="w-4 h-4" /> },
    ...(isCurrentUser ? [{ id: 'saved' as const, label: 'Guardados', icon: <Bookmark className="w-4 h-4" /> }] : [])
  ];

  const body = (
    <div className="bg-[#111115] border border-white/[0.07] rounded-[28px] overflow-hidden text-white">
      {/* Portada */}
      <div className="relative h-48 sm:h-56 overflow-hidden bg-[#19191d]">
        {user.bannerUrl ? (
          <img src={user.bannerUrl} alt={`Portada de ${user.username}`} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 20% 10%, ${user.themeColor || '#8b5cf6'}55, transparent 55%), linear-gradient(135deg, #202024, #09090b)` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-white/10" />
        {variant === 'modal' && <button onClick={onClose} aria-label="Cerrar perfil" className="absolute top-5 right-5 z-10 w-12 h-12 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"><X className="w-6 h-6" /></button>}
      </div>

      <div className="px-5 sm:px-7 pb-5">
        <div className="-mt-20 relative z-[1] flex items-end justify-between gap-3">
          <img src={user.avatar} alt={user.username} className="w-36 h-36 sm:w-40 sm:h-40 rounded-full object-cover border-[5px] border-[#111115] bg-black shadow-xl" />
          {isCurrentUser ? (
            <button onClick={onEditProfile} className="mb-1 px-6 py-2.5 rounded-2xl border border-white/10 bg-[#19191d] text-sm font-medium text-zinc-200 hover:bg-white/10 transition-colors">Tu perfil</button>
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

        {loading && items.length === 0 ? <p className="py-10 text-center text-sm text-zinc-500">Cargando...</p> : items.length === 0 ? <div className="py-14 text-center text-sm text-zinc-500 flex flex-col items-center gap-2">{tab === 'saved' && <Bookmark className="w-5 h-5" />}{emptyText}</div> : (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {items.map((post) => <button key={post.id} onClick={() => { soundEngine.playTap(); onSelectPost(post); }} className="relative aspect-square rounded-xl overflow-hidden bg-zinc-900 border border-white/5 group focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"><img src={post.mediaUrls[0]} alt={post.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />{post.kind === 'clip' && <Play className="absolute top-2 right-2 w-4 h-4 text-white fill-white drop-shadow" />}{post.mediaUrls.length > 1 && <Layers className="absolute top-2 right-2 w-4 h-4 text-white drop-shadow" />}</button>)}
          </div>
        )}
      </div>
    </div>
  );

  if (variant === 'page') return body;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Perfil de ${user.username}`} className="relative w-full max-w-md max-h-[92vh] overflow-y-auto no-scrollbar rounded-t-3xl sm:rounded-3xl">
        {body}
      </div>
    </div>
  );
};

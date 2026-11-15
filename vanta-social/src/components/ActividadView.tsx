import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, Users, Eye, CheckCheck, AtSign } from 'lucide-react';
import { ActivityMetric, NotificationItem, Post, User } from '../types';
import * as api from '../lib/api';
import { soundEngine } from '../utils/audioSynth';
import { formatCount } from '../utils/format';

interface ActividadViewProps {
  meId: string;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  isFollowing: (userId: string) => boolean;
  onToggleFollow: (userId: string) => void;
  onOpenProfile: (username: string) => void;
  onOpenPost: (post: Post) => void;
  onOpenPostById: (postId: string) => void;
}

const METRIC_ICONS: Record<ActivityMetric['icon'], typeof Heart> = { heart: Heart, comment: MessageCircle, users: Users, views: Eye };
const TYPE_ICONS: Record<NotificationItem['type'], typeof Heart> = { like: Heart, comment: MessageCircle, follow: Users, mention: AtSign };

export const ActividadView: React.FC<ActividadViewProps> = ({
  meId,
  notifications,
  onMarkAllRead,
  isFollowing,
  onToggleFollow,
  onOpenProfile,
  onOpenPost,
  onOpenPostById
}) => {
  const [metrics, setMetrics] = useState<ActivityMetric[]>([]);
  const [followers, setFollowers] = useState<User[]>([]);
  const [top, setTop] = useState<Post[]>([]);
  const unread = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, f, mine] = await Promise.all([
          api.myActivity(),
          api.fetchRecentFollowers(meId, 6),
          api.fetchPosts({ meId, userId: meId, popular: true, limit: 4 })
        ]);
        if (!cancelled) {
          setMetrics(m);
          setFollowers(f);
          setTop(mine);
        }
      } catch {
        /* las secciones se ocultan si fallan */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [meId]);

  const followButton = (userId: string) => {
    const on = isFollowing(userId);
    return (
      <button
        onClick={() => {
          soundEngine.playPublish();
          onToggleFollow(userId);
        }}
        aria-pressed={on}
        className={`px-3.5 py-1 rounded-full text-[11px] font-semibold transition-all active:scale-95 ${
          on ? 'bg-zinc-800 text-zinc-200 border border-white/10' : 'bg-white text-black hover:bg-zinc-200'
        }`}
      >
        {on ? 'Siguiendo' : 'Seguir'}
      </button>
    );
  };

  return (
    <div className="px-3 pt-3 pb-24 space-y-6">
      {metrics.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-white mb-2.5">Tu actividad</h2>
          <div className="grid grid-cols-2 gap-2">
            {metrics.map((m) => {
              const Icon = METRIC_ICONS[m.icon];
              return (
                <div key={m.id} className="bg-[#111115] border border-white/[0.07] rounded-2xl p-3.5">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="text-[11px]">{m.label}</span>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xl font-semibold text-white mt-1.5 tabular-nums">{m.value}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-semibold text-white">
            Notificaciones{unread > 0 && <span className="ml-2 text-[11px] font-medium text-rose-400">{unread} sin leer</span>}
          </h2>
          {unread > 0 && (
            <button
              onClick={() => {
                soundEngine.playTap();
                onMarkAllRead();
              }}
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Marcar todo como leído
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <p className="py-8 text-center text-xs text-zinc-500">Todavía no tenés notificaciones.</p>
        ) : (
          <ul className="space-y-1.5">
            {notifications.map((n) => {
              const Icon = TYPE_ICONS[n.type];
              return (
                <li key={n.id} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${n.isRead ? 'bg-transparent border-transparent' : 'bg-[#111115] border-white/[0.07]'}`}>
                  <button onClick={() => onOpenProfile(n.user.username)} className="relative shrink-0" aria-label={`Ver perfil de ${n.user.username}`}>
                    <img src={n.user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 p-1 rounded-full bg-zinc-900 border border-white/15 flex items-center justify-center">
                      <Icon className={`w-2.5 h-2.5 ${n.type === 'like' ? 'text-rose-500 fill-rose-500' : 'text-zinc-200'}`} />
                    </span>
                  </button>
                  <div className="flex-1 min-w-0 text-xs leading-snug">
                    <p className="text-zinc-300 break-words">
                      <button onClick={() => onOpenProfile(n.user.username)} className="font-semibold text-white hover:underline">
                        @{n.user.username}
                      </button>{' '}
                      {n.text}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{n.timestamp}</p>
                  </div>
                  {n.type === 'follow' ? (
                    followButton(n.user.id)
                  ) : n.postId && n.mediaThumbnail ? (
                    <button onClick={() => onOpenPostById(n.postId!)} aria-label="Ver publicación" className="shrink-0">
                      <img src={n.mediaThumbnail} alt="" className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                    </button>
                  ) : null}
                  {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" aria-label="Sin leer" />}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {followers.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-white mb-2.5">Seguidores recientes</h2>
          <ul className="space-y-1.5">
            {followers.map((u) => (
              <li key={u.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#111115] border border-white/[0.07]">
                <button onClick={() => onOpenProfile(u.username)} className="shrink-0" aria-label={`Ver perfil de ${u.username}`}>
                  <img src={u.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{u.displayName}</p>
                  <p className="text-[11px] text-zinc-500 truncate">@{u.username}</p>
                </div>
                {followButton(u.id)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {top.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-white mb-2.5">Tu contenido más popular</h2>
          <div className="grid grid-cols-4 gap-2">
            {top.map((p) => (
              <button key={p.id} onClick={() => onOpenPost(p)} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-white/[0.07] group bg-zinc-900">
                <img src={p.mediaUrls[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-[10px] text-white">
                  <Heart className="w-3 h-3" />
                  {formatCount(p.likesCount)}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

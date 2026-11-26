import React, { useEffect, useState } from 'react';
import { Search, Play, Heart, X } from 'lucide-react';
import { Post, TrendingItem, User } from '../types';
import * as api from '../lib/api';
import { soundEngine } from '../utils/audioSynth';
import { formatCount } from '../utils/format';

interface ExplorarViewProps {
  meId: string;
  onOpenProfile: (username: string) => void;
  onOpenPost: (post: Post) => void;
  isFollowing: (userId: string) => boolean;
  onToggleFollow: (userId: string) => void;
}

type Filter = 'all' | 'post' | 'clip' | 'people';
type Sort = 'popular' | 'recent';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todo' },
  { id: 'post', label: 'Fotos' },
  { id: 'clip', label: 'Clips' },
  { id: 'people', label: 'Personas' }
];

export const ExplorarView: React.FC<ExplorarViewProps> = ({ meId, onOpenProfile, onOpenPost, isFollowing, onToggleFollow }) => {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('popular');
  const [retryCount, setRetryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tags, setTags] = useState<TrendingItem[]>([]);
  const [suggested, setSuggested] = useState<User[]>([]);
  const [grid, setGrid] = useState<Post[]>([]);
  const [people, setPeople] = useState<User[]>([]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  // Contenido inicial (sin búsqueda)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [t, s] = await Promise.all([api.trendingTags(8), api.suggestedProfiles(8)]);
        if (!cancelled) {
          setTags(t);
          setSuggested(s);
        }
      } catch {
        /* secciones opcionales */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Grilla: populares o resultados de búsqueda
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        if (debounced) {
          const [posts, profiles] = await Promise.all([
            filter === 'people' ? Promise.resolve([] as Post[]) : api.searchPosts(meId, debounced),
            debounced.startsWith('#') || (filter !== 'all' && filter !== 'people') ? Promise.resolve([] as User[]) : api.searchProfiles(debounced.replace(/^@/, ''))
          ]);
          if (!cancelled) {
            setGrid(posts);
            setPeople(profiles);
          }
        } else {
          const posts = filter === 'people' ? [] : await api.fetchPosts({ meId, popular: sort === 'popular', limit: 30 });
          if (!cancelled) {
            setGrid(posts);
            setPeople([]);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar Explorar.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, meId, filter, sort, retryCount]);

  const visible = grid.filter((p) => filter === 'all' || p.kind === filter)
    .sort((a, b) => sort === 'recent'
      ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      : b.likesCount - a.likesCount);
  const showPeople = filter === 'people' || filter === 'all';

  const followBtn = (u: User) => {
    const on = isFollowing(u.id);
    return (
      <button
        onClick={() => {
          soundEngine.playPublish();
          onToggleFollow(u.id);
        }}
        aria-pressed={on}
        className={`px-3.5 py-1 rounded-full text-[11px] font-semibold active:scale-95 transition-all ${
          on ? 'bg-zinc-800 text-zinc-200 border border-white/10' : 'bg-white text-black hover:bg-zinc-200'
        }`}
      >
        {on ? 'Siguiendo' : 'Seguir'}
      </button>
    );
  };

  return (
    <div className="px-3 pt-3 pb-24 space-y-5">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar personas, texto o #etiquetas"
          className="w-full bg-[#111115] border border-white/10 rounded-full pl-10 pr-10 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 transition-colors [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button onClick={() => setQuery('')} aria-label="Borrar búsqueda" className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {!debounced && tags.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-white mb-2.5">En tendencia</h2>
          <div data-no-swipe className="flex gap-3 overflow-x-auto no-scrollbar -mx-3 px-3">
            {tags.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  soundEngine.playTap();
                  setQuery(t.tag);
                }}
                className="relative w-32 h-40 shrink-0 rounded-2xl overflow-hidden border border-white/10 group text-left"
              >
                <img src={t.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                <div className="absolute bottom-2.5 left-2.5 right-2.5">
                  <p className="text-sm font-semibold text-white truncate">{t.tag}</p>
                  <p className="text-[11px] text-zinc-300">{t.views}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {!debounced && suggested.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-white mb-2.5">Personas para seguir</h2>
          <div data-no-swipe className="flex gap-3 overflow-x-auto no-scrollbar -mx-3 px-3">
            {suggested.map((u) => (
              <div key={u.id} className="w-32 shrink-0 bg-[#111115] border border-white/[0.07] rounded-2xl p-3 flex flex-col items-center text-center gap-2.5">
                <button onClick={() => onOpenProfile(u.username)} className="flex flex-col items-center min-w-0 w-full">
                  <img src={u.avatar} alt={u.username} className="w-14 h-14 rounded-full object-cover" />
                  <p className="text-xs font-medium text-white mt-2 max-w-full truncate">{u.displayName}</p>
                  <p className="text-[10px] text-zinc-500 max-w-full truncate">@{u.username}</p>
                </button>
                {followBtn(u)}
              </div>
            ))}
          </div>
        </section>
      )}

      {showPeople && people.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-white mb-2.5">Personas</h2>
          <ul className="space-y-1.5">
            {people.map((u) => (
              <li key={u.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#111115] border border-white/[0.07]">
                <button onClick={() => onOpenProfile(u.username)} className="shrink-0">
                  <img src={u.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                </button>
                <button onClick={() => onOpenProfile(u.username)} className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-semibold text-white truncate">{u.displayName}</p>
                  <p className="text-[11px] text-zinc-500 truncate">@{u.username} · {formatCount(u.followersCount)} seguidores</p>
                </button>
                {u.id !== meId && followBtn(u)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div data-no-swipe className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                soundEngine.playTap();
                setFilter(f.id);
              }}
              aria-pressed={filter === f.id}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filter === f.id ? 'bg-white text-black border-white' : 'text-zinc-400 border-white/10 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
          </div>
          {filter !== 'people' && (
            <div className="flex items-center gap-1 rounded-full border border-white/10 p-1" aria-label="Orden de resultados">
              <button onClick={() => setSort('popular')} aria-pressed={sort === 'popular'} className={`rounded-full px-2.5 py-1 text-[11px] ${sort === 'popular' ? 'bg-white text-black' : 'text-zinc-400'}`}>Populares</button>
              <button onClick={() => setSort('recent')} aria-pressed={sort === 'recent'} className={`rounded-full px-2.5 py-1 text-[11px] ${sort === 'recent' ? 'bg-white text-black' : 'text-zinc-400'}`}>Recientes</button>
            </div>
          )}
        </div>

        {error ? (
          <div role="alert" className="py-10 text-center space-y-3"><p className="text-xs text-rose-400">{error}</p><button className="text-xs px-4 py-2 rounded-full border border-white/20 text-white" onClick={() => setRetryCount((n) => n + 1)}>Reintentar búsqueda</button></div>
        ) : loading ? (
          <p className="py-10 text-center text-xs text-zinc-500">Cargando...</p>
        ) : filter === 'people' ? (
          <p className="py-8 text-center text-xs text-zinc-500">{debounced ? (people.length ? 'Resultados de personas arriba.' : 'No se encontraron personas. Probá otro nombre.') : 'Escribí un nombre o @usuario para buscar personas.'}</p>
        ) : visible.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-zinc-300 font-medium">{debounced ? `Sin resultados para “${debounced}”` : 'Todavía no hay contenido'}</p>
            <p className="text-xs text-zinc-500 mt-1">{debounced ? 'Probá con otra búsqueda.' : 'Sé la primera persona en publicar.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {visible.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  soundEngine.playTap();
                  onOpenPost(p);
                }}
                className="relative aspect-[3/4] rounded-xl overflow-hidden border border-white/[0.07] group text-left bg-zinc-900"
              >
                <img src={p.mediaUrls[0]} alt={p.caption || `Contenido de ${p.user.username}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />
                {p.kind === 'clip' && (
                  <span className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/60 text-[10px] text-white font-mono">
                    <Play className="w-2.5 h-2.5 fill-white" />
                    {p.videoDuration}
                  </span>
                )}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-white">
                  <span className="truncate font-medium">@{p.user.username}</span>
                  <span className="flex items-center gap-1 shrink-0 text-zinc-300">
                    <Heart className="w-3 h-3" />
                    {formatCount(p.likesCount)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

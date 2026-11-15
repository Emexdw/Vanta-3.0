import React, { useEffect, useRef, useState } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  CheckCircle2,
  Play,
  Music,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Post } from '../types';
import { soundEngine } from '../utils/audioSynth';
import { formatCount } from '../utils/format';

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onBookmark: (postId: string) => void;
  onOpenComments: (post: Post) => void;
  onOpenShare: (post: Post) => void;
  onOpenProfile: (username: string) => void;
  onPlayClip?: (post: Post) => void;
  onReport?: (post: Post) => void;
  onDelete?: (post: Post) => void;
  isOwner?: boolean;
}

const DOUBLE_TAP_DELAY = 300;

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onLike,
  onBookmark,
  onOpenComments,
  onOpenShare,
  onOpenProfile,
  onPlayClip,
  onReport,
  onDelete,
  isOwner = false
}) => {
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  // useRef: el valor sobrevive entre renders (antes `let lastTap` se reiniciaba siempre)
  const lastTapRef = useRef(0);
  const tapTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
    };
  }, []);

  const handleMediaTap = () => {
    const now = Date.now();

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Doble toque: cancela el toque simple pendiente y da me gusta
      if (tapTimerRef.current) {
        window.clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
      }
      lastTapRef.current = 0;
      if (!post.isLiked) onLike(post.id);
      soundEngine.playHeartLike();
      setShowHeartAnim(true);
      window.setTimeout(() => setShowHeartAnim(false), 800);
      return;
    }

    lastTapRef.current = now;
    // Toque simple: espera por si viene un segundo toque
    if (post.videoDuration && onPlayClip) {
      tapTimerRef.current = window.setTimeout(() => {
        tapTimerRef.current = null;
        soundEngine.playTap();
        onPlayClip(post);
      }, DOUBLE_TAP_DELAY);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/?p=${post.id}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* portapapeles no disponible */
    }
    setShowOptionsMenu(false);
  };

  const currentMediaUrl = post.mediaUrls[activeMediaIndex] || post.mediaUrls[0];

  return (
    <article className="bg-[#111115] border border-white/[0.07] rounded-2xl p-4 my-3 mx-2 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onOpenProfile(post.user.username)}
            className="w-9 h-9 rounded-full border border-white/20 p-0.5 cursor-pointer hover:border-white/50 transition-colors"
          >
            <img src={post.user.avatar} alt={post.user.username} loading="lazy" decoding="async" className="w-full h-full rounded-full object-cover" />
          </button>

          <div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onOpenProfile(post.user.username)}
                className="font-medium text-xs text-white hover:underline transition-colors"
              >
                @{post.user.username}
              </button>
              {post.user.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-zinc-300 fill-zinc-800" />}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
              <span>{post.timestamp}</span>
              {post.location && (
                <>
                  <span>·</span>
                  <span>{post.location}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowOptionsMenu((v) => !v)}
            aria-label="Más opciones"
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showOptionsMenu && (
            <>
              {/* Capa invisible: clic fuera cierra el menú */}
              <div className="fixed inset-0 z-20" onClick={() => setShowOptionsMenu(false)} />
              <div className="absolute right-0 top-9 z-30 w-44 rounded-xl bg-zinc-900 border border-white/10 shadow-2xl p-1 backdrop-blur-xl">
                <button
                  onClick={copyLink}
                  className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 rounded-lg transition-colors"
                >
                  Copiar enlace
                </button>
                <button
                  onClick={() => {
                    onOpenShare(post);
                    setShowOptionsMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 rounded-lg transition-colors"
                >
                  Compartir
                </button>
                {isOwner ? (
                  <button
                    onClick={() => {
                      setShowOptionsMenu(false);
                      onDelete?.(post);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                  >
                    Eliminar
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowOptionsMenu(false);
                      onReport?.(post);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                  >
                    Reportar
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div
        onClick={handleMediaTap}
        className="relative w-full aspect-[4/3] sm:aspect-[16/10] rounded-xl overflow-hidden cursor-pointer group bg-black border border-white/5 select-none"
      >
        <img
          src={currentMediaUrl}
          alt={post.caption || `Publicación de @${post.user.username}`}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.01]"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

        {showHeartAnim && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <Heart className="w-20 h-20 text-rose-500 fill-rose-500 drop-shadow-xl animate-heart-burst" />
          </div>
        )}

        {copied && (
          <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full bg-black/70 border border-white/10 text-[11px] text-white">
            Enlace copiado
          </div>
        )}

        {post.videoDuration && (
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlayClip?.(post);
              }}
              className="px-2.5 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md flex items-center gap-1.5 text-xs text-white hover:bg-black/80 transition-colors"
            >
              <Play className="w-3 h-3 fill-white text-white" />
              <span className="font-mono text-[10px]">{post.videoDuration}</span>
            </button>
          </div>
        )}

        {post.mediaUrls.length > 1 && activeMediaIndex > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              soundEngine.playTap();
              setActiveMediaIndex((prev) => Math.max(0, prev - 1));
            }}
            aria-label="Ver imagen anterior"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-90 shadow-md cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {post.mediaUrls.length > 1 && activeMediaIndex < post.mediaUrls.length - 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              soundEngine.playTap();
              setActiveMediaIndex((prev) => Math.min(post.mediaUrls.length - 1, prev + 1));
            }}
            aria-label="Ver imagen siguiente"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-90 shadow-md cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {post.mediaUrls.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 pointer-events-none">
            {post.mediaUrls.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  activeMediaIndex === idx ? 'w-4 bg-white shadow-sm' : 'w-1.5 bg-white/40'
                }`}
              />
            ))}
          </div>
        )}

        {post.mediaUrls.length > 1 && (
          <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md flex items-center gap-1 text-[10px] text-zinc-300">
            <Layers className="w-3 h-3" />
            <span>
              {activeMediaIndex + 1}/{post.mediaUrls.length}
            </span>
          </div>
        )}
      </div>

      {post.mediaUrls.length > 1 && (
        <div className="grid grid-cols-4 gap-2 mt-2">
          {post.mediaUrls.slice(0, 3).map((url, idx) => (
            <button
              key={idx}
              onClick={() => {
                soundEngine.playTap();
                setActiveMediaIndex(idx);
              }}
              className={`relative aspect-square rounded-lg overflow-hidden border transition-all ${
                activeMediaIndex === idx ? 'border-white ring-1 ring-white/50' : 'border-white/10 opacity-70 hover:opacity-100'
              }`}
            >
              <img src={url} alt={`Vista previa ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}

          {post.mediaUrls.length > 3 && (
            <button
              onClick={() => {
                soundEngine.playTap();
                setActiveMediaIndex(3);
              }}
              className="relative aspect-square rounded-lg overflow-hidden border border-white/10 bg-zinc-900 flex items-center justify-center hover:border-white/30 transition-colors"
            >
              <img src={post.mediaUrls[3]} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
              <span className="relative z-10 text-xs font-semibold text-white">+{post.mediaUrls.length - 3}</span>
            </button>
          )}
        </div>
      )}

      <div className="mt-3">
        <p className="text-xs text-zinc-200 leading-relaxed font-normal">{post.caption}</p>

        {post.soundTitle && (
          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-zinc-400">
            <Music className="w-3 h-3 text-zinc-500" />
            <span className="truncate">{post.soundTitle}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.06]">
        <div className="flex items-center gap-5">
          <button
            onClick={() => {
              soundEngine.playHeartLike();
              onLike(post.id);
            }}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
              post.isLiked ? 'text-rose-500' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span className="tabular-nums">{formatCount(post.likesCount)}</span>
          </button>

          <button
            onClick={() => {
              soundEngine.playTap();
              onOpenComments(post);
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="tabular-nums">{formatCount(post.commentsCount)}</span>
          </button>

          <button
            onClick={() => {
              soundEngine.playTap();
              onOpenShare(post);
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span className="tabular-nums">{formatCount(post.sharesCount)}</span>
          </button>
        </div>

        <button
          onClick={() => {
            soundEngine.playTap();
            onBookmark(post.id);
          }}
          className={`p-1 rounded-full transition-colors ${post.isBookmarked ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
          aria-label={post.isBookmarked ? 'Quitar guardado' : 'Guardar publicación'}
        >
          <Bookmark className={`w-4 h-4 ${post.isBookmarked ? 'fill-white' : ''}`} />
        </button>
      </div>

      {post.commentsCount > 0 && (
        <button
          onClick={() => onOpenComments(post)}
          className="mt-2 text-[11px] text-zinc-500 hover:text-zinc-300 font-medium transition-colors"
        >
          Ver los {post.commentsCount} comentarios
        </button>
      )}
    </article>
  );
};

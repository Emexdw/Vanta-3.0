import React, { useEffect, useRef, useState } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, Play, Music, Plus, Check, Volume2, VolumeX } from 'lucide-react';
import { ReelClip, Post } from '../types';
import { soundEngine } from '../utils/audioSynth';
import { formatCount } from '../utils/format';
import { clipToPost } from '../utils/clips';

interface TikTokReelViewProps {
  clips: ReelClip[];
  suspended?: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  isFollowing: (userId: string) => boolean;
  onToggleLike: (clipId: string) => void;
  onToggleBookmark: (clipId: string) => void;
  onToggleFollow: (userId: string) => void;
  onOpenComments: (post: Post) => void;
  onOpenShare: (post: Post) => void;
  onOpenProfile: (username: string) => void;
  onViewClip?: (clipId: string) => void;
}

const DOUBLE_TAP_DELAY = 280;

export const TikTokReelView: React.FC<TikTokReelViewProps> = ({
  clips,
  suspended = false,
  isMuted,
  onToggleMute,
  isFollowing,
  onToggleLike,
  onToggleBookmark,
  onToggleFollow,
  onOpenComments,
  onOpenShare,
  onOpenProfile,
  onViewClip
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const lastTapRef = useRef(0);
  const tapTimerRef = useRef<number | null>(null);
  const badgeTimerRef = useRef<number | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [progress, setProgress] = useState(0); // solo el clip activo: evita re-renderizar toda la lista
  const [muteBadge, setMuteBadge] = useState<string | null>(null);
  const [heartBurstId, setHeartBurstId] = useState<string | null>(null);
  const [videoLoadError, setVideoLoadError] = useState<Record<string, boolean>>({});

  const activeSound = clips[activeIndex]?.soundTitle;
  const activeClipId = clips[activeIndex]?.id;

  // Cuenta una reproducción cuando el clip pasa a ser el activo
  useEffect(() => {
    if (activeClipId) onViewClip?.(activeClipId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClipId]);

  useEffect(() => {
    return () => {
      if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
      if (badgeTimerRef.current) window.clearTimeout(badgeTimerRef.current);
    };
  }, []);

  // Al cambiar de clip: pausa y rebobina los demás, reinicia estado. (Solo aquí se hace currentTime = 0)
  useEffect(() => {
    videoRefs.current.forEach((video, idx) => {
      if (video && idx !== activeIndex) {
        video.pause();
        video.currentTime = 0;
      }
    });
    setProgress(0);
    setIsBuffering(false);
    setIsPaused(false);
  }, [activeIndex]);

  // Pausar al ocultar la pestaña o cuando el reproductor sale de la pantalla.
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const updateVisibility = (inViewport: boolean) => setIsVisible(inViewport && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => updateVisibility(entry.isIntersecting), { threshold: 0.25 });
    observer.observe(node);
    const onVisibilityChange = () => {
      const rect = node.getBoundingClientRect();
      updateVisibility(rect.bottom > 0 && rect.top < window.innerHeight);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const seekActive = (percentage: number) => {
    const video = videoRefs.current[activeIndex];
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const bounded = Math.max(0, Math.min(100, percentage));
    video.currentTime = video.duration * bounded / 100;
    setProgress(bounded);
  };

  // Reproducir / pausar sin reiniciar el video
  useEffect(() => {
    const video = videoRefs.current[activeIndex];
    if (!video) return;
    if (isPaused || !isVisible || suspended) {
      video.pause();
    } else {
      let cancelled = false;
      video.play().catch(() => {
        if (cancelled) return;
        // El navegador bloqueó el autoplay con sonido: reintenta en silencio
        video.muted = true;
        video.play().catch(() => {});
      });
      return () => { cancelled = true; video.pause(); };
    }
  }, [activeIndex, isPaused, isVisible, suspended, clips]);

  // Mute: React no actualiza el atributo `muted` después del montaje, hay que hacerlo a mano
  useEffect(() => {
    videoRefs.current.forEach((video) => {
      if (video) video.muted = isMuted;
    });
  }, [isMuted, activeIndex]);

  useEffect(() => {
    if (activeSound && !isPaused && isVisible && !isMuted && !suspended) {
      soundEngine.startAmbientLoop(activeSound);
    } else {
      soundEngine.stopAmbientLoop();
    }
    return () => soundEngine.stopAmbientLoop();
  }, [activeSound, isPaused, isVisible, isMuted, suspended]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container || container.clientHeight === 0) return;
    const newIndex = Math.round(container.scrollTop / container.clientHeight);
    if (newIndex !== activeIndex && newIndex >= 0 && newIndex < clips.length) {
      setActiveIndex(newIndex);
      soundEngine.playTap();
    }
  };

  const burstHeart = (clipId: string) => {
    soundEngine.playHeartLike();
    setHeartBurstId(clipId);
    window.setTimeout(() => setHeartBurstId((cur) => (cur === clipId ? null : cur)), 800);
  };

  const handleVideoTap = (clip: ReelClip) => {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (tapTimerRef.current) {
        window.clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
      }
      lastTapRef.current = 0;
      if (!clip.isLiked) onToggleLike(clip.id);
      burstHeart(clip.id);
      return;
    }
    lastTapRef.current = now;
    tapTimerRef.current = window.setTimeout(() => {
      tapTimerRef.current = null;
      soundEngine.playTap();
      setIsPaused((prev) => !prev);
    }, DOUBLE_TAP_DELAY);
  };

  const handleToggleMute = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    soundEngine.playTap();
    setMuteBadge(isMuted ? 'Audio activado' : 'Silenciado'); // isMuted es el valor actual; el nuevo es el opuesto
    onToggleMute();
    if (badgeTimerRef.current) window.clearTimeout(badgeTimerRef.current);
    badgeTimerRef.current = window.setTimeout(() => setMuteBadge(null), 1200);
  };

  const handleLike = (clip: ReelClip) => {
    onToggleLike(clip.id);
    soundEngine.playHeartLike();
    if (!clip.isLiked) burstHeart(clip.id);
  };

  const iconButton = 'w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10';

  return (
    <div className="relative w-full h-[calc(100dvh-170px)] sm:h-[84vh] max-w-md mx-auto rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl select-none">
      {muteBadge && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-zinc-900/90 backdrop-blur-md border border-white/10 text-white text-xs font-medium flex items-center gap-2 shadow-2xl animate-fade-in pointer-events-none">
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-zinc-400" /> : <Volume2 className="w-3.5 h-3.5 text-white" />}
          <span>{muteBadge}</span>
        </div>
      )}

      <button
        onClick={handleToggleMute}
        aria-label={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
        className="absolute top-4 left-4 z-40 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 border border-white/15 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-md"
      >
        {isMuted ? <VolumeX className="w-4 h-4 text-zinc-400" /> : <Volume2 className="w-4 h-4 text-white" />}
      </button>

      {isBuffering && !isPaused && isVisible && (
        <div role="status" aria-label="Cargando video" className="absolute top-5 left-1/2 -translate-x-1/2 z-40 text-xs text-white bg-black/60 px-3 py-1.5 rounded-full">
          Cargando…
        </div>
      )}

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar scroll-smooth"
      >
        {clips.map((clip, index) => {
          const isActive = index === activeIndex;
          const isNear = Math.abs(index - activeIndex) <= 1; // solo carga video del clip actual y vecinos
          const hasError = videoLoadError[clip.id];
          const following = isFollowing(clip.userId);
          const scaleClass = isActive && !isPaused ? 'scale-[1.02]' : 'scale-100';

          return (
            <div
              key={clip.id}
              className="relative w-full h-full snap-start snap-always flex-shrink-0 overflow-hidden bg-black flex items-center justify-center"
            >
              <div
                onClick={() => handleVideoTap(clip)}
                className="relative w-full h-full cursor-pointer flex items-center justify-center overflow-hidden"
              >
                {!hasError && isNear ? (
                  <video
                    ref={(el) => {
                      videoRefs.current[index] = el;
                    }}
                    src={clip.videoUrl}
                    poster={clip.posterUrl}
                    playsInline
                    loop
                    preload={isActive ? 'auto' : 'metadata'}
                    muted={isMuted}
                    onWaiting={() => { if (isActive) setIsBuffering(true); }}
                    onPlaying={() => { if (isActive) setIsBuffering(false); }}
                    onCanPlay={() => { if (isActive) setIsBuffering(false); }}
                    onTimeUpdate={(e) => {
                      if (!isActive) return;
                      const vid = e.currentTarget;
                      if (vid.duration) setProgress((vid.currentTime / vid.duration) * 100);
                    }}
                    onError={() => {
                      if (isActive) setIsBuffering(false);
                      setVideoLoadError((prev) => ({ ...prev, [clip.id]: true }));
                    }}
                    className={`w-full h-full object-cover transition-transform duration-700 ${scaleClass}`}
                  />
                ) : (
                  <img
                    src={clip.posterUrl}
                    alt={clip.caption}
                    draggable={false}
                    className={`w-full h-full object-cover transition-transform duration-700 ${scaleClass}`}
                  />
                )}

                {isActive && hasError && (
                  <div role="alert" className="absolute inset-0 flex items-center justify-center text-center text-sm text-white bg-black/60 px-8">
                    No se pudo reproducir este clip.
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80 pointer-events-none" />

                {isActive && isPaused && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                    <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/15 animate-scale-in">
                      <Play className="w-7 h-7 fill-white ml-1 text-white" />
                    </div>
                  </div>
                )}

                {heartBurstId === clip.id && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                    <Heart className="w-24 h-24 text-rose-500 fill-rose-500 drop-shadow-2xl animate-heart-burst" />
                  </div>
                )}
              </div>

              <div className="absolute right-3 bottom-16 z-30 flex flex-col items-center gap-4">
                <div className="relative mb-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenProfile(clip.user.username);
                    }}
                    aria-label={`Ver perfil de ${clip.user.username}`}
                    className="w-10 h-10 rounded-full p-0.5 border border-white/20 bg-black cursor-pointer hover:scale-105 transition-transform"
                  >
                    <img src={clip.user.avatar} alt={clip.user.username} className="w-full h-full rounded-full object-cover" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      soundEngine.playPublish();
                      onToggleFollow(clip.userId);
                    }}
                    aria-label={following ? 'Dejar de seguir' : 'Seguir'}
                    className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                      following ? 'bg-zinc-700 text-white' : 'bg-white text-black hover:scale-110 shadow-sm'
                    }`}
                  >
                    {following ? <Check className="w-2.5 h-2.5" /> : <Plus className="w-3 h-3 stroke-[3px]" />}
                  </button>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLike(clip);
                  }}
                  aria-label="Me gusta"
                  className="flex flex-col items-center group cursor-pointer"
                >
                  <div className={`${iconButton} group-active:scale-125 transition-transform`}>
                    <Heart className={`w-5 h-5 transition-colors ${clip.isLiked ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
                  </div>
                  <span className="text-[11px] font-medium text-white mt-1 tabular-nums drop-shadow">
                    {formatCount(clip.likesCount)}
                  </span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    soundEngine.playTap();
                    onOpenComments(clipToPost(clip));
                  }}
                  aria-label="Comentarios"
                  className="flex flex-col items-center group cursor-pointer"
                >
                  <div className={`${iconButton} group-active:scale-110 transition-transform`}>
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[11px] font-medium text-white mt-1 tabular-nums drop-shadow">
                    {formatCount(clip.commentsCount)}
                  </span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    soundEngine.playTap();
                    onToggleBookmark(clip.id);
                  }}
                  aria-label={clip.isBookmarked ? 'Quitar guardado' : 'Guardar'}
                  className="flex flex-col items-center group cursor-pointer"
                >
                  <div className={`${iconButton} group-active:scale-110 transition-transform`}>
                    <Bookmark className={`w-5 h-5 ${clip.isBookmarked ? 'fill-white text-white' : 'text-white'}`} />
                  </div>
                  <span className="text-[11px] font-medium text-white mt-1 drop-shadow">
                    {clip.isBookmarked ? 'Guardado' : 'Guardar'}
                  </span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    soundEngine.playTap();
                    onOpenShare(clipToPost(clip));
                  }}
                  aria-label="Compartir"
                  className="flex flex-col items-center group cursor-pointer"
                >
                  <div className={`${iconButton} group-active:scale-110 transition-transform`}>
                    <Share2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[11px] font-medium text-white mt-1 tabular-nums drop-shadow">
                    {formatCount(clip.sharesCount)}
                  </span>
                </button>

                <button
                  onClick={handleToggleMute}
                  aria-label={isMuted ? 'Activar audio' : 'Silenciar audio'}
                  className="relative mt-1 cursor-pointer"
                >
                  <div
                    className={`w-9 h-9 rounded-full bg-zinc-900 border border-zinc-700 p-1 flex items-center justify-center shadow-lg ${
                      isActive && !isPaused && !isMuted ? 'animate-spin-slow' : ''
                    }`}
                  >
                    <img src={clip.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  </div>
                  {isMuted && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-zinc-800 border border-zinc-600 text-[8px] text-zinc-300 flex items-center justify-center">
                      ✕
                    </span>
                  )}
                </button>
              </div>

              <div className="absolute bottom-5 left-4 right-16 z-30 pointer-events-auto">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenProfile(clip.user.username);
                    }}
                    className="font-semibold text-white text-sm hover:underline transition-colors drop-shadow"
                  >
                    @{clip.user.username}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      soundEngine.playPublish();
                      onToggleFollow(clip.userId);
                    }}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                      following
                        ? 'bg-white/5 text-zinc-300 border-white/10'
                        : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                    }`}
                  >
                    {following ? 'Siguiendo' : 'Seguir'}
                  </button>
                </div>

                <p className="text-xs text-zinc-100 line-clamp-2 leading-relaxed drop-shadow mb-2">{clip.caption}</p>

                <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-medium">
                  <Music className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                  <span className="text-[11px] truncate">
                    {clip.soundTitle} · {clip.soundArtist}
                  </span>
                </div>
              </div>

              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 z-40 h-5 flex items-end group" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={0.1}
                    value={progress}
                    onChange={(e) => seekActive(Number(e.target.value))}
                    aria-label="Progreso del video"
                    className="w-full h-2 accent-white cursor-pointer bg-white/20"
                    style={{ touchAction: 'none' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

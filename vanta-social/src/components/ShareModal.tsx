import React, { useState } from 'react';
import { X, Link2, Share, MessageCircle, Send } from 'lucide-react';
import { Post } from '../types';
import { soundEngine } from '../utils/audioSynth';
import { useModalBehavior } from '../hooks/useModalBehavior';

interface ShareModalProps {
  post: Post;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ post, onClose }) => {
  const [toast, setToast] = useState<string | null>(null);
  useModalBehavior(onClose);

  // App.tsx abre el contenido cuando alguien entra con ?p=ID
  const link = `${window.location.origin}/?p=${post.id}`;
  const message = `Mirá esto en Vanta: ${post.caption.slice(0, 80)}`;
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const flash = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(null), 2000);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      soundEngine.playTap();
      flash('Enlace copiado');
    } catch {
      flash('No se pudo copiar. Copialo manualmente.');
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: `@${post.user.username} en Vanta`, text: post.caption, url: link });
    } catch {
      /* la persona canceló */
    }
  };

  const open = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');
  const btn =
    'flex flex-col items-center gap-1.5 py-3 rounded-xl bg-zinc-900 border border-white/10 text-[11px] text-zinc-200 hover:bg-zinc-800 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Compartir"
        className="relative w-full max-w-md bg-[#111115] border border-white/10 rounded-t-3xl sm:rounded-3xl p-4 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Compartir</h2>
          <button onClick={onClose} aria-label="Cerrar" className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {toast && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-zinc-800 border border-white/10 text-[11px] text-white animate-fade-in">
            {toast}
          </div>
        )}

        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900/70 border border-white/[0.06] mb-4">
          <img src={post.mediaUrls[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-white">@{post.user.username}</p>
            <p className="text-[11px] text-zinc-400 truncate">{post.caption}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button onClick={copyLink} className={btn}>
            <Link2 className="w-5 h-5" />
            Copiar enlace
          </button>
          <button onClick={() => open(`https://wa.me/?text=${encodeURIComponent(`${message} ${link}`)}`)} className={btn}>
            <MessageCircle className="w-5 h-5" />
            WhatsApp
          </button>
          <button onClick={() => open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(message)}`)} className={btn}>
            <Send className="w-5 h-5" />
            Telegram
          </button>
        </div>

        {canNativeShare && (
          <button onClick={nativeShare} className="w-full mt-2 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-xs font-medium text-zinc-200 flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors">
            <Share className="w-4 h-4" />
            Más opciones
          </button>
        )}
      </div>
    </div>
  );
};

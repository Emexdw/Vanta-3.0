import React, { useEffect, useRef, useState } from 'react';
import { X, Send, Heart, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Comment, Post, User } from '../types';
import { soundEngine } from '../utils/audioSynth';
import { useModalBehavior } from '../hooks/useModalBehavior';
import { formatCount } from '../utils/format';

interface CommentDrawerProps {
  post: Post;
  comments: Comment[];
  loading: boolean;
  currentUser: User;
  onClose: () => void;
  onAddComment: (postId: string, text: string) => Promise<void>;
  onToggleCommentLike: (commentId: string) => void;
  onOpenProfile: (username: string) => void;
}

export const CommentDrawer: React.FC<CommentDrawerProps> = ({
  post,
  comments,
  loading,
  currentUser,
  onClose,
  onAddComment,
  onToggleCommentLike,
  onOpenProfile
}) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  useModalBehavior(onClose);

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [comments.length]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = text.trim();
    if (!clean || sending) return;
    setSending(true);
    try {
      await onAddComment(post.id, clean);
      soundEngine.playPublish();
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Comentarios"
        className="w-full max-w-md h-[78vh] bg-[#111115] border-t border-x border-white/10 rounded-t-3xl flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/[0.08]">
          <div>
            <h2 className="text-sm font-semibold text-white">Comentarios</h2>
            <p className="text-[11px] text-zinc-500">{formatCount(post.commentsCount)} en total</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar comentarios" className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto no-scrollbar px-4 py-3 space-y-4">
          {loading ? (
            <p className="text-center text-xs text-zinc-500 py-10">Cargando comentarios...</p>
          ) : comments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-1">
              <p className="text-sm text-zinc-300 font-medium">Todavía no hay comentarios</p>
              <p className="text-xs text-zinc-500">Escribí el primero.</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-3">
                <button onClick={() => onOpenProfile(comment.username)} className="shrink-0">
                  <img src={comment.userAvatar} alt={comment.username} className="w-8 h-8 rounded-full object-cover" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button onClick={() => onOpenProfile(comment.username)} className="font-semibold text-white hover:underline">
                      @{comment.username}
                    </button>
                    {comment.userId === post.userId && <CheckCircle2 className="w-3 h-3 text-zinc-400" aria-label="Autor" />}
                    <span className="text-zinc-500">{comment.timestamp}</span>
                  </div>
                  <p className="text-xs text-zinc-200 leading-relaxed mt-0.5 break-words">{comment.text}</p>
                </div>
                <button
                  onClick={() => {
                    soundEngine.playHeartLike();
                    onToggleCommentLike(comment.id);
                  }}
                  aria-label="Me gusta en comentario"
                  className="flex flex-col items-center gap-0.5 shrink-0 text-zinc-500 hover:text-white transition-colors"
                >
                  <Heart className={`w-4 h-4 ${comment.isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span className="text-[10px] tabular-nums">{formatCount(comment.likesCount)}</span>
                </button>
              </div>
            ))
          )}
        </div>

        <form onSubmit={submit} className="flex items-center gap-2 p-3 border-t border-white/[0.08] bg-zinc-950/90">
          <img src={currentUser.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={300}
            placeholder="Agregá un comentario..."
            className="flex-1 bg-zinc-900 border border-white/10 rounded-full px-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 transition-colors"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            aria-label="Publicar comentario"
            className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-200 active:scale-95 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </motion.div>
    </div>
  );
};

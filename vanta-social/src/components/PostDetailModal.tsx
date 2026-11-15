import React from 'react';
import { X } from 'lucide-react';
import { Post } from '../types';
import { PostCard } from './PostCard';
import { useModalBehavior } from '../hooks/useModalBehavior';

interface PostDetailModalProps extends Omit<React.ComponentProps<typeof PostCard>, 'post'> {
  post: Post;
  onClose: () => void;
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({ post, onClose, ...cardProps }) => {
  useModalBehavior(onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md max-h-[94vh] overflow-y-auto no-scrollbar">
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-5 right-5 z-40 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
        >
          <X className="w-4 h-4" />
        </button>
        <PostCard post={post} {...cardProps} />
      </div>
    </div>
  );
};

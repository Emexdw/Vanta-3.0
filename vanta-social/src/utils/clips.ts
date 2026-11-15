import { Post, ReelClip } from '../types';
import { formatCount } from './format';

export function postToClip(post: Post): ReelClip {
  return {
    id: post.id,
    userId: post.userId,
    user: post.user,
    videoUrl: post.videoUrl ?? '',
    posterUrl: post.mediaUrls[0] ?? '',
    caption: post.caption,
    tags: post.tags,
    soundTitle: post.soundTitle ?? 'Sonido original',
    soundArtist: post.soundArtist ?? post.user.displayName,
    likesCount: post.likesCount,
    isLiked: post.isLiked,
    commentsCount: post.commentsCount,
    sharesCount: post.sharesCount,
    isBookmarked: post.isBookmarked,
    duration: post.videoDuration ?? '',
    viewsCount: formatCount(post.viewsCount ?? 0)
  };
}

// Adapta un clip a Post para reutilizar comentarios y compartir.
export function clipToPost(clip: ReelClip): Post {
  return {
    id: clip.id,
    userId: clip.userId,
    user: clip.user,
    kind: 'clip',
    timestamp: '',
    createdAt: '',
    mediaUrls: [clip.posterUrl],
    videoUrl: clip.videoUrl,
    mediaType: 'video',
    videoDuration: clip.duration,
    caption: clip.caption,
    tags: clip.tags,
    likesCount: clip.likesCount,
    isLiked: clip.isLiked,
    commentsCount: clip.commentsCount,
    sharesCount: clip.sharesCount,
    isBookmarked: clip.isBookmarked,
    soundTitle: clip.soundTitle,
    soundArtist: clip.soundArtist
  };
}

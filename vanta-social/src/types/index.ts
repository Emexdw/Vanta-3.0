export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  isVerified: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  bio: string;
  location?: string;
  bannerUrl?: string;
  themeColor?: string;
}

export interface Story {
  id: string;
  userId: string;
  user: User;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  duration: string;
  timestamp: string;
  hasViewed: boolean;
  caption?: string;
  soundTitle?: string;
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  text: string;
  timestamp: string;
  likesCount: number;
  isLiked?: boolean;
}

// Publicaciones y clips comparten forma. En un clip, mediaUrls[0] es la miniatura y videoUrl el video.
export interface Post {
  id: string;
  userId: string;
  user: User;
  kind: 'post' | 'clip';
  location?: string;
  timestamp: string;
  createdAt: string;
  mediaUrls: string[];
  videoUrl?: string;
  mediaType: 'image' | 'video' | 'gallery';
  videoDuration?: string;
  caption: string;
  tags: string[];
  likesCount: number;
  isLiked: boolean;
  commentsCount: number;
  sharesCount: number;
  isBookmarked: boolean;
  soundTitle?: string;
  soundArtist?: string;
  viewsCount?: number;
}

export interface ReelClip {
  id: string;
  userId: string;
  user: User;
  videoUrl: string;
  posterUrl: string;
  caption: string;
  tags: string[];
  soundTitle: string;
  soundArtist: string;
  likesCount: number;
  isLiked: boolean;
  commentsCount: number;
  sharesCount: number;
  isBookmarked: boolean;
  duration: string;
  viewsCount: string;
}

export interface NotificationItem {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention';
  user: User;
  text: string;
  timestamp: string;
  mediaThumbnail?: string;
  postId?: string;
  isRead: boolean;
}

export interface ActivityMetric {
  id: string;
  label: string;
  value: string;
  icon: 'heart' | 'comment' | 'users' | 'views';
}

export interface TrendingItem {
  id: string;
  tag: string;
  views: string;
  imageUrl: string;
}

export type ActiveTab = 'inicio' | 'explorar' | 'crear' | 'actividad' | 'perfil';
export type FeedMode = 'feed' | 'clips';

export interface Conversation {
  id: string;
  other: User;
  lastBody: string;
  lastFromMe: boolean;
  lastAt: string;
  unread: number;
  isRequest: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

// Chat-related types and interfaces

export interface ChatRoom {
  id: number;
  roomId: string;
  otherUserId: number;
  otherUserName: string;
  otherUserRole: string;
  otherUserProfileImage?: string | null;
  projectId?: number | null;
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  chatRoomId: number;
  senderId: number;
  senderName: string;
  receiverId: number;
  receiverName: string;
  content: string;
  fileUrl?: string | null;
  fileType?: string | null;
  fileName?: string | null;
  duration?: number | null; // For voice notes in seconds
  isRead?: boolean;
  readAt?: string | null;
  createdAt: string;
  isMine?: boolean; // Calculated on client
}

export interface SendMessageRequest {
  receiverId: number;
  content: string;
  file?: {
    uri: string;
    type: string;
    name: string;
  };
}

export interface SendMessageResponse {
  id: number;
  chatRoomId: number;
  senderId: number;
  senderName: string;
  receiverId: number;
  receiverName: string;
  content: string;
  fileUrl?: string | null;
  fileType?: string | null;
  createdAt: string;
}


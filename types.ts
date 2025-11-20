
export enum UserRole {
  HOST = 'HOST',
  VIEWER = 'VIEWER',
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  isLocal: boolean;
  color?: string;
}

export interface Reaction {
  emoji: string;
  count: number;
  userIds: string[];
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userColor?: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
  role?: UserRole;
  type?: 'text' | 'gif';
  
  // New Features
  replyTo?: {
    id: string;
    userName: string;
    text: string;
  };
  reactions?: Record<string, Reaction>; // Keyed by emoji char
}

export enum VideoSourceType {
  IDLE = 'IDLE',
  SCREENSHARE = 'SCREENSHARE',
}

export interface VideoState {
  sourceType: VideoSourceType;
  isStreaming: boolean;
  lastUpdated: number;
  isHostPaused?: boolean;
}

// WebRTC Signaling
export interface SignalMessage {
  type: 'offer' | 'answer' | 'candidate' | 'join_request' | 'host_ready';
  target?: string;
  sender: string;
  data?: any;
}

export interface PartyPlan {
  theme: string;
  suggestedActivities: string[];
  snackIdeas: string[];
}

export interface StreamAction {
  type: 'play' | 'pause';
  timestamp: number;
}

// --- DATABASE SCHEMAS ---

export interface Room {
  _id: string;
  code: string;
  hostId: string;
  users: User[];
  isActive: boolean;
  createdAt: number;
  settings: {
    themeColor: string;
  };
}

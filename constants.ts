import { User, UserRole } from './types';

export const DEFAULT_VIDEO_URL = "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

export const MOCK_USERS: User[] = [
  {
    id: 'user-1',
    name: 'Host (You)',
    role: UserRole.HOST,
    avatar: 'https://picsum.photos/seed/host/50/50',
    isLocal: true,
  },
  {
    id: 'user-2',
    name: 'Alex',
    role: UserRole.VIEWER,
    avatar: 'https://picsum.photos/seed/alex/50/50',
    isLocal: false,
  },
  {
    id: 'user-3',
    name: 'Sam',
    role: UserRole.VIEWER,
    avatar: 'https://picsum.photos/seed/sam/50/50',
    isLocal: false,
  }
];

export const INITIAL_CHAT_MESSAGES = [
  {
    id: 'msg-0',
    userId: 'system',
    userName: 'System',
    text: 'Welcome to Binge Pawry! You are the host.',
    timestamp: Date.now(),
    isSystem: true,
  }
];
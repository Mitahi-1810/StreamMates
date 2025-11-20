
// This service uses BroadcastChannel to allow multiple tabs to communicate
// This enables testing WebRTC signaling locally without a real backend server.

type Listener = (data: any) => void;

class MockSocketService {
  private channel: BroadcastChannel;
  private listeners: Map<string, Listener[]> = new Map();
  private userId: string = '';
  private roomId: string | null = null;

  constructor() {
    // Global channel for the domain
    this.channel = new BroadcastChannel('binge_pawry_global');
    
    this.channel.onmessage = (event) => {
      const { roomId, event: eventName, data } = event.data;
      
      // Only process messages for the current room
      if (this.roomId && roomId === this.roomId) {
          this.trigger(eventName, data);
      }
    };
  }

  // New Method: Check if a host is active in the given room
  checkRoomAvailability(roomId: string): Promise<boolean> {
    return new Promise((resolve) => {
        const listener = (event: MessageEvent) => {
            const msg = event.data;
            if (msg.roomId === roomId && msg.event === 'room:available') {
                this.channel.removeEventListener('message', listener);
                clearTimeout(timeout);
                resolve(true);
            }
        };
        
        // We need a raw listener because we aren't connected to the room yet
        this.channel.addEventListener('message', listener);

        // Broadcast check
        this.channel.postMessage({ 
            roomId: roomId, 
            event: 'room:check', 
            data: { senderId: 'temp-checker' } 
        });

        const timeout = setTimeout(() => {
            this.channel.removeEventListener('message', listener);
            resolve(false);
        }, 2000);
    });
  }

  connect(userId: string, roomId: string) {
    this.userId = userId;
    this.roomId = roomId;
    console.log(`[Socket] Connected as ${userId} in Room ${roomId}`);
    
    // Simulate network delay for realism
    setTimeout(() => {
        this.emit('user:joined', { userId });
    }, 300);
  }

  disconnect() {
    if (this.roomId) {
        this.emit('user:left', { userId: this.userId });
    }
    this.roomId = null;
    this.userId = '';
    this.listeners.clear();
  }

  // Emit event to other tabs in the same room
  emit(event: string, data: any) {
    if (!this.roomId) return;

    this.channel.postMessage({ 
        roomId: this.roomId, 
        event, 
        data 
    });
  }

  // Register listener
  on(event: string, callback: Listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  off(event: string, callback: Listener) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      this.listeners.set(event, listeners.filter(cb => cb !== callback));
    }
  }

  // Trigger local listeners
  private trigger(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }
}

export const socketService = new MockSocketService();

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
      
      // --- SYSTEM HANDLERS ---
      
      // Ping/Pong for Room Discovery (Allow joining only if Host is online)
      if (eventName === 'system:ping') {
          // If I am connected to this room (likely as Host or existing member), confirm it exists
          if (this.roomId === roomId) {
              this.channel.postMessage({ 
                  roomId, 
                  event: 'system:pong', 
                  data: { responderId: this.userId } 
              });
          }
          return;
      }

      // --- APP HANDLERS ---

      // Only process messages for the current room
      if (this.roomId && roomId === this.roomId) {
          this.trigger(eventName, data);
      }
    };
  }

  // Check if a room exists by pinging it and waiting for a response
  checkRoom(roomId: string): Promise<boolean> {
      return new Promise((resolve) => {
          let resolved = false;
          
          // Temporary listener for the pong
          const pongHandler = (ev: MessageEvent) => {
              const { roomId: rId, event } = ev.data;
              if (rId === roomId && event === 'system:pong') {
                  resolved = true;
                  this.channel.removeEventListener('message', pongHandler);
                  resolve(true);
              }
          };

          this.channel.addEventListener('message', pongHandler);
          
          // Send Ping
          this.channel.postMessage({ roomId, event: 'system:ping', data: {} });

          // Timeout after 2 seconds
          setTimeout(() => {
              if (!resolved) {
                  this.channel.removeEventListener('message', pongHandler);
                  resolve(false);
              }
          }, 1500);
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

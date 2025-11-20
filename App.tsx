import React, { useState, useEffect, useCallback, useRef } from 'react';
import { VideoState, VideoSourceType, ChatMessage, User, UserRole, SignalMessage, StreamAction, Reaction } from './types';
import VideoPlayer from './components/VideoPlayer';
import ChatPanel from './components/ChatPanel';
import Controls from './components/Controls';
import Lobby from './components/Lobby';
import { socketService } from './services/mockSocket';

const generateUserId = () => Math.random().toString(36).substring(2, 9);

const App: React.FC = () => {
  // --- App Mode ---
  const [inRoom, setInRoom] = useState(false);
  const [roomId, setRoomId] = useState<string>('');
  
  // --- Identity ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // --- State ---
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [videoState, setVideoState] = useState<VideoState>({
    sourceType: VideoSourceType.IDLE,
    isStreaming: false,
    lastUpdated: Date.now(),
    isHostPaused: false
  });
  
  // --- WebRTC State ---
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  // Refs for WebRTC to avoid closure staleness
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const currentUserRef = useRef<User | null>(null);

  // NEW: Ref for videoState to access current value in event listeners
  const videoStateRef = useRef<VideoState>(videoState);

  useEffect(() => {
    videoStateRef.current = videoState;
  }, [videoState]);

  useEffect(() => {
      if(currentUser) currentUserRef.current = currentUser;
  }, [currentUser]);

  // --- Room Logic ---

  const handleJoinRoom = async (name: string, code: string, isHost: boolean, avatar: string, color: string) => {
      // Viewers must check if room exists first
      if (!isHost) {
          try {
            const exists = await socketService.checkRoomAvailability(code);
            if (!exists) {
                alert("Room not found or Host is inactive! Please check the code.");
                return;
            }
          } catch (e) {
              console.error(e);
              alert("Failed to check room.");
              return;
          }
      }

      const userId = generateUserId();
      const user: User = {
          id: userId,
          name: name,
          role: isHost ? UserRole.HOST : UserRole.VIEWER,
          avatar: avatar,
          isLocal: true,
          color: color
      };

      setCurrentUser(user);
      setRoomId(code);
      setInRoom(true);
      setUsers([user]);
      setMessages([{
          id: 'sys-1',
          userId: 'system',
          userName: 'System',
          text: `Welcome to room ${code}!`,
          timestamp: Date.now(),
          isSystem: true
      }]);

      // Connect to socket room
      socketService.connect(userId, code);

      // Setup listeners
      socketService.on('user:joined', (data: { userId: string }) => {
         const newUser: User = {
             id: data.userId,
             name: `StreamMate ${data.userId.substring(0,3)}`,
             role: UserRole.VIEWER,
             avatar: `https://api.dicebear.com/9.x/bottts/svg?seed=${data.userId}`, // Fallback
             isLocal: false
         };
         
         setUsers(prev => {
             if (prev.find(u => u.id === newUser.id)) return prev;
             return [...prev, newUser];
         });

         // Announce logic
         if (currentUserRef.current?.role === UserRole.HOST && videoStateRef.current.isStreaming) {
             // Announce stream availability to new user
             socketService.emit('signal', {
                 type: 'host_ready',
                 sender: currentUserRef.current.id,
                 target: data.userId
             });
         }
      });

      // HOST LOGIC: Reply to room checks
      if (isHost) {
          socketService.on('room:check', () => {
              socketService.emit('room:available', { roomId: code });
          });
      }

      socketService.on('room:closed', () => {
          alert("The host has closed the room.");
          window.location.reload();
      });

      socketService.on('video:sync', (remoteState: Partial<VideoState>) => {
        setVideoState(prevState => {
            if (remoteState.sourceType === VideoSourceType.IDLE) {
                 // Stream ended
                 setRemoteStream(null);
            }
            return { ...prevState, ...remoteState, lastUpdated: Date.now() };
        });
      });
      
      // Handle Playback Controls
      socketService.on('stream:action', (action: StreamAction) => {
          if (action.type === 'pause') {
              setVideoState(prev => ({ ...prev, isHostPaused: true }));
          } else if (action.type === 'play') {
              setVideoState(prev => ({ ...prev, isHostPaused: false }));
          }
      });
  
      socketService.on('chat:message', (msg: ChatMessage) => {
        setMessages(prev => [...prev, msg]);
      });

      // Handle Reactions
      socketService.on('chat:reaction', (data: { msgId: string, emoji: string, userId: string }) => {
          setMessages(prevMessages => {
              return prevMessages.map(msg => {
                  if (msg.id !== data.msgId) return msg;

                  const reactions = { ...msg.reactions } || {};
                  const currentReaction = reactions[data.emoji] || { emoji: data.emoji, count: 0, userIds: [] };
                  
                  let newUserIds = [...currentReaction.userIds];
                  
                  // Toggle Logic: If user already reacted, remove them. Else add them.
                  if (newUserIds.includes(data.userId)) {
                      newUserIds = newUserIds.filter(id => id !== data.userId);
                  } else {
                      newUserIds.push(data.userId);
                  }

                  if (newUserIds.length === 0) {
                      delete reactions[data.emoji];
                  } else {
                      reactions[data.emoji] = {
                          emoji: data.emoji,
                          count: newUserIds.length,
                          userIds: newUserIds
                      };
                  }

                  return { ...msg, reactions };
              });
          });
      });
  
      socketService.on('signal', handleSignal);
  };

  const handleCloseRoom = () => {
      socketService.emit('room:closed', {});
      handleStopScreenShare();
      socketService.disconnect();
      setInRoom(false);
      setRoomId('');
      setUsers([]);
      setCurrentUser(null);
  };

  // --- WebRTC Signaling Logic ---
  
  const createPeerConnection = (targetUserId: string) => {
      const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      pc.onicecandidate = (event) => {
          if (event.candidate && currentUserRef.current) {
              socketService.emit('signal', {
                  type: 'candidate',
                  target: targetUserId,
                  sender: currentUserRef.current.id,
                  data: event.candidate
              });
          }
      };

      pc.ontrack = (event) => {
          console.log("Received Remote Track");
          setRemoteStream(event.streams[0]);
      };

      peerConnections.current.set(targetUserId, pc);
      return pc;
  };

  const handleSignal = async (msg: SignalMessage) => {
      if (!currentUserRef.current) return;
      if (msg.target && msg.target !== currentUserRef.current.id) return;

      const myId = currentUserRef.current.id;
      const senderId = msg.sender;

      try {
          switch (msg.type) {
              case 'host_ready':
                  if (currentUserRef.current.role === UserRole.VIEWER) {
                      socketService.emit('signal', {
                          type: 'join_request',
                          sender: myId,
                          target: senderId
                      });
                  }
                  break;

              case 'join_request':
                  if (currentUserRef.current.role === UserRole.HOST && localStreamRef.current) {
                      const pc = createPeerConnection(senderId);
                      localStreamRef.current.getTracks().forEach(track => {
                          pc.addTrack(track, localStreamRef.current!);
                      });
                      
                      const offer = await pc.createOffer();
                      await pc.setLocalDescription(offer);
                      
                      socketService.emit('signal', {
                          type: 'offer',
                          target: senderId,
                          sender: myId,
                          data: offer
                      });
                  }
                  break;

              case 'offer':
                  {
                    const pc = createPeerConnection(senderId);
                    await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    
                    socketService.emit('signal', {
                        type: 'answer',
                        target: senderId,
                        sender: myId,
                        data: answer
                    });
                  }
                  break;

              case 'answer':
                  {
                      const pc = peerConnections.current.get(senderId);
                      if (pc) {
                          await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
                      }
                  }
                  break;

              case 'candidate':
                  {
                      const pc = peerConnections.current.get(senderId);
                      if (pc) {
                          await pc.addIceCandidate(new RTCIceCandidate(msg.data));
                      }
                  }
                  break;
          }
      } catch (err) {
          console.error("WebRTC Error", err);
      }
  };

  // --- Host Actions ---

  const handleStartScreenShare = async () => {
      if (!currentUser) return;
      try {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
          setLocalStream(stream);
          localStreamRef.current = stream;

          stream.getVideoTracks()[0].onended = () => {
              handleStopScreenShare();
          };

          const newState = { sourceType: VideoSourceType.SCREENSHARE, isStreaming: true, isHostPaused: false };
          setVideoState(prev => ({ ...prev, ...newState }));
          socketService.emit('video:sync', newState);

          socketService.emit('signal', { type: 'host_ready', sender: currentUser.id });

      } catch (err) {
          console.error("Error sharing screen:", err);
      }
  };

  const handleStopScreenShare = () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      setLocalStream(null);
      localStreamRef.current = null;
      
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();

      const newState = { sourceType: VideoSourceType.IDLE, isStreaming: false, isHostPaused: false };
      setVideoState(prev => ({ ...prev, ...newState }));
      socketService.emit('video:sync', newState);
  };

  // Handle playback action from Host's VideoPlayer
  const handlePlaybackAction = (action: StreamAction) => {
      if (currentUser?.role === UserRole.HOST) {
          if (action.type === 'pause') {
              setVideoState(prev => ({ ...prev, isHostPaused: true }));
          } else {
              setVideoState(prev => ({ ...prev, isHostPaused: false }));
          }
          socketService.emit('stream:action', action);
      }
  };

  const handleSendMessage = useCallback((text: string, type: 'text' | 'gif' = 'text', replyToMsg?: ChatMessage) => {
    if (!currentUser) return;
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      userColor: currentUser.color,
      text,
      timestamp: Date.now(),
      type,
      replyTo: replyToMsg ? {
          id: replyToMsg.id,
          userName: replyToMsg.userName,
          text: replyToMsg.type === 'gif' ? 'GIF' : replyToMsg.text
      } : undefined
    };
    // Optimistic update
    setMessages(prev => [...prev, newMessage]);
    socketService.emit('chat:message', newMessage);
  }, [currentUser]);

  const handleReaction = useCallback((msgId: string, emoji: string) => {
      if (!currentUser) return;
      
      // Optimistic Update locally first
      setMessages(prevMessages => {
          return prevMessages.map(msg => {
              if (msg.id !== msgId) return msg;

              const reactions = { ...msg.reactions } || {};
              const currentReaction = reactions[emoji] || { emoji, count: 0, userIds: [] };
              
              let newUserIds = [...currentReaction.userIds];
              
              if (newUserIds.includes(currentUser.id)) {
                  newUserIds = newUserIds.filter(id => id !== currentUser.id);
              } else {
                  newUserIds.push(currentUser.id);
              }

              if (newUserIds.length === 0) {
                  delete reactions[emoji];
              } else {
                  reactions[emoji] = {
                      emoji,
                      count: newUserIds.length,
                      userIds: newUserIds
                  };
              }
              return { ...msg, reactions };
          });
      });

      // Then Emit to others
      socketService.emit('chat:reaction', { msgId, emoji, userId: currentUser.id });
  }, [currentUser]);

  // --- Render ---

  if (!inRoom || !currentUser) {
      return <Lobby onJoin={handleJoinRoom} />;
  }

  return (
    <div 
      className="h-[100dvh] bg-pawry-900 text-white flex flex-col font-sans bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-pawry-800 via-pawry-900 to-black overflow-hidden"
      style={{ '--theme-color': currentUser.color || '#7652d6' } as React.CSSProperties}
    >
      {/* Header - Compact */}
      <header className="h-12 md:h-16 border-b border-white/5 flex items-center justify-between px-4 bg-skin-500 shadow-lg shadow-skin-500/20 z-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-black text-xs md:text-sm backdrop-blur-md">
            SM
          </div>
          <div>
             <h1 className="text-md font-bold tracking-tight text-white leading-none">StreamMates</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <div className={`flex items-center gap-2 text-[10px] md:text-xs px-2 py-1 md:px-3 md:py-1.5 rounded-full font-bold border bg-black/20 border-white/10 backdrop-blur-sm text-white`}>
               <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${currentUser.role === UserRole.HOST ? 'bg-yellow-400' : 'bg-blue-400'} animate-pulse`}></div>
               {currentUser.role === UserRole.HOST ? 'HOST' : 'VIEWER'}
           </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0">
        
        {/* Left Column: Video + Controls */}
        <div className="w-full lg:flex-1 flex flex-col shrink-0 lg:shrink lg:h-full bg-black border-b lg:border-b-0 lg:border-r border-white/10">
            
            {/* Video Player Container - Constrained Height on Mobile */}
            <div className="w-full bg-black flex items-center justify-center shrink-0 relative max-h-[35vh] lg:max-h-none lg:h-auto lg:flex-1 aspect-video">
                <div className="w-full h-full lg:w-auto lg:aspect-video lg:max-h-full mx-auto">
                    <VideoPlayer 
                        videoState={videoState} 
                        isHost={currentUser.role === UserRole.HOST} 
                        stream={currentUser.role === UserRole.HOST ? localStream : remoteStream}
                        onPlaybackAction={handlePlaybackAction}
                    />
                </div>
            </div>

            {/* Controls Bar - Slim, Compact, No Padding */}
            {currentUser.role === UserRole.HOST && (
                <div className="shrink-0 w-full">
                    <Controls 
                        roomId={roomId}
                        onCloseRoom={handleCloseRoom}
                        onScreenShareStart={handleStartScreenShare}
                        onScreenShareStop={handleStopScreenShare}
                        currentSourceType={videoState.sourceType}
                        isStreaming={videoState.isStreaming}
                    />
                </div>
            )}
        </div>

        {/* Right Column: Chat - Grows to fill space */}
        <div className="flex-1 lg:flex-none lg:w-96 shrink-0 z-20 relative min-h-0 flex flex-col bg-pawry-900/50">
          <ChatPanel 
            messages={messages} 
            currentUser={currentUser} 
            users={users}
            onSendMessage={handleSendMessage} 
            onReact={handleReaction}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
import React, { useRef, useEffect, useState } from 'react';
import { VideoSourceType, VideoState, StreamAction } from '../types';
import { Volume2, VolumeX, Monitor, WifiOff, Radio, Maximize, Play, Pause, Rewind, FastForward, Zap } from 'lucide-react';

interface VideoPlayerProps {
  videoState: VideoState;
  isHost: boolean;
  stream: MediaStream | null; // For Screen Share
  onPlaybackAction?: (action: StreamAction) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoState, isHost, stream, onPlaybackAction }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(false);
  const [localPaused, setLocalPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);

  // Handle Stream Attachment
  useEffect(() => {
    if (videoState.sourceType === VideoSourceType.SCREENSHARE && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      if (isHost) {
          videoRef.current.muted = true;
          setMuted(true);
      } else {
          setMuted(false);
      }
      // Auto-play unless locally paused or host globally paused
      if (!localPaused && !videoState.isHostPaused) {
        videoRef.current.play().catch(e => console.log("Autoplay blocked", e));
      }
    }
  }, [stream, videoState.sourceType, isHost]);

  // Handle Host Global Pause
  useEffect(() => {
      if (videoRef.current) {
          if (videoState.isHostPaused) {
              videoRef.current.pause();
          } else if (!localPaused) {
              // Only resume if not locally paused by the user
              videoRef.current.play().catch(e => console.log("Resume blocked", e));
          }
      }
  }, [videoState.isHostPaused, localPaused]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setMuted(videoRef.current.muted);
    }
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handlePlayPause = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!videoRef.current) return;

      if (videoRef.current.paused) {
          // User wants to PLAY
          if (isHost) {
              // Host resumes global stream
              onPlaybackAction?.({ type: 'play', timestamp: Date.now() });
          } else {
              // Viewer resumes local playback
              setLocalPaused(false);
              videoRef.current.play();
          }
      } else {
          // User wants to PAUSE
          if (isHost) {
              // Host pauses global stream
              onPlaybackAction?.({ type: 'pause', timestamp: Date.now() });
          } else {
              // Viewer pauses locally
              setLocalPaused(true);
              videoRef.current.pause();
          }
      }
  };

  const handleSeek = (seconds: number) => {
      if (videoRef.current) {
          // Note: Seeking in a live WebRTC stream usually only works if the browser has buffered data.
          // If 'live', currentTime logic might vary. 
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime + seconds);
      }
  };

  const handleSync = () => {
      if (videoRef.current) {
          // To sync with live edge, we often just need to play.
          // Some browsers allow setting currentTime to infinity or buffered end.
          if (videoRef.current.buffered.length > 0) {
             videoRef.current.currentTime = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
          }
          setLocalPaused(false);
          videoRef.current.play();
      }
  };

  // --- RENDER STATES ---

  // 1. Waiting for Host
  if (videoState.sourceType !== VideoSourceType.SCREENSHARE) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black text-gray-500 rounded-3xl border border-white/10 aspect-video shadow-2xl overflow-hidden relative">
         {/* Decorative Background */}
         <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-pawry-900/20 via-black to-black"></div>
         
         <div className="z-10 flex flex-col items-center p-4 text-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/5">
                <WifiOff size={32} className="opacity-50" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Waiting for Broadcast</h2>
            <p className="text-sm text-gray-500">The host hasn't started sharing their screen yet.</p>
         </div>
      </div>
    );
  }

  // 2. Connection Placeholder
  if (videoState.sourceType === VideoSourceType.SCREENSHARE && !stream && !isHost) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white rounded-3xl border border-white/10 aspect-video shadow-2xl">
             <div className="bg-pawry-800 p-6 rounded-full mb-6 animate-pulse-slow ring-4 ring-pawry-900/50">
                <Radio size={48} className="text-skin-500" />
            </div>
            <h2 className="text-2xl font-bold">Connecting to Stream...</h2>
            <p className="text-gray-400 text-sm mt-2">Establishing secure peer connection</p>
        </div>
      );
  }

  const isPaused = videoState.isHostPaused || localPaused;

  // 3. Live Player
  return (
    <div 
        ref={containerRef} 
        className="relative group w-full h-full bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        // Remove autoPlay here to rely on useEffect logic for paused state
        onClick={handlePlayPause}
      />

      {/* Status Indicators */}
      <div className="absolute top-6 left-6 flex items-center gap-2 pointer-events-none">
         <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md ${isPaused ? 'bg-yellow-500/20 border-yellow-500/30' : 'bg-red-500/20 border-red-500/30'}`}>
             <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`}></div>
             <span className={`text-[10px] font-bold tracking-wider ${isPaused ? 'text-yellow-500' : 'text-white'}`}>
                 {isPaused ? 'PAUSED' : 'LIVE'}
             </span>
         </div>
      </div>

      {/* Big Center Play Button (Visible when paused) */}
      {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-none">
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-lg border border-white/20 shadow-2xl">
                  <Play size={40} fill="white" className="ml-1 text-white" />
              </div>
          </div>
      )}

      {/* Controls Overlay */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-6 pb-6 pt-20 transition-opacity duration-300 ${showControls || isPaused ? 'opacity-100' : 'opacity-0'}`}>
        
        {/* Progress Bar (Visual Only for Live) */}
        <div className="w-full h-1 bg-white/20 rounded-full mb-4 overflow-hidden">
            <div className={`h-full bg-skin-500 rounded-full ${isPaused ? 'w-[95%]' : 'w-full animate-pulse'}`}></div>
        </div>

        <div className="flex justify-between items-center">
            
            {/* Left: Playback Controls */}
            <div className="flex items-center gap-4">
                <button 
                    onClick={handlePlayPause}
                    className="w-12 h-12 rounded-full bg-white text-black hover:bg-gray-200 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-lg"
                    title={isHost ? "Pause for everyone" : "Pause locally"}
                >
                    {isPaused ? <Play size={20} fill="currentColor" className="ml-1"/> : <Pause size={20} fill="currentColor" />}
                </button>

                <div className="flex items-center gap-2">
                    <button onClick={() => handleSeek(-5)} className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="Rewind 5s (Local)">
                        <Rewind size={20} />
                    </button>
                    <button onClick={() => handleSeek(5)} className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="Forward 5s (Local)">
                        <FastForward size={20} />
                    </button>
                </div>

                {!isHost && (
                     <button 
                        onClick={handleSync}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-skin-500/10 hover:bg-skin-500/20 text-skin-500 text-xs font-bold border border-skin-500/20 transition-all ml-2"
                        title="Jump to Live"
                    >
                        <Zap size={12} /> SYNC
                    </button>
                )}
            </div>

            {/* Right: System Controls */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-gray-400 mr-4 border-r border-white/10 pr-4">
                    <Monitor size={14} className="text-skin-500" />
                    <span className="text-xs font-bold">{isHost ? "Your Stream" : "Host Stream"}</span>
                </div>

                <button 
                    onClick={toggleMute} 
                    className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
                >
                    {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <button 
                    onClick={toggleFullscreen} 
                    className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
                >
                    <Maximize size={20} />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
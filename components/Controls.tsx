import React, { useState } from 'react';
import { VideoSourceType } from '../types';
import { Monitor, X, Copy, Power, Check, Radio } from 'lucide-react';

interface ControlsProps {
  roomId: string;
  onScreenShareStart: () => void;
  onScreenShareStop: () => void;
  onCloseRoom: () => void;
  currentSourceType: VideoSourceType;
  isStreaming: boolean;
}

const Controls: React.FC<ControlsProps> = ({ 
    roomId,
    onScreenShareStart, 
    onScreenShareStop,
    onCloseRoom,
    currentSourceType,
    isStreaming
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-pawry-900 border-t border-white/10 w-full h-12 flex items-center px-3 justify-between shrink-0 z-30">
        {/* Left: Room Info */}
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded text-xs border border-white/5">
                <span className="text-gray-500 font-bold">ID:</span>
                <span className="font-mono font-bold text-white tracking-widest">{roomId}</span>
                <button onClick={handleCopy} className="text-gray-400 hover:text-white">
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                </button>
            </div>
            
            <button 
                onClick={onCloseRoom}
                className="p-1.5 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                title="Close Room"
            >
                <Power size={14} />
            </button>
        </div>

        {/* Right: Broadcast Controls */}
        <div className="flex items-center">
            {isStreaming && currentSourceType === VideoSourceType.SCREENSHARE ? (
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/10 text-red-500 border border-red-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                        <span className="text-[10px] font-bold">ON AIR</span>
                    </div>
                    <button 
                        onClick={onScreenShareStop}
                        className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors"
                    >
                        Stop
                    </button>
                </div>
            ) : (
                <button 
                    onClick={onScreenShareStart}
                    className="bg-skin-600 hover:bg-skin-500 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-skin-600/20"
                >
                    <Monitor size={12} /> Start Share
                </button>
            )}
        </div>
    </div>
  );
};

export default Controls;
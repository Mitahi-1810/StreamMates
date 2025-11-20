
import React, { useState } from 'react';
import { Play, Users, Zap, MonitorPlay, Loader2, AlertCircle } from 'lucide-react';
import { createAvatar } from '@dicebear/core';
import { bottts } from '@dicebear/collection';
import { socketService } from '../services/mockSocket';

interface LobbyProps {
  onJoin: (name: string, roomId: string, isHost: boolean, avatar: string, color: string) => void;
}

const COLORS = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#a855f7', // purple
    '#ec4899', // pink
];

const Lobby: React.FC<LobbyProps> = ({ onJoin }) => {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'start' | 'join'>('start');
  const [seed, setSeed] = useState(Math.random().toString());
  const [color, setColor] = useState(COLORS[6]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateRoomCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const avatarSvg = createAvatar(bottts, {
    seed: seed,
    size: 128,
    radius: 50,
    backgroundColor: [color.replace('#', '')],
  }).toString();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const code = generateRoomCode();
    // No check needed for creating
    onJoin(name, code, true, `data:image/svg+xml;utf8,${encodeURIComponent(avatarSvg)}`, color);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !roomCode.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    const formattedCode = roomCode.toUpperCase();

    // Check if room exists via socket ping
    const exists = await socketService.checkRoom(formattedCode);
    
    if (exists) {
        onJoin(name, formattedCode, false, `data:image/svg+xml;utf8,${encodeURIComponent(avatarSvg)}`, color);
    } else {
        setError("Room not found. Please check the code or ensure the Host is online.");
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pawry-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse-slow"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-neon-pink/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-0 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-10">
        
        {/* Left Panel: Branding */}
        <div className="p-10 bg-gradient-to-br from-pawry-800/50 to-black/50 flex flex-col justify-center items-center text-center border-b md:border-b-0 md:border-r border-white/5">
             <div 
                className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)] mb-6 rotate-3 hover:rotate-6 transition-transform duration-500"
                style={{backgroundColor: color}}
             >
                 <span className="text-4xl font-black text-white tracking-tighter">SM</span>
             </div>
             <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">StreamMates</h1>
             <p className="text-gray-400 max-w-xs leading-relaxed">Synchronized screen sharing for everyone. Watch together, laugh together.</p>
             
             <div className="mt-8 flex gap-4">
                 <div className="flex flex-col items-center gap-2">
                     <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-neon-cyan"><Zap size={20}/></div>
                     <span className="text-[10px] text-gray-500 uppercase font-bold">Real-time</span>
                 </div>
                 <div className="flex flex-col items-center gap-2">
                     <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-neon-pink"><MonitorPlay size={20}/></div>
                     <span className="text-[10px] text-gray-500 uppercase font-bold">HD Sync</span>
                 </div>
                 <div className="flex flex-col items-center gap-2">
                     <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-yellow-400"><Users size={20}/></div>
                     <span className="text-[10px] text-gray-500 uppercase font-bold">Social</span>
                 </div>
             </div>
        </div>

        {/* Right Panel: Form */}
        <div className="p-8 md:p-10 flex flex-col justify-center">
          {/* Toggle */}
          <div className="flex bg-black/40 p-1.5 rounded-xl mb-8 border border-white/5">
            <button 
                onClick={() => { setMode('start'); setError(null); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${mode === 'start' ? 'bg-pawry-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
            >
                New Room
            </button>
            <button 
                onClick={() => { setMode('join'); setError(null); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${mode === 'join' ? 'bg-pawry-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
            >
                Join Room
            </button>
          </div>

          <form onSubmit={mode === 'start' ? handleCreate : handleJoin} className="space-y-5">
              
              {/* Avatar Customizer */}
              <div className="flex items-center gap-4 mb-6 bg-white/5 p-3 rounded-2xl border border-white/5">
                   <div 
                     className="w-16 h-16 rounded-xl bg-black/50 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border border-white/10 shrink-0"
                     onClick={() => setSeed(Math.random().toString())}
                     title="Click to randomize avatar"
                   >
                       <img src={`data:image/svg+xml;utf8,${encodeURIComponent(avatarSvg)}`} alt="Avatar" className="w-full h-full" />
                   </div>
                   <div className="flex-1">
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Theme Color</label>
                       <div className="flex gap-2 flex-wrap">
                           {COLORS.map(c => (
                               <button 
                                key={c} 
                                type="button"
                                onClick={() => setColor(c)}
                                className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110' : ''}`}
                                style={{backgroundColor: c}}
                               />
                           ))}
                       </div>
                   </div>
              </div>

              <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Display Name</label>
                  <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-neon-pink focus:ring-1 focus:ring-neon-pink/50 transition-all"
                      placeholder="Enter your nickname"
                      required
                  />
              </div>
              
              {mode === 'join' && (
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Room Code</label>
                    <input 
                        type="text" 
                        value={roomCode}
                        onChange={(e) => { setRoomCode(e.target.value); setError(null); }}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-neon-pink focus:ring-1 focus:ring-neon-pink/50 transition-all uppercase tracking-widest font-mono text-lg"
                        placeholder="ABCD12"
                        maxLength={8}
                        required
                    />
                </div>
              )}

              {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2 text-red-400 text-xs">
                      <AlertCircle size={16} />
                      <span>{error}</span>
                  </div>
              )}

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-neon-pink to-purple-600 hover:from-neon-pink/90 hover:to-purple-600/90 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 mt-2 hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  {isLoading ? (
                      <Loader2 size={20} className="animate-spin" />
                  ) : (
                    mode === 'start' ? <Play size={20} fill="currentColor" /> : <Users size={20} />
                  )}
                  {isLoading ? 'Connecting...' : (mode === 'start' ? 'Start Hosting' : 'Join Stream')}
              </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Lobby;

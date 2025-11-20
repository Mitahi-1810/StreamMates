import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, User } from '../types';
import { Send, Users, Crown, Smile, Reply, X, Plus } from 'lucide-react';

interface ChatPanelProps {
  messages: ChatMessage[];
  currentUser: User;
  users: User[];
  onSendMessage: (text: string, type?: 'text' | 'gif', replyToMsg?: ChatMessage) => void;
  onReact: (msgId: string, emoji: string) => void;
}

// Emoji Categories
const EMOJI_CATEGORIES = {
  "Faces": ["😀", "😂", "😍", "🥰", "😎", "🤔", "😐", "😬", "😭", "😱", "🤯", "🥱"],
  "Gestures": ["👍", "👎", "👋", "✌️", "🤟", "👏", "🤝", "🙏", "💪"],
  "Party": ["🎉", "🥳", "🎈", "🥂", "🍻", "🍿", "🍕", "🔥", "✨", "💯"],
  "Symbols": ["❤️", "💔", "⚠️", "🚫", "✅", "⭐", "👀", "💩"]
};

const QUICK_REACTIONS = ["❤️", "😂", "👍", "🔥", "😮", "😢"];

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, currentUser, users, onSendMessage, onReact }) => {
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  
  const [emojiTab, setEmojiTab] = useState<keyof typeof EMOJI_CATEGORIES>("Faces");

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input.trim(), 'text', replyingTo || undefined);
      setInput('');
      setReplyingTo(null);
      setShowEmoji(false);
    }
  };

  const handleAddEmoji = (emoji: string) => {
      setInput(prev => prev + emoji);
  };

  const handleReply = (msg: ChatMessage) => {
      setReplyingTo(msg);
      const inputEl = document.querySelector('input[type="text"]') as HTMLInputElement;
      if(inputEl) inputEl.focus();
  };

  const handleReactionClick = (msgId: string, emoji: string) => {
      onReact(msgId, emoji);
      setShowEmoji(false);
  };

  return (
    <div className="flex flex-col h-full w-full bg-pawry-900/95 lg:bg-pawry-900/95 border-t lg:border-l border-white/10 backdrop-blur-md min-h-0">
      {/* Header: User List - Compact */}
      <div className="px-3 py-2 border-b border-white/10 bg-black/20 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-400">
            <Users size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Online ({users.length})</span>
        </div>
        <div className="flex -space-x-2 overflow-hidden">
          {users.slice(0, 5).map((u) => (
            <div key={u.id} className="relative group shrink-0 hover:z-10">
                <img
                className="h-6 w-6 rounded-full ring-2 ring-pawry-900 object-cover"
                src={u.avatar}
                alt={u.name}
                title={u.name}
                />
            </div>
          ))}
          {users.length > 5 && <div className="h-6 w-6 rounded-full bg-gray-700 ring-2 ring-pawry-900 flex items-center justify-center text-[8px] text-white">+{users.length - 5}</div>}
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-black/10 relative min-h-0" onClick={() => {setShowEmoji(false);}}>
        {messages.length === 0 && (
            <div className="flex h-full items-center justify-center flex-col text-gray-600">
                <Smile size={32} className="mb-2 opacity-50" />
                <p className="text-sm">Start the conversation!</p>
            </div>
        )}
        
        {messages.map((msg) => {
          const isMe = msg.userId === currentUser.id;
          const isSystem = msg.isSystem;

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-1 opacity-60">
                <span className="text-gray-400 text-[10px] italic">
                  {msg.text}
                </span>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2 group relative`}>
              {!isMe && (
                  <img src={msg.userAvatar} className="w-6 h-6 rounded-full mb-4 bg-gray-700 border border-white/10" alt={msg.userName} />
              )}
              
              <div className={`max-w-[85%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 px-1 mb-0.5">
                    {!isMe && <span className="text-[10px] font-bold opacity-75" style={{color: msg.userColor}}>{msg.userName}</span>}
                </div>

                {/* Reply Context */}
                {msg.replyTo && (
                    <div className={`mb-1 text-[10px] border-l-2 pl-2 py-1 rounded opacity-75 ${isMe ? 'border-skin-400 bg-skin-700/50 text-gray-300' : 'border-gray-500 bg-white/5 text-gray-400'}`}>
                        <span className="font-bold block mb-0.5">{msg.replyTo.userName}</span>
                        <span className="line-clamp-1 italic">{msg.replyTo.text}</span>
                    </div>
                )}
                
                {/* Message Bubble */}
                <div className="relative group/bubble">
                    <div className={`px-3 py-2 text-sm shadow-sm leading-relaxed break-words ${
                    isMe 
                        ? 'bg-skin-600 text-white rounded-2xl rounded-br-none' 
                        : 'bg-pawry-800 text-gray-100 rounded-2xl rounded-bl-none border border-white/5'
                    }`}>
                        {msg.text}
                    </div>

                    {/* Hover Actions (Reply, React) */}
                    <div className={`absolute -top-4 ${isMe ? 'left-0 -translate-x-full pr-2' : 'right-0 translate-x-full pl-2'} opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1 z-10`}>
                         <button 
                            onClick={() => handleReply(msg)}
                            className="p-1 bg-pawry-800 rounded-full text-gray-300 hover:text-white hover:bg-pawry-700 border border-white/10 shadow-lg"
                            title="Reply"
                         >
                             <Reply size={10} />
                         </button>
                         <div className="flex bg-pawry-800 rounded-full border border-white/10 shadow-lg p-0.5">
                            {QUICK_REACTIONS.slice(0,3).map(emoji => (
                                <button 
                                    key={emoji} 
                                    onClick={() => handleReactionClick(msg.id, emoji)}
                                    className="p-1 hover:bg-white/10 rounded-full text-xs"
                                >
                                    {emoji}
                                </button>
                            ))}
                         </div>
                    </div>
                </div>

                {/* Reactions Display */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 px-1">
                        {Object.values(msg.reactions).map((reaction) => (
                            <button 
                                key={reaction.emoji}
                                onClick={() => handleReactionClick(msg.id, reaction.emoji)}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 border transition-all ${
                                    reaction.userIds.includes(currentUser.id) 
                                    ? 'bg-skin-600/50 border-skin-500 text-white shadow-sm' 
                                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                                }`}
                            >
                                <span>{reaction.emoji}</span>
                                <span>{reaction.count}</span>
                            </button>
                        ))}
                    </div>
                )}

              </div>
            </div>
          );
        })}
      </div>

      {/* Reply Indicator */}
      {replyingTo && (
          <div className="px-4 py-2 bg-pawry-800/50 border-t border-white/10 flex justify-between items-center shrink-0 backdrop-blur-md">
              <div className="flex flex-col text-xs border-l-2 border-skin-500 pl-2 text-gray-300">
                  <span className="font-bold text-skin-400">Replying to {replyingTo.userName}</span>
                  <span className="line-clamp-1 opacity-75">{replyingTo.text}</span>
              </div>
              <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white">
                  <X size={14} />
              </button>
          </div>
      )}

      {/* Input Area */}
      <div className="p-3 border-t border-white/10 bg-pawry-900/95 z-20 relative shrink-0">
        
        {/* Emoji Picker */}
        {showEmoji && (
            <div className="absolute bottom-full left-2 mb-2 bg-pawry-800 border border-white/10 rounded-xl shadow-2xl w-64 flex flex-col overflow-hidden z-50">
                <div className="flex border-b border-white/5 overflow-x-auto scrollbar-hide">
                    {(Object.keys(EMOJI_CATEGORIES) as Array<keyof typeof EMOJI_CATEGORIES>).map(cat => (
                        <button 
                            key={cat} 
                            onClick={() => setEmojiTab(cat)}
                            className={`px-3 py-2 text-[10px] font-bold ${emojiTab === cat ? 'text-skin-500 border-b-2 border-skin-500' : 'text-gray-400'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                <div className="p-2 grid grid-cols-6 gap-1 max-h-48 overflow-y-auto">
                    {EMOJI_CATEGORIES[emojiTab].map(e => (
                        <button key={e} onClick={() => handleAddEmoji(e)} className="hover:bg-white/10 p-1 rounded text-lg">{e}</button>
                    ))}
                </div>
            </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="flex-1 relative">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={replyingTo ? "Type a reply..." : "Type your message here..."}
                    className="w-full bg-white/10 border border-white/5 text-white rounded-full py-2.5 pl-4 pr-10 focus:outline-none focus:ring-1 focus:ring-skin-500 focus:border-skin-500 placeholder-gray-400 text-sm transition-all"
                    style={{color: 'white', opacity: 1}}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button type="button" onClick={() => {setShowEmoji(!showEmoji);}} className={`p-1.5 rounded-full hover:bg-white/10 ${showEmoji ? 'text-skin-500' : 'text-gray-400'}`}>
                        <Smile size={18} />
                    </button>
                </div>
            </div>
          <button 
            type="submit"
            disabled={!input.trim()}
            className="bg-skin-600 hover:bg-skin-500 disabled:bg-gray-800 disabled:text-gray-600 text-white w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg shrink-0"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
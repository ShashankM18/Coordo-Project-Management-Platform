import { useEffect, useState, useRef } from 'react';
import { useChatStore } from '@store/chat.store';
import { useAuthStore } from '@store/auth.store';
import { X, Send, Hash, MessageSquare, Plus } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function ChatPanel({ workspaceId, members }) {
  const {
    channels,
    currentChannel,
    currentDMUser,
    messages,
    isOpen,
    setIsOpen,
    setCurrentChannel,
    setCurrentDMUser,
    fetchChannels,
    fetchMessages,
    sendMessage,
    createChannel,
  } = useChatStore();
  const { user } = useAuthStore();
  const [input, setInput] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionActive, setMentionActive] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !workspaceId) return;
    fetchChannels(workspaceId);
  }, [isOpen, workspaceId, fetchChannels]);

  useEffect(() => {
    if (isOpen && workspaceId && (currentChannel || currentDMUser)) {
      fetchMessages(workspaceId);
    }
  }, [isOpen, currentChannel, currentDMUser, workspaceId, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    await sendMessage(workspaceId, input);
    setInput('');
    setMentionActive(false);
    setMentionQuery('');
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    try {
      await createChannel(workspaceId, newChannelName);
      setNewChannelName('');
      toast.success('Channel created');
    } catch (err) {
      toast.error(err.message || 'Failed to create channel');
    }
  };

  const directUsers = (members || [])
    .map((member) => member.user)
    .filter((memberUser) => memberUser?._id && memberUser._id !== user?._id);

  const mentionSuggestions = mentionActive
    ? (mentionQuery === ''
      ? directUsers
      : directUsers.filter((dmUser) => {
        const query = mentionQuery.toLowerCase();
        const handle = (dmUser.name || '').replace(/\s+/g, '').toLowerCase();
        const emailHandle = (dmUser.email || '').split('@')[0]?.toLowerCase() || '';
        return handle.includes(query) || emailHandle.includes(query) || dmUser.name?.toLowerCase().includes(query);
      }))
    : [];

  const handleInputChange = (value) => {
    setInput(value);
    const match = value.match(/(?:^|\s)@([a-zA-Z0-9._-]*)$/);
    setMentionQuery(match ? match[1] : '');
    setMentionActive(!!match);
  };

  const insertMention = (dmUser) => {
    const handle = (dmUser.name || '').replace(/\s+/g, '').toLowerCase();
    setInput((prev) => prev.replace(/(?:^|\s)@([a-zA-Z0-9._-]*)$/, (matched) => {
      const prefix = matched.startsWith(' ') ? ' ' : '';
      return `${prefix}@${handle} `;
    }));
    setMentionActive(false);
    setMentionQuery('');
  };

  const renderMessageContent = (content = '') => {
    const parts = content.split(/(@[a-zA-Z0-9._-]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return <span key={`${part}-${index}`} className="bg-brand-50 text-brand-700 px-1 rounded">{part}</span>;
      }
      return <span key={`${part}-${index}`}>{part}</span>;
    });
  };

  return (
    <div className="fixed right-0 top-0 bottom-0 w-[760px] max-w-[95vw] bg-white border-l border-gray-200 shadow-2xl z-50 flex animate-slide-in-right">
      <aside className="w-72 border-r border-gray-100 p-3 bg-gray-50/70 flex flex-col gap-4">
        <div>
          <h4 className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-2">Channels</h4>
          <div className="space-y-1">
            {channels.map((channel) => (
              <button
                key={channel._id}
                type="button"
                onClick={() => setCurrentChannel(channel)}
                className={`w-full text-left px-2.5 py-2 rounded-md text-sm flex items-center gap-2 ${currentChannel?._id === channel._id ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-white'}`}
              >
                <Hash size={14} />
                <span className="truncate">{channel.name}</span>
              </button>
            ))}
          </div>
          <form onSubmit={handleCreateChannel} className="mt-2 flex items-center gap-1.5">
            <input
              className="input py-1.5 text-xs"
              placeholder="new-channel"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
            />
            <button type="submit" className="p-2 rounded-md bg-brand-600 text-white hover:bg-brand-700">
              <Plus size={13} />
            </button>
          </form>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <h4 className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-2">Direct Messages</h4>
          <div className="space-y-1">
            {directUsers.map((dmUser) => (
              <button
                key={dmUser._id}
                type="button"
                onClick={() => setCurrentDMUser(dmUser)}
                className={`w-full text-left px-2.5 py-2 rounded-md text-sm flex items-center gap-2 ${currentDMUser?._id === dmUser._id ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-white'}`}
              >
                <img src={dmUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(dmUser.name || 'U')}&background=6366f1&color=fff&size=24`} className="w-5 h-5 rounded-full" />
                <span className="truncate">{dmUser.name}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            {currentDMUser ? (
              <>
                <MessageSquare size={16} className="text-brand-500" /> {currentDMUser.name}
              </>
            ) : (
              <>
                <Hash size={16} className="text-gray-500" /> {currentChannel?.name || 'Select a channel'}
              </>
            )}
          </h3>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"><X size={16}/></button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {(!currentChannel && !currentDMUser) ? (
          <p className="text-center text-sm text-gray-400 mt-10">Select a channel or direct message to start chatting</p>
        ) : messages.length === 0 ? (
           <p className="text-center text-xs text-gray-400 mt-10">No messages yet. Say hello!</p>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender?._id === user?._id;
            return (
              <div key={msg._id} className={`flex max-w-[85%] ${isMe ? 'ml-auto justify-end' : ''}`}>
                <div className={`flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && <span className="text-[10px] text-gray-400 font-medium ml-1">{msg.sender?.name}</span>}
                  <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-brand-600 text-white rounded-tr-sm shadow-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'}`}>
                    {renderMessageContent(msg.content)}
                  </div>
                  <span className="text-[10px] text-gray-400 px-1">{format(new Date(msg.createdAt), 'h:mm a')}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-100 shrink-0">
        <form onSubmit={handleSend} className="flex items-center gap-2 relative">
          <input className="input flex-1 py-2 text-sm bg-gray-50 border-transparent focus:bg-white transition-colors" placeholder={currentDMUser ? `Message ${currentDMUser.name}...` : 'Type a message...'} value={input} onChange={e=>handleInputChange(e.target.value)} disabled={!currentDMUser && !currentChannel} />
          <button type="submit" disabled={!input.trim() || (!currentDMUser && !currentChannel)} className="p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 transition-colors">
            <Send size={15} />
          </button>
          {mentionSuggestions.length > 0 && (
            <div className="absolute left-0 right-10 bottom-12 border border-gray-200 rounded-lg bg-white shadow-sm z-20">
              {mentionSuggestions.map((dmUser) => (
                <button
                  key={dmUser._id}
                  type="button"
                  onClick={() => insertMention(dmUser)}
                  className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2"
                >
                  <img src={dmUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(dmUser.name || 'U')}&background=6366f1&color=fff&size=20`} className="w-5 h-5 rounded-full" />
                  <span className="font-medium text-gray-800">{dmUser.name}</span>
                  <span className="text-gray-400">@{(dmUser.name || '').replace(/\s+/g, '').toLowerCase()}</span>
                </button>
              ))}
            </div>
          )}
        </form>
      </div>
      </div>
    </div>
  );
}

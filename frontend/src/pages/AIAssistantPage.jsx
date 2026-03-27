import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, Loader2, Zap, BarChart2, ListTodo, Clock } from 'lucide-react';
import { aiAPI } from '@api/index';
import toast from 'react-hot-toast';

const SUGGESTIONS = [
  { icon: <ListTodo size={13} />, text: 'How should I break down a user authentication feature?' },
  { icon: <Clock size={13} />, text: 'What are signs a project might be at risk of delay?' },
  { icon: <BarChart2 size={13} />, text: 'Give me a sprint planning checklist for a 5-person team' },
  { icon: <Zap size={13} />, text: 'What are best practices for writing good task descriptions?' },
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm Coordo's AI assistant. I can help you with task estimation, project planning, writing descriptions, and more. What can I help you with today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const data = await aiAPI.chat(newMessages);
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch {
      toast.error('AI is unavailable. Check your API key.');
      setMessages(prev => prev.slice(0, -1));
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-purple-500 rounded-xl flex items-center justify-center">
          <Sparkles size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-gray-900">AI Assistant</h1>
          <p className="text-xs text-gray-400">For Coordo</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs text-emerald-700 font-medium">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5
              ${m.role === 'assistant' ? 'bg-gradient-to-br from-brand-500 to-purple-500' : 'bg-gray-200'}`}>
              {m.role === 'assistant'
                ? <Sparkles size={13} className="text-white" />
                : <User size={13} className="text-gray-600" />}
            </div>
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed
              ${m.role === 'assistant'
                ? 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                : 'bg-brand-600 text-white rounded-tr-sm'}`}>
              {m.content.split('\n').map((line, j) => (
                <p key={j} className={j > 0 ? 'mt-1' : ''}>{line}</p>
              ))}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center shrink-0">
              <Sparkles size={13} className="text-white" />
            </div>
            <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm">
              <Loader2 size={14} className="text-brand-500 animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions (shown on first message only) */}
      {messages.length === 1 && (
        <div className="grid grid-cols-2 gap-2 my-4 shrink-0">
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => send(s.text)}
              className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-100 rounded-xl text-left text-xs text-gray-600 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700 transition-all">
              <span className="mt-0.5 text-brand-500 shrink-0">{s.icon}</span>
              {s.text}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="mt-4 shrink-0">
        <div className="flex gap-2">
          <input className="input flex-1 text-sm pr-3"
            placeholder="Ask me anything about your projects..."
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            disabled={loading} />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            className="btn-primary px-4 gap-1.5 shrink-0">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">AI can make mistakes. Verify important information.</p>
      </div>
    </div>
  );
}

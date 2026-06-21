'use client';

import { useState, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';

interface Session {
  id: string;
  title: string;
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');

  const [input, setInput] = useState<string>('');

  const { messages, status, sendMessage, setMessages } = useChat();

  // 初始化：获取会话列表
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch('/api/sessions');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setSessions(json.data);
          if (json.data.length > 0) {
            setCurrentSessionId(json.data[0].id);
          }
        }
      } catch (error) {
        console.error('获取会话列表失败:', error);
      }
    };
    fetchSessions();
  }, []);

  // 监听当前会话变更：拉取历史消息（不再需要对 content 进行二次加工转换）
  useEffect(() => {
    if (!currentSessionId) return;

    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/sessions/${currentSessionId}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setMessages(json.data);
        } else {
          setMessages([]);
        }
      } catch (error) {
        console.error('获取历史消息失败:', error);
        setMessages([]);
      }
    };

    fetchHistory();
  }, [currentSessionId, setMessages]);

  // 接管表单提交逻辑
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status === 'submitted' || status === 'streaming') return;

    const currentInput = input;
    setInput('');

    try {
      await sendMessage(
        { text: currentInput },
        {
          body: { sessionId: currentSessionId },
        },
      );
    } catch (error) {
      console.error('消息发送失败:', error);
      setInput(currentInput);
    }
  };

  // 创建新会话
  const handleCreateSession = async () => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `新对话 ${sessions.length + 1}` }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSessions((prev) => [json.data, ...prev]);
        setCurrentSessionId(json.data.id);
      }
    } catch (error) {
      console.error('创建会话失败:', error);
    }
  };

  // 删除会话
  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        if (currentSessionId === id) {
          setCurrentSessionId('');
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('删除会话失败:', error);
    }
  };

  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-900">
      <div className="w-64 border-r border-zinc-200 bg-zinc-100 flex flex-col p-4 gap-4">
        <button
          onClick={handleCreateSession}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-sm transition-colors"
        >
          + 新建会话
        </button>
        <div className="flex-1 overflow-y-auto flex flex-col gap-1">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => setCurrentSessionId(session.id)}
              className={`flex items-center justify-between p-2 rounded-md cursor-pointer text-sm transition-colors ${
                currentSessionId === session.id ? 'bg-zinc-200 font-medium' : 'hover:bg-zinc-200/50'
              }`}
            >
              <span className="truncate mr-2">{session.title}</span>
              <button
                onClick={(e) => handleDeleteSession(session.id, e)}
                className="text-zinc-400 hover:text-red-500 p-1 text-xs"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full">
        {currentSessionId ? (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((item) => (
                <div
                  key={item.id}
                  className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                      item.role === 'user' ? 'bg-blue-600 text-white' : 'bg-zinc-200 text-zinc-900'
                    }`}
                  >
                    {item?.parts?.map((part, idx) => {
                      // 深度渲染：优雅承载 DeepSeek 的思考流 (reasoning)
                      if (part.type === 'reasoning') {
                        return (
                          <div
                            key={idx}
                            className="mb-2 text-xs text-zinc-500 italic border-l-2 border-zinc-400 pl-2 bg-zinc-300/30 p-2 rounded"
                          >
                            <div className="font-semibold text-[10px] uppercase tracking-wider text-zinc-400 not-italic mb-1">
                              Thinking Process:
                            </div>
                            <span className="whitespace-pre-wrap">{part.text}</span>
                          </div>
                        );
                      }
                      // 标准文本渲染
                      if (part.type === 'text') {
                        return (
                          <span key={idx} className="whitespace-pre-wrap">
                            {part.text}
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleFormSubmit} className="p-4 border-t border-zinc-200 bg-white">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={status === 'streaming' ? '正在生成中...' : '输入消息...'}
                  disabled={status === 'streaming'}
                  className="flex-1 px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-zinc-100"
                />
                <button
                  type="submit"
                  disabled={status === 'streaming' || !input.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 text-white rounded-md text-sm font-medium transition-colors"
                >
                  发送
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">
            请选择或新建一个会话开始聊天
          </div>
        )}
      </div>
    </div>
  );
}

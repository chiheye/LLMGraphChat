import { useState } from 'react';
import { Message } from '@/lib/types';

interface ChatInputProps {
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  settings: {
    openaiApiKey?: string;
    openaiBaseUrl?: string;
    neo4jUri?: string;
    neo4jUsername?: string;
    neo4jPassword?: string;
    modelName?: string;
  };
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}

export function ChatInput({ messages, setMessages, settings, isLoading, setIsLoading }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages,
          openaiApiKey: settings.openaiApiKey,
          openaiBaseUrl: settings.openaiBaseUrl,
          neo4jUri: settings.neo4jUri,
          neo4jUsername: settings.neo4jUsername,
          neo4jPassword: settings.neo4jPassword,
          modelName: settings.modelName, // 添加模型名称
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '发送消息失败');
      }
      
      const data = await response.json();
      
      // 添加助手回复到消息列表
      setMessages([...newMessages, data.message]);
    } catch (error: any) {
      console.error('发送消息失败:', error);
      // 添加错误消息
      setMessages([
        ...newMessages,
        { role: 'assistant' as const, content: `发送消息时出错: ${error.message || '未知错误'}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="border-t p-4 flex items-center">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入您的问题..."
        className="flex-1 p-2 border rounded resize-none"
        rows={1}
        disabled={isLoading}
      />
      <button
        onClick={handleSendMessage}
        disabled={isLoading || !input.trim()}
        className="ml-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
      >
        {isLoading ? '发送中...' : '发送'}
      </button>
    </div>
  );
}
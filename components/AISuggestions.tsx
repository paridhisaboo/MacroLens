'use client';

import { useState, useRef, useEffect } from 'react';
import TokenTransparencyPanel, {
  type LastRequestUsage,
  type SessionUsage,
} from './TokenTransparencyPanel';
import { USAGE_MARKER_START, USAGE_MARKER_END } from '@/lib/tokens';

interface Macro {
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
}

interface LogEntry {
  id: string;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  grams: number;
  source: string;
  loggedAt: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  macros: Macro;
  logData: { logs: LogEntry[] } | undefined;
  isOpen: boolean;
  onClose: () => void;
}

export default function AISuggestions({ macros, logData, isOpen, onClose }: Props) {
  // Derive logs and logsReady from the same object in the same render.
  // This eliminates the race condition entirely.
  const logsReady = logData !== undefined;
  const logs = logData?.logs?.map(l => ({
    foodName: l.foodName,
    macros: {
      calories: l.calories,
      protein: l.protein,
      carbs: l.carbs,
      fat: l.fat,
    },
  })) ?? [];

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUsage, setLastUsage] = useState<LastRequestUsage | null>(null);
  const [sessionUsage, setSessionUsage] = useState<SessionUsage>({
    inputTokens: 0,
    outputTokens: 0,
    requestCount: 0,
  });
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasAutoSent = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fire the initial message only once, only after panel is open
  // AND logData has resolved. Both conditions checked from the same render.
  useEffect(() => {
    if (isOpen && logsReady && !hasAutoSent.current) {
      hasAutoSent.current = true;
      console.log('AUTO SEND - logs:', logs, 'logData:', logData); // trouvleshooting
      sendMessage("Give me suggestions based on what I've eaten today.", logs, macros);
    }
  }, [isOpen, logsReady]);

  // Reset when panel closes so it re-fires on next open
  useEffect(() => {
    if (!isOpen) {
      hasAutoSent.current = false;
      setMessages([]);
    }
  }, [isOpen]);

  const sendMessage = async (text: string, currentLogs = logs, currentMacros = macros) => {
    const userMessage: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    const assistantMessage: Message = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantMessage]);

    const res = await fetch('/api/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ macros: currentMacros, logs: currentLogs, messages: updatedMessages, userMessage: text }),
    });

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) { setIsLoading(false); return; }

    let visibleText = '';
    let tail = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      tail += decoder.decode(value, { stream: true });
      const markerIdx = tail.indexOf(USAGE_MARKER_START);

      if (markerIdx === -1) {
        const safeLen = Math.max(0, tail.length - USAGE_MARKER_START.length);
        visibleText += tail.slice(0, safeLen);
        tail = tail.slice(safeLen);
      } else {
        visibleText += tail.slice(0, markerIdx);
        const rest = tail.slice(markerIdx + USAGE_MARKER_START.length);
        const endIdx = rest.indexOf(USAGE_MARKER_END);
        if (endIdx !== -1) {
          const usageJson = rest.slice(0, endIdx);
          try {
            const parsed: LastRequestUsage = JSON.parse(usageJson);
            setLastUsage(parsed);
            setSessionUsage(prev => ({
              inputTokens: prev.inputTokens + parsed.inputTokens,
              outputTokens: prev.outputTokens + parsed.outputTokens,
              requestCount: prev.requestCount + 1,
            }));
          } catch (e) {
            console.error('Failed to parse usage marker:', e);
          }
          tail = '';
        } else {
          tail = USAGE_MARKER_START + rest;
        }
      }

      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: visibleText };
        return updated;
      });
    }

    setIsLoading(false);
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
  };

  const renderMessage = (content: string) => {
    return content
      .replace(/#{1,3} /g, '')
      .split('\n')
      .filter(l => l.trim())
      .map((line, i) => (
        <p key={i} className="mb-2" dangerouslySetInnerHTML={{
          __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        }} />
      ));
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />}

      <div className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-stone-900 z-50 flex flex-col shadow-2xl transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-stone-700">
          <div>
            <h2 className="text-white font-semibold">Nutrition Assistant</h2>
            <p className="text-stone-400 text-xs font-mono">Powered by Claude</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {!logsReady && (
            <div className="flex justify-start">
              <div className="bg-stone-800 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-teal-600 text-white rounded-br-sm'
                  : 'bg-stone-800 text-stone-200 rounded-bl-sm'
              }`}>
                {msg.role === 'assistant' ? renderMessage(msg.content) : msg.content}
                {msg.role === 'assistant' && msg.content === '' && (
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <TokenTransparencyPanel lastRequest={lastUsage} session={sessionUsage} />

        <div className="px-4 py-4 border-t border-stone-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask about your nutrition…"
              className="flex-1 bg-stone-800 text-white placeholder:text-stone-500 text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
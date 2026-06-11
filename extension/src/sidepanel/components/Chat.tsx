// Chat Interface for PagePilot Side Panel

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Bot, User, StopCircle, Copy, Check,
  Sparkles, RefreshCw, ChevronDown, Quote,
  AlertCircle
} from 'lucide-react';
import { cn, formatRelativeTime, getModeLabel } from '../utils/formatting';
import { useStore } from '../store';
import type { Message, Mode, StreamEvent, Citation } from '../types';

interface ChatProps {
  messages: Message[];
  isStreaming: boolean;
  onSendMessage: (sessionId: string, message: string, mode: Mode, onEvent: (event: StreamEvent) => void) => Promise<void>;
  mode: Mode;
  setMode: (mode: Mode) => void;
}

const SUGGESTIONS: Record<Mode, string[]> = {
  fast: ['Summarize this page', 'What are the main points?', 'Give me a TL;DR'],
  deep: ['Explain the key arguments', 'What are the implications?', 'Analyze the structure'],
  eli5: ['Explain this simply', 'Give me an analogy', 'Why does this matter?'],
  expert: ['What technical details matter?', 'How is this implemented?', 'What are the trade-offs?'],
};

export function Chat({ messages, isStreaming, onSendMessage, mode, setMode }: ChatProps) {
  const { currentSession } = useStore();
  const [inputValue, setInputValue] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || !currentSession || isStreaming) return;

    const message = inputValue.trim();
    setInputValue('');
    setShowSuggestions(false);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };

    useStore.setState(state => ({
      messages: [...state.messages, userMessage],
    }));

    let assistantContent = '';
    const assistantId = `assistant-${Date.now()}`;

    await onSendMessage(currentSession.session.id, message, mode, (event) => {
      if (event.event === 'chunk' && event.data.delta) {
        assistantContent += event.data.delta;
        useStore.setState(state => {
          const existing = state.messages.find(m => m.id === assistantId);
          if (existing) {
            return {
              messages: state.messages.map(m =>
                m.id === assistantId ? { ...m, content: assistantContent } : m
              ),
            };
          }
          return {
            messages: [...state.messages, {
              id: assistantId,
              role: 'assistant' as const,
              content: assistantContent,
              metadata: {},
              createdAt: new Date().toISOString(),
            }],
          };
        });
      } else if (event.event === 'citation' && event.data.citations) {
        useStore.setState(state => ({
          messages: state.messages.map(m =>
            m.id === assistantId
              ? { ...m, metadata: { ...m.metadata, citations: event.data.citations } }
              : m
          ),
        }));
      }
    });
  }, [inputValue, currentSession, isStreaming, mode, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSelectedMessage(text);
      setTimeout(() => setSelectedMessage(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  if (!currentSession) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Page Selected</h3>
          <p className="text-sm text-muted-foreground">
            Go to Dashboard and analyze a URL first to start chatting.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-1">Chat with this page</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Ask questions about the content. Mode: <span className="font-medium">{getModeLabel(mode)}</span>
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            message={msg}
            onCopy={handleCopy}
            selectedMessage={selectedMessage}
          />
        ))}

        {isStreaming && <div ref={messagesEndRef} />}
      </div>

      {/* Smart Suggestions */}
      <AnimatePresence>
        {showSuggestions && messages.length === 0 && !isStreaming && (
          <Suggestions
            suggestions={SUGGESTIONS[mode]}
            onSelect={(suggestion) => {
              setInputValue(suggestion);
              inputRef.current?.focus();
            }}
          />
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this page..."
            rows={1}
            className="flex-1 min-h-[40px] max-h-[120px] px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            disabled={isStreaming}
          />
          <button
            onClick={isStreaming ? () => {} : handleSend}
            disabled={!inputValue.trim() && !isStreaming}
            className={cn(
              'h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-all',
              isStreaming
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : inputValue.trim()
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            {isStreaming
              ? <StopCircle className="h-5 w-5" />
              : <Send className="h-5 w-5" />
            }
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({
  message,
  onCopy,
  selectedMessage,
}: {
  message: Message;
  onCopy: (text: string) => void;
  selectedMessage: string | null;
}) {
  const isUser = message.role === 'user';
  const citations = message.metadata?.citations as Citation[] | undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
        isUser ? 'bg-primary/10' : 'bg-accent'
      )}>
        {isUser ? <User className="h-4 w-4 text-primary" /> : <Bot className="h-4 w-4 text-foreground" />}
      </div>

      <div className={cn('flex flex-col gap-1 max-w-[85%]', isUser ? 'items-end' : 'items-start')}>
        <div className={cn(
          'rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-md'
            : 'bg-card border border-border rounded-tl-md'
        )}>
          {message.content}
        </div>

        {/* Citations */}
        {citations && citations.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {citations.map((cite, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10px] text-muted-foreground cursor-help" title={cite.text}>
                <Quote className="h-2.5 w-2.5" />
                Chunk {cite.chunkId?.split('-').pop() || i + 1}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] text-muted-foreground">
            {formatRelativeTime(message.createdAt)}
          </span>
          <button
            onClick={() => onCopy(message.content)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Copy response"
          >
            {selectedMessage === message.content
              ? <Check className="h-3 w-3 text-green-500" />
              : <Copy className="h-3 w-3" />
            }
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function Suggestions({
  suggestions,
  onSelect,
}: {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="px-4 py-2"
    >
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Suggestions</p>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelect(s)}
            className="px-3 py-1.5 rounded-lg bg-accent text-xs text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
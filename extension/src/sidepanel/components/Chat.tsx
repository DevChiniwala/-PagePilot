// Chat Interface for PagePilot - Enhanced with premium UI components

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Send, Bot, User, StopCircle, Copy, Check,
  Sparkles, Quote, MessageSquare, Trash2,
  Maximize2, Minimize2
} from 'lucide-react';
import { cn, formatRelativeTime, getModeLabel } from '../utils/formatting';
import { useStore } from '../store';
import {
  GlassCard, FloatingCard,
  MarkdownRenderer,
  TypingIndicator,
  ModeIndicator,
  SmartSuggestions,
} from './ui';
import type { Message, Mode, StreamEvent, Citation, ExtractedContent } from '../types';

interface ChatProps {
  messages: Message[];
  isStreaming: boolean;
  onSendMessage: (sessionId: string, message: string, mode: Mode, onEvent: (event: StreamEvent) => void) => Promise<void>;
  mode: Mode;
  setMode: (mode: Mode) => void;
}

export function Chat({ messages, isStreaming, onSendMessage, mode }: ChatProps) {
  const { currentSession, extractedContent } = useStore();
  const [inputValue, setInputValue] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [inputExpanded, setInputExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const handleClear = () => {
    useStore.setState({ messages: [] });
    setShowSuggestions(true);
  };

  if (!currentSession) {
    return (
      <FloatingCard className="flex-1 flex items-center justify-center p-6 m-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-2">No Page Selected</h3>
          <p className="text-sm text-muted-foreground">
            Go to Dashboard and analyze a URL first to start chatting with the page content.
          </p>
        </div>
      </FloatingCard>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-hide">
        {/* Empty State */}
        {messages.length === 0 && !isStreaming && (
          <FloatingCard className="p-6 text-center mx-2 mt-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Chat with this page</h3>
            <p className="text-xs text-muted-foreground mb-1">
              Ask questions about the content. Mode: <span className="font-medium">{getModeLabel(mode)}</span>
            </p>
            <ModeIndicator mode={mode} className="inline-flex mt-1" />
          </FloatingCard>
        )}

        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            message={msg}
            onCopy={handleCopy}
            selectedMessage={selectedMessage}
            isLastAssistant={!isStreaming && msg === messages[messages.length - 1] && msg.role === 'assistant'}
          />
        ))}

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-foreground" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-tl-md px-4 py-3">
              <TypingIndicator dots={3} size="md" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Smart Suggestions */}
      <SmartSuggestions
        mode={mode}
        content={extractedContent as ExtractedContent | null}
        onSelect={(suggestion) => {
          setInputValue(suggestion);
          inputRef.current?.focus();
        }}
        onDismiss={() => setShowSuggestions(false)}
        visible={showSuggestions && messages.length === 0 && !isStreaming}
      />

      {/* Input Area */}
      <div className="border-t border-border bg-card/80 backdrop-blur-xl">
        <div className="px-3 py-2">
          <div className="flex items-center gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask about this page in ${getModeLabel(mode)} mode...`}
              rows={inputExpanded ? 3 : 1}
              className="flex-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              disabled={isStreaming}
            />
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setInputExpanded(!inputExpanded)}
                className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title={inputExpanded ? 'Collapse' : 'Expand'}
              >
                {inputExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                onClick={isStreaming ? () => {} : handleSend}
                disabled={!inputValue.trim() && !isStreaming}
                className={cn(
                  'p-2 rounded-lg flex items-center justify-center transition-all',
                  isStreaming
                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    : inputValue.trim()
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                {isStreaming
                  ? <StopCircle className="h-4 w-4" />
                  : <Send className="h-4 w-4" />
                }
              </button>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex items-center justify-between mt-1.5 px-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">
                <kbd className="px-1 py-0.5 rounded bg-muted font-mono">Shift</kbd> + <kbd className="px-1 py-0.5 rounded bg-muted font-mono">Enter</kbd> for newline
              </span>
            </div>
            {messages.length > 0 && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                Clear chat
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({
  message,
  onCopy,
  selectedMessage,
  isLastAssistant: _isLastAssistant,
}: {
  message: Message;
  onCopy: (text: string) => void;
  selectedMessage: string | null;
  isLastAssistant: boolean;
}) {
  const isUser = message.role === 'user';
  const citations = message.metadata?.citations as Citation[] | undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <div className={cn(
        'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm',
        isUser
          ? 'bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10'
          : 'bg-gradient-to-br from-accent to-muted border border-border/50'
      )}>
        {isUser ? <User className="h-4 w-4 text-primary" /> : <Bot className="h-4 w-4 text-foreground" />}
      </div>

      {/* Content */}
      <div className={cn('flex flex-col gap-1 max-w-[85%]', isUser ? 'items-end' : 'items-start')}>
        {isUser ? (
          <GlassCard variant="outlined" padding="md" className={cn(
            'rounded-2xl rounded-tr-md',
            'bg-primary text-primary-foreground'
          )}>
            <p className="text-sm leading-relaxed">{message.content}</p>
          </GlassCard>
        ) : (
          <GlassCard variant="default" padding="md" className="rounded-2xl rounded-tl-md w-full">
            <MarkdownRenderer
              content={message.content}
              animate={false}
            />
          </GlassCard>
        )}

        {/* Citations */}
        {citations && citations.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5 px-1">
            {citations.map((cite, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50 text-[10px] text-muted-foreground cursor-default border border-border/30"
                title={cite.text}
              >
                <Quote className="h-2.5 w-2.5" />
                Chunk {cite.chunkId?.split('-').pop() || i + 1}
              </motion.span>
            ))}
          </div>
        )}

        {/* Actions */}
        {!isUser && (
          <div className="flex items-center gap-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] text-muted-foreground">
              {formatRelativeTime(message.createdAt)}
            </span>
            <button
              onClick={() => onCopy(message.content)}
              className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
              title="Copy response"
            >
              {selectedMessage === message.content
                ? <Check className="h-3 w-3 text-green-500" />
                : <Copy className="h-3 w-3" />
              }
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
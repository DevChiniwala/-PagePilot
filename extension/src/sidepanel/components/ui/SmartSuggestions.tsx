// Smart Suggestions Components for PagePilot

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightning, MessageSquareText, Sparkles, Lightbulb,
  Target, Search, Code, FileText, Quote, Hash,
  ArrowRight, X
} from 'lucide-react';
import { cn } from '../../utils/formatting';
import type { Mode, ExtractedContent } from '../../types';

interface SmartSuggestionsProps {
  mode: Mode;
  content: ExtractedContent | null;
  onSelect: (suggestion: string) => void;
  onDismiss: () => void;
  visible: boolean;
}

type SuggestionCategory = 'summary' | 'analysis' | 'technical' | 'explore';

interface Suggestion {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  category: SuggestionCategory;
  query: string;
}

export function SmartSuggestions({
  mode,
  content,
  onSelect,
  onDismiss,
  visible,
}: SmartSuggestionsProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const suggestions = useMemo((): Suggestion[] => {
    if (!content) return [];

    const base: Suggestion[] = [];

    // Mode-specific suggestions
    switch (mode) {
      case 'fast':
        base.push(
          { id: 's1', icon: Lightning, text: 'Summarize this page', category: 'summary', query: 'Summarize the key points of this page' },
          { id: 's2', icon: Target, text: 'What are the main takeaways?', category: 'summary', query: 'What are the main takeaways from this page?' },
          { id: 's3', icon: Sparkles, text: 'TL;DR version', category: 'summary', query: 'Give me a TL;DR of this page' },
        );
        break;
      case 'deep':
        base.push(
          { id: 'd1', icon: FileText, text: 'Analyze the argument structure', category: 'analysis', query: 'Analyze the structure and logic of the arguments presented' },
          { id: 'd2', icon: Lightbulb, text: 'What are the implications?', category: 'analysis', query: 'What are the broader implications of this content?' },
          { id: 'd3', icon: Quote, text: 'Key quotes and evidence', category: 'analysis', query: 'Extract the most important quotes and evidence from this page' },
        );
        break;
      case 'eli5':
        base.push(
          { id: 'e1', icon: Sparkles, text: 'Explain in simple terms', category: 'summary', query: 'Explain this page like I am 12 years old' },
          { id: 'e2', icon: Lightbulb, text: 'Give me an analogy', category: 'explore', query: 'Give me a relatable analogy for this content' },
          { id: 'e3', icon: Target, text: 'Why should I care?', category: 'explore', query: 'Explain why this matters in simple terms' },
        );
        break;
      case 'expert':
        base.push(
          { id: 'x1', icon: Code, text: 'Technical deep-dive', category: 'technical', query: 'Provide a technical deep-dive of the implementation details' },
          { id: 'x2', icon: Hash, text: 'Specifications & metrics', category: 'technical', query: 'Extract all technical specifications and metrics mentioned' },
          { id: 'x3', icon: Search, text: 'Architecture analysis', category: 'technical', query: 'Analyze the architecture and design patterns described' },
        );
        break;
    }

    // Content-specific suggestions (based on headings)
    if (content.headings && content.headings.length > 0) {
      const headingText = content.headings.slice(0, 3).map(h => h.text).join(', ');
      if (headingText) {
        base.push({
          id: 'c1',
          icon: MessageSquareText,
          text: `About: ${headingText.slice(0, 40)}...`,
          category: 'explore',
          query: `Tell me more about ${headingText}`,
        });
      }
    }

    return base.slice(0, 6);
  }, [mode, content]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!expanded) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          onSelect(suggestions[selectedIndex].query);
        }
        break;
      case 'Escape':
        setExpanded(false);
        onDismiss();
        break;
    }
  }, [expanded, selectedIndex, suggestions, onSelect, onDismiss]);

  if (!visible || suggestions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="overflow-hidden"
    >
      <div className="px-4 py-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Lightning className="h-3 w-3 text-primary" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              Smart Suggestions
            </span>
          </div>
          <button
            onClick={onDismiss}
            className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        <div
          className="flex flex-wrap gap-1.5"
          role="listbox"
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
          <AnimatePresence>
            {suggestions.map((suggestion, i) => {
              const Icon = suggestion.icon;
              const isSelected = i === selectedIndex;

              return (
                <motion.button
                  key={suggestion.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => onSelect(suggestion.query)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] transition-all group border',
                    isSelected
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-accent border-transparent text-foreground hover:border-muted-foreground/30 hover:bg-accent/80'
                  )}
                >
                  <Icon className={cn('h-3 w-3',
                    isSelected ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  )} />
                  <span className="truncate max-w-[200px]">{suggestion.text}</span>
                  <ArrowRight className={cn('h-2.5 w-2.5 opacity-0 -ml-1 transition-all',
                    isSelected && 'opacity-100 ml-0'
                  )} />
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
// Syntax Highlighter Component for PagePilot
// Uses highlight.js for syntax highlighting

import React, { useEffect, useRef, useState } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import { cn } from '../../utils/formatting';

// Common languages to register
const COMMON_LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'cpp', 'csharp',
  'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala',
  'html', 'css', 'scss', 'xml', 'json', 'yaml', 'toml',
  'sql', 'bash', 'powershell', 'dockerfile', 'nginx',
  'markdown', 'plaintext',
];

// Pre-register common languages
COMMON_LANGUAGES.forEach(lang => {
  try {
    hljs.registerLanguage(lang, require(`highlight.js/lib/languages/${lang}`));
  } catch {
    // Language not available, skip
  }
});

interface SyntaxHighlighterProps {
  code: string;
  language?: string;
  className?: string;
  showLineNumbers?: boolean;
  showCopyButton?: boolean;
  maxHeight?: string;
  theme?: 'dark' | 'light';
}

export function SyntaxHighlighter({
  code,
  language = 'plaintext',
  className,
  showLineNumbers = true,
  showCopyButton = true,
  maxHeight = '400px',
  theme = 'dark',
}: SyntaxHighlighterProps) {
  const [highlightedCode, setHighlightedCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (!preRef.current) return;

    try {
      let highlighted: string;
      if (hljs.getLanguage(language)) {
        highlighted = hljs.highlight(code, { language }).value;
      } else {
        highlighted = hljs.highlightAuto(code).value;
      }
      setHighlightedCode(highlighted);
    } catch (error) {
      console.warn('Syntax highlighting failed:', error);
      setHighlightedCode(code);
    }
  }, [code, language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const lines = highlightedCode ? highlightedCode.split('\n') : [];
  const lineCount = lines.length;

  return (
    <div className={cn('rounded-xl overflow-hidden bg-muted/50 border border-border/30', className)}>
      {showCopyButton && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border/20">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            {language}
          </span>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-background transition-colors text-muted-foreground hover:text-foreground"
            title="Copy code"
            aria-label="Copy code"
          >
            {copied ? (
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            )}
          </button>
        </div>
      )}

      <div style={{ maxHeight, overflow: 'auto' }}>
        <pre
          ref={preRef}
          className={cn('hljs m-0 p-4 overflow-x-auto', theme === 'dark' ? 'text-foreground' : '')}
          data-language={language}
        >
          {showLineNumbers && lineCount > 1 ? (
            <>
              <span className="absolute left-4 top-4 bottom-4 w-8 text-right pr-3 text-muted-foreground/50 border-r border-border/20 select-none pointer-events-none">
                {Array.from({ length: lineCount }, (_, i) => i + 1).map((n) => (
                  <div key={n} style={{ lineHeight: '1.5' }}>{n}</div>
                ))}
              </span>
              <code className="relative pl-14" style={{ lineHeight: '1.5' }}>
                {highlightedCode || code}
              </code>
            </>
          ) : (
            <code className={cn('hljs', language)} style={{ lineHeight: '1.5' }}>
              {highlightedCode || code}
            </code>
          )}
        </pre>
      </div>
    </div>
  );
}

export function InlineCode({ children, className }: { children: string; className?: string }) {
  return (
    <code className={cn('px-1.5 py-0.5 rounded bg-muted text-xs font-mono text-primary', className)}>
      {children}
    </code>
  );
}

export function CodeBlock({ children, language, className, ...props }: React.HTMLAttributes<HTMLPreElement> & { language?: string }) {
  return (
    <SyntaxHighlighter
      code={typeof children === 'string' ? children : ''}
      language={language}
      className={className}
      {...props}
    />
  );
}
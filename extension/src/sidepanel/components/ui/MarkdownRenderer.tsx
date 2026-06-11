// Markdown Renderer for PagePilot with syntax highlighting and sanitization

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Marked, Renderer } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import { cn } from '../../utils/formatting';

// Create a marked instance with highlight.js
const renderer = new Renderer();
renderer.code = function (code: string, infostring: string | undefined, _escaped: boolean) {
  let highlighted: string;
  const lang = infostring || '';
  if (lang && hljs.getLanguage(lang)) {
    try {
      highlighted = hljs.highlight(code, { language: lang }).value;
    } catch {
      highlighted = code;
    }
  } else {
    try {
      highlighted = hljs.highlightAuto(code).value;
    } catch {
      highlighted = code;
    }
  }
  return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
};

const parser = new Marked({ renderer, gfm: true, breaks: true });

interface MarkdownRendererProps {
  content: string;
  className?: string;
  streaming?: boolean;
  animate?: boolean;
}

export function MarkdownRenderer({
  content,
  className,
  streaming = false,
  animate = true,
}: MarkdownRendererProps) {
  const rendered = useMemo(() => {
    if (!content) return '';
    try {
      const rawHtml = parser.parse(content) as string;
      const sanitized = DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'br', 'hr',
          'ul', 'ol', 'li',
          'pre', 'code',
          'blockquote',
          'a', 'strong', 'em', 'del', 'ins', 'sub', 'sup',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'img', 'figure', 'figcaption',
          'span', 'div',
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id', 'src', 'alt', 'title'],
      });
      return sanitized;
    } catch (e) {
      console.error('Markdown rendering failed:', e);
      return `<p class="text-muted-foreground">${content}</p>`;
    }
  }, [content]);

  if (!content) return null;

  const Wrapper = animate ? motion.div : 'div';
  const animateProps = animate ? {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.3 },
  } : {};

  return (
    <Wrapper
      {...animateProps}
      className={cn(
        'prose prose-sm prose-invert max-w-none',
        'prose-headings:text-foreground prose-headings:font-semibold',
        'prose-p:text-muted-foreground prose-p:leading-relaxed',
        'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
        'prose-strong:text-foreground prose-strong:font-semibold',
        'prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono',
        'prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/30 prose-pre:rounded-xl',
        'prose-pre:p-4 prose-pre:overflow-x-auto',
        'prose-blockquote:border-l-2 prose-blockquote:border-primary/30 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground',
        'prose-ul:text-muted-foreground prose-ol:text-muted-foreground',
        'prose-li:text-muted-foreground',
        'prose-table:w-full prose-table:border-collapse',
        'prose-th:border prose-th:border-border prose-th:bg-muted prose-th:px-2 prose-th:py-1 prose-th:text-xs',
        'prose-td:border prose-td:border-border prose-td:px-2 prose-td:py-1 prose-td:text-xs',
        streaming && 'markdown-streaming',
        className
      )}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}

export function MarkdownBlock({ children, className }: { children: string; className?: string }) {
  return (
    <MarkdownRenderer
      content={children}
      className={className}
      animate={false}
    />
  );
}

export function StreamingMarkdown({
  content,
  isStreaming,
  className,
}: {
  content: string;
  isStreaming: boolean;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <MarkdownRenderer content={content} streaming={isStreaming} />
      {isStreaming && (
        <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse" />
      )}
    </div>
  );
}
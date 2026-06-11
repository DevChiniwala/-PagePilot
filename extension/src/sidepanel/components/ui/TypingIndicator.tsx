// Typing Indicator Component for PagePilot

import { motion } from 'framer-motion';
import { cn } from '../../utils/formatting';

interface TypingIndicatorProps {
  className?: string;
  dots?: number;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export function TypingIndicator({
  className,
  dots = 3,
  color = 'currentColor',
  size = 'md',
  text,
}: TypingIndicatorProps) {
  const sizeClasses = {
    sm: 'w-1 h-1 gap-0.5 text-[0.5rem]',
    md: 'w-1.5 h-1.5 gap-1 text-[0.75rem]',
    lg: 'w-2 h-2 gap-1.5 text-sm',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex items-center', sizeClasses[size])}>
        {Array.from({ length: dots }).map((_, i) => (
          <motion.span
            key={i}
            animate={{
              y: [0, -4, 0],
              opacity: [0.4, 1, 0.4],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
            style={{ backgroundColor: color }}
            className="rounded-full"
          />
        ))}
      </div>
      {text && (
        <motion.span
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-muted-foreground"
        >
          {text}
        </motion.span>
      )}
    </div>
  );
}

export function InlineTypingIndicator({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
          className="w-1.5 h-1.5 rounded-full bg-current opacity-60"
        />
      ))}
    </span>
  );
}

export function StreamingCursor({ className, blink = true }: { className?: string; blink?: boolean }) {
  return (
    <motion.span
      animate={blink ? { opacity: [1, 0, 1] } : { opacity: 1 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
      className={cn('inline-block w-0.5 h-4 bg-current ml-0.5', className)}
    />
  );
}
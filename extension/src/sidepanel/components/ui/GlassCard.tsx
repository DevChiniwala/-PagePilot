// Glassmorphism Card Components for PagePilot

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../utils/formatting';

interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'exit'> {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const variantClasses = {
  default: 'bg-card/60 backdrop-blur-xl border border-border/30',
  elevated: 'bg-card/80 backdrop-blur-2xl border border-border/20 shadow-xl',
  outlined: 'bg-transparent backdrop-blur-xl border border-border/40',
};

export function GlassCard({
  children,
  className,
  hover = false,
  variant = 'default',
  padding = 'md',
  style,
  ...props
}: GlassCardProps) {
  const hoverVariants = {
    initial: { scale: 1, y: 0 },
    hover: { scale: 1.01, y: -2 },
    tap: { scale: 0.99 },
  };

  return (
    <motion.div
      variants={hoverVariants}
      initial="initial"
      animate={hover ? "hover" : "initial"}
      whileHover={hover ? "hover" : undefined}
      whileTap={hover ? "tap" : undefined}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'rounded-2xl',
        paddingClasses[padding],
        variantClasses[variant],
        className
      )}
      style={style}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedCardProps extends GlassCardProps {
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

const directionVariants = {
  up: { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } },
  down: { initial: { opacity: 0, y: -20 }, animate: { opacity: 1, y: 0 } },
  left: { initial: { opacity: 0, x: -20 }, animate: { opacity: 1, x: 0 } },
  right: { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 } },
};

export function AnimatedCard({
  children,
  className,
  delay = 0,
  direction = 'up',
  ...props
}: AnimatedCardProps) {
  const variants = directionVariants[direction];

  return (
    <motion.div
      initial={variants.initial}
      animate={variants.animate}
      transition={{ duration: 0.4, ease: 'easeOut', delay }}
      className={cn('rounded-2xl', className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function ShimmerCard({ children, className, ...props }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'relative rounded-2xl overflow-hidden bg-card/60 backdrop-blur-xl border border-border/30',
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      <div className="relative z-10 p-4">{children}</div>
    </motion.div>
  );
}

export function FloatingCard({ children, className, delay = 0, ...props }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay }}
      className={cn(
        'rounded-2xl bg-card/80 backdrop-blur-2xl border border-border/20 shadow-2xl',
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
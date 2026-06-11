// Animated Icon Components for PagePilot

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../utils/formatting';

interface AnimatedIconProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactElement<{ className?: string }>;
  animation?: 'pulse' | 'spin' | 'bounce' | 'float' | 'rotate' | 'scale';
  delay?: number;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-7 h-7',
  xl: 'w-10 h-10',
};

const animationVariants = {
  pulse: {
    animate: { scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] },
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
  spin: {
    animate: { rotate: 360 },
    transition: { duration: 1, repeat: Infinity, ease: 'linear' },
  },
  bounce: {
    animate: { y: [0, -8, 0] },
    transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
  },
  float: {
    animate: { y: [0, -6, 0], x: [0, 3, 0] },
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
  },
  rotate: {
    animate: { rotate: [0, 10, -10, 0] },
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
  scale: {
    animate: { scale: [1, 1.05, 1] },
    transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
  },
};

export function AnimatedIcon({
  children,
  animation,
  delay = 0,
  className,
  size = 'md',
}: AnimatedIconProps) {
  const child = React.isValidElement(children)
    ? React.cloneElement(children, {
        className: cn(sizeClasses[size], children.props.className),
      })
    : children;

  if (!animation) {
    return <div className={cn('inline-flex', className)}>{child}</div>;
  }

  const { animate, transition } = animationVariants[animation];

  return (
    <motion.div
      animate={animate}
      transition={transition}
      style={{ animationDelay: `${delay}s` } as React.CSSProperties}
      className={cn('inline-flex', className)}
    >
      {child}
    </motion.div>
  );
}

export function StaggeredIcons({
  icons,
  className,
  stagger = 0.1,
  animation = 'float',
  size = 'md',
}: {
  icons: React.ReactElement<{ className?: string }>[];
  className?: string;
  stagger?: number;
  animation?: AnimatedIconProps['animation'];
  size?: AnimatedIconProps['size'];
}) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {icons.map((icon, i) => (
        <AnimatedIcon
          key={i}
          animation={animation}
          delay={i * stagger}
          size={size}
        >
          {icon}
        </AnimatedIcon>
      ))}
    </div>
  );
}

export function IconButton({
  children,
  onClick,
  className,
  variant = 'default',
  size = 'md',
  disabled,
  ...props
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'primary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
  const variantClasses = {
    default: 'bg-muted text-foreground hover:bg-muted/80',
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
    ghost: 'bg-transparent hover:bg-accent',
    destructive: 'bg-destructive/10 text-destructive hover:bg-destructive/20',
  };

  const sizeClasses = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all',
        variantClasses[variant],
        sizeClasses[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
    >
      {children}
    </motion.button>
  );
}
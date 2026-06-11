// Complexity Score Component for PagePilot

import { motion } from 'framer-motion';
import { cn } from '../../utils/formatting';

interface ComplexityScoreProps {
  score: number; // 0-100
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
}

const sizeConfig = {
  sm: { size: 40, strokeWidth: 3, fontSize: 'text-[10px]' },
  md: { size: 56, strokeWidth: 4, fontSize: 'text-xs' },
  lg: { size: 72, strokeWidth: 5, fontSize: 'text-sm' },
};

function getScoreColor(score: number): string {
  if (score < 30) return 'text-green-500';
  if (score < 60) return 'text-yellow-500';
  if (score < 80) return 'text-orange-500';
  return 'text-red-500';
}

function getScoreLabel(score: number): string {
  if (score < 30) return 'Beginner';
  if (score < 60) return 'Intermediate';
  if (score < 80) return 'Advanced';
  return 'Expert';
}

export function ComplexityScore({
  score,
  label,
  size = 'md',
  showLabel = true,
  animated = true,
}: ComplexityScoreProps) {
  const config = sizeConfig[size];
  const clampedScore = Math.max(0, Math.min(100, score));
  const circumference = 2 * Math.PI * (config.size / 2 - config.strokeWidth);
  const offset = circumference - (clampedScore / 100) * circumference;
  const colorClass = getScoreColor(clampedScore);
  const scoreLabel = label || getScoreLabel(clampedScore);

  return (
    <div className="flex items-center gap-2">
      <div className="relative inline-flex items-center justify-center">
        <svg
          width={config.size}
          height={config.size}
          viewBox={`0 0 ${config.size} ${config.size}`}
          className="transform -rotate-90"
        >
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={config.size / 2 - config.strokeWidth}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            className="text-muted"
            opacity={0.2}
          />
          <motion.circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={config.size / 2 - config.strokeWidth}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={animated ? { strokeDashoffset: circumference } : false}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={colorClass}
          />
        </svg>
        <span className={cn('absolute font-semibold text-foreground', config.fontSize)}>
          {clampedScore}
        </span>
      </div>
      {showLabel && (
        <div className="flex flex-col">
          <span className="text-xs font-medium text-foreground">{scoreLabel}</span>
          <span className="text-[10px] text-muted-foreground">Complexity</span>
        </div>
      )}
    </div>
  );
}

export function ComplexityBadge({ score }: { score: number }) {
  const colorClass = getScoreColor(score);
  const label = getScoreLabel(score);

  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
        'border',
        score < 30 && 'bg-green-500/10 border-green-500/30 text-green-400',
        score >= 30 && score < 60 && 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
        score >= 60 && score < 80 && 'bg-orange-500/10 border-orange-500/30 text-orange-400',
        score >= 80 && 'bg-red-500/10 border-red-500/30 text-red-400',
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', colorClass)} />
      {label} ({score})
    </motion.span>
  );
}

export function ComplexityBar({ score, animated = true }: { score: number; animated?: boolean }) {
  const clampedScore = Math.max(0, Math.min(100, score));

  return (
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
      <motion.div
        initial={animated ? { width: 0 } : false}
        animate={{ width: `${clampedScore}%` }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className={cn(
          'h-full rounded-full',
          score < 30 && 'bg-green-500',
          score >= 30 && score < 60 && 'bg-yellow-500',
          score >= 60 && score < 80 && 'bg-orange-500',
          score >= 80 && 'bg-red-500',
        )}
      />
    </div>
  );
}
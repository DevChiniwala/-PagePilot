// Login Prompt Component for PagePilot Side Panel

import { motion } from 'framer-motion';
import { Sparkles, Brain, Zap, MessageSquare, Chrome } from 'lucide-react';

interface LoginPromptProps {
  onLogin: () => void;
}

export function LoginPrompt({ onLogin }: LoginPromptProps) {
  return (
    <div className="h-full w-full flex items-center justify-center p-6 bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-sm w-full space-y-6 text-center"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-2xl font-bold text-foreground mb-2">PagePilot</h1>
          <p className="text-sm text-muted-foreground">
            AI-powered web intelligence. Summarize, analyze, and chat with any webpage.
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-2"
        >
          {[
            { icon: Brain, text: 'Deep analysis with citations' },
            { icon: Zap, text: 'Instant summaries in any mode' },
            { icon: MessageSquare, text: 'Chat with page content' },
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-card border border-border">
              <feature.icon className="h-4 w-4 text-primary" />
              <span className="text-sm text-foreground">{feature.text}</span>
            </div>
          ))}
        </motion.div>

        {/* Login Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <button
            onClick={onLogin}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
          >
            <Chrome className="h-5 w-5" />
            Sign in with Google
          </button>
          <p className="mt-3 text-[10px] text-muted-foreground">
            Secure authentication via Google OAuth. Your data stays private.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
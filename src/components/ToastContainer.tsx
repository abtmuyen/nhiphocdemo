import { AnimatePresence, motion } from 'motion/react';
import { Bell, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { ToastItem } from '../types';
import { playClickSound } from '../utils/sound';

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 w-[calc(100vw-2rem)] max-w-sm pointer-events-none"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon =
            toast.tone === 'success'
              ? CheckCircle2
              : toast.tone === 'warning' || toast.tone === 'error'
                ? AlertTriangle
                : Bell;

          const iconColor =
            toast.tone === 'success'
              ? 'text-[#3F7A47] dark:text-[#78C282]'
              : toast.tone === 'error'
                ? 'text-[#B9382C] dark:text-[#F07D72]'
                : 'text-[#C45A15] dark:text-[#EA7D35]';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="pointer-events-auto note-surface rounded-xl px-4 py-3 flex items-start gap-3 shadow-lg"
            >
              <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconColor}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#231E18] dark:text-[#FBF8F1] leading-snug">
                  {toast.title}
                </p>
                {toast.description && (
                  <p className="text-xs text-[#6B6154] dark:text-[#B5A898] mt-0.5 leading-relaxed">
                    {toast.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onDismiss(toast.id);
                }}
                aria-label="Đóng thông báo"
                className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-[#6B6154] hover:text-[#231E18] dark:text-[#B5A898] dark:hover:text-[#FBF8F1] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

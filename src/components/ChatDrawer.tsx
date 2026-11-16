import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { ChatMessage, StudentProfile, UserPublic } from '../types';
import { ChatPanel } from './ChatPanel';
import { playClickSound } from '../utils/sound';

interface ChatDrawerProps {
  open: boolean;
  onClose: () => void;
  student: StudentProfile;
  messages: ChatMessage[];
  currentUser: UserPublic;
  dark?: boolean;
}

export function ChatDrawer({
  open,
  onClose,
  student,
  messages,
  currentUser,
  dark = false,
}: ChatDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <div
          className={`fixed inset-0 z-50 flex justify-end ${dark ? 'dark' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="Hộp tin nhắn"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="fixed inset-0 bg-black/45 backdrop-blur-xs"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative z-10 w-full max-w-md h-full bg-[#FBF8F1] dark:bg-[#181410] border-l border-[#E5DBC4] dark:border-[#362E25] flex flex-col p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 pb-3">
              <div>
                <p className="text-[11px] font-bold text-[#6B6154] dark:text-[#B5A898]">
                  Trao đổi trực tiếp
                </p>
                <h2 className="font-display text-lg font-extrabold text-[#231E18] dark:text-[#FBF8F1]">
                  Tin nhắn · {student.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onClose();
                }}
                aria-label="Đóng hộp tin nhắn"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-[#E5DBC4] dark:border-[#362E25] bg-[#FFFDF8] dark:bg-[#241E18] text-[#6B6154] dark:text-[#B5A898] hover:text-[#231E18] dark:hover:text-[#FBF8F1]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <ChatPanel
                student={student}
                messages={messages}
                currentUser={currentUser}
                embedded
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

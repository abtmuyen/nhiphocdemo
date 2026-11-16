import React, { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { ChatMessage, StudentProfile, UserPublic, UserRole } from '../types';
import { markMessagesAsRead, sendChatMessage } from '../services/firestoreService';
import { formatTimestampVi } from '../utils/dateUtils';
import { playClickSound } from '../utils/sound';

interface ChatPanelProps {
  student: StudentProfile;
  messages: ChatMessage[];
  currentUser: UserPublic;
  embedded?: boolean;
}

const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Học sinh',
  parent: 'Phụ huynh',
  assistant: 'Trợ lý',
};

export function ChatPanel({ student, messages, currentUser, embedded = false }: ChatPanelProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  const studentMessages = messages
    .filter((m) => m.studentId === student.id)
    .sort((a, b) => {
      const ta = a.createdAt?.toMillis() ?? 0;
      const tb = b.createdAt?.toMillis() ?? 0;
      return ta - tb;
    });

  useEffect(() => {
    markMessagesAsRead(studentMessages, currentUser.uid).catch(() => {});
  }, [studentMessages.length, student.id, currentUser.uid]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [studentMessages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    playClickSound();
    setSending(true);
    setErrorMsg('');
    try {
      await sendChatMessage({
        student,
        senderUid: currentUser.uid,
        senderName: currentUser.displayName,
        senderRole: currentUser.role,
        text: trimmed,
      });
      setText('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không gửi được tin nhắn.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={`note-surface rounded-2xl flex flex-col overflow-hidden ${
        embedded ? 'flex-1 h-full min-h-0' : 'h-[520px] sm:h-[580px]'
      }`}
    >
      <div className="px-5 py-3.5 border-b border-[#E5DBC4] dark:border-[#362E25] flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-[#231E18] dark:text-[#FBF8F1]">
            Hộp tin nhắn · {student.name}
          </h3>
          <p className="text-xs text-[#6B6154] dark:text-[#B5A898]">
            Trao đổi trực tiếp giữa Học sinh, Phụ huynh và Trợ lý
          </p>
        </div>
        <span className="text-xs font-medium text-[#6B6154] dark:text-[#B5A898] tabular-nums whitespace-nowrap">
          {studentMessages.length} tin nhắn
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {studentMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <p className="text-sm font-semibold text-[#231E18] dark:text-[#FBF8F1]">
              Chưa có tin nhắn nào
            </p>
            <p className="text-xs text-[#6B6154] dark:text-[#B5A898] mt-1">
              Hãy gửi lời chào đầu tiên để cả nhóm cùng đồng hành nhé.
            </p>
          </div>
        ) : (
          studentMessages.map((msg) => {
            const isMine = msg.senderUid === currentUser.uid;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 text-[11px] text-[#6B6154] dark:text-[#B5A898] mb-1 px-1">
                  <span className="font-bold text-[#231E18] dark:text-[#FBF8F1]">
                    {isMine ? 'Bạn' : msg.senderName}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{ROLE_LABELS[msg.senderRole]}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{formatTimestampVi(msg.createdAt)}</span>
                </div>
                <div
                  className={`max-w-[82%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    isMine
                      ? 'bg-[#C45A15] text-white'
                      : 'bg-[#F3ECDC] dark:bg-[#2C251E] text-[#231E18] dark:text-[#FBF8F1] border border-[#E5DBC4] dark:border-[#3B3228]'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {errorMsg && (
        <div className="px-4 py-2 text-xs text-[#B9382C] dark:text-[#F07D72] bg-[#FDECEB] dark:bg-[#3A1F1D]">
          {errorMsg}
        </div>
      )}

      <form
        onSubmit={handleSend}
        className="p-3 border-t border-[#E5DBC4] dark:border-[#362E25] flex items-center gap-2 bg-[#FAF4E8]/70 dark:bg-[#1B1713]"
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhập tin nhắn trao đổi..."
          maxLength={2000}
          className="flex-1 min-h-[44px] rounded-xl px-3.5 py-2 text-sm bg-[#FFFDF8] dark:bg-[#26201A] border border-[#E5DBC4] dark:border-[#3B3228] text-[#231E18] dark:text-[#FBF8F1] placeholder:text-[#8E8272] focus:outline-none focus:ring-2 focus:ring-[#C45A15]"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-[#C45A15] hover:bg-[#AA4C0F] disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
        >
          <Send className="w-4 h-4" />
          <span>Gửi</span>
        </button>
      </form>
    </div>
  );
}

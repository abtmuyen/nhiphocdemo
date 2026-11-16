import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  Copy,
  Check,
  KeyRound,
  PlusCircle,
  Trash2,
  Volume2,
  VolumeX,
  X,
  LogOut,
  AlertTriangle,
} from 'lucide-react';
import { StudentProfile, UserPrivate, UserPublic } from '../types';
import {
  createStudentWorkspace,
  deleteAccountAndData,
  joinStudentByInviteCode,
} from '../services/firestoreService';
import { playClickSound, playSuccessSound } from '../utils/sound';
import { signOutUser } from '../firebase';

interface AccountModalProps {
  open: boolean;
  onClose: () => void;
  user: User;
  userPublic: UserPublic;
  userPrivate: UserPrivate | null;
  students: StudentProfile[];
  activeStudent: StudentProfile | null;
  soundOn: boolean;
  onToggleSound: () => void;
  initialSection?: 'default' | 'delete';
  dark?: boolean;
}

const ROLE_TEXT = {
  student: 'Học sinh',
  parent: 'Phụ huynh',
  assistant: 'Trợ lý (Gia sư)',
};

export function AccountModal({
  open,
  onClose,
  user,
  userPublic,
  userPrivate,
  students,
  activeStudent,
  soundOn,
  onToggleSound,
  initialSection = 'default',
  dark = false,
}: AccountModalProps) {
  const [copiedCode, setCopiedCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newGrade, setNewGrade] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(initialSection === 'delete');
  const [deleteTyped, setDeleteTyped] = useState('');

  React.useEffect(() => {
    if (open) {
      setConfirmDelete(initialSection === 'delete');
      setDeleteTyped('');
      setFeedback(null);
    }
  }, [open, initialSection]);

  if (!open) return null;

  const handleCopy = async (code: string) => {
    playClickSound();
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(''), 2000);
    } catch {
      setFeedback({ type: 'err', text: 'Không thể sao chép tự động, vui lòng bôi đen mã để sao chép.' });
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || busy) return;
    playClickSound();
    setBusy(true);
    setFeedback(null);
    try {
      const invite = await joinStudentByInviteCode(user.uid, userPublic.role, joinCode);
      playSuccessSound();
      setJoinCode('');
      setFeedback({
        type: 'ok',
        text: `Đã liên kết thành công với hồ sơ ${invite.studentName} (${invite.grade}).`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể liên kết.';
      if (msg.includes('Missing or insufficient permissions') || msg.includes('permission-denied')) {
        setFeedback({
          type: 'err',
          text: 'Vị trí vai trò của bạn trong hồ sơ này đã có người khác kết nối.',
        });
      } else {
        setFeedback({ type: 'err', text: msg });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newGrade.trim() || busy) return;
    playClickSound();
    setBusy(true);
    setFeedback(null);
    try {
      const created = await createStudentWorkspace(user.uid, userPublic.role, newName, newGrade);
      playSuccessSound();
      setNewName('');
      setNewGrade('');
      setFeedback({
        type: 'ok',
        text: `Đã tạo hồ sơ ${created.name} · Mã kết nối: ${created.inviteCode}`,
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Không thể tạo hồ sơ học sinh.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteTyped.trim().toUpperCase() !== 'XOA' || busy) return;
    playClickSound();
    setBusy(true);
    setFeedback(null);
    try {
      await deleteAccountAndData(user, userPublic, students);
      onClose();
    } catch (err) {
      setFeedback({
        type: 'err',
        text:
          err instanceof Error
            ? `Lỗi xóa tài khoản: ${err.message}`
            : 'Không thể xóa tài khoản lúc này.',
      });
      setBusy(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto ${dark ? 'dark' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Hồ sơ và kết nối"
    >
      <div className="note-surface rounded-3xl w-full max-w-xl p-6 space-y-5 my-auto max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-4 border-b border-[#E5DBC4] dark:border-[#362E25] pb-3.5">
          <div>
            <h2 className="font-display text-xl font-bold text-[#231E18] dark:text-[#FBF8F1]">
              Tài khoản & Kết nối
            </h2>
            <p className="text-xs text-[#6B6154] dark:text-[#B5A898]">
              {userPublic.displayName} · {ROLE_TEXT[userPublic.role]}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            aria-label="Đóng"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[#6B6154] hover:text-[#231E18] dark:text-[#B5A898] dark:hover:text-[#FBF8F1]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Personal Info */}
        <div className="rounded-2xl p-4 bg-[#FAF4E8] dark:bg-[#191511] border border-[#E5DBC4] dark:border-[#362E25] space-y-1.5 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-[#6B6154] dark:text-[#B5A898]">Email</span>
            <span className="font-semibold text-[#231E18] dark:text-[#FBF8F1] truncate">
              {userPrivate?.email || user.email || '—'}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#6B6154] dark:text-[#B5A898]">Số điện thoại</span>
            <span className="font-semibold text-[#231E18] dark:text-[#FBF8F1] tabular-nums">
              {userPrivate?.phone || '—'}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-[#E5DBC4] dark:border-[#362E25]">
            <span className="text-[#6B6154] dark:text-[#B5A898]">Âm thanh thông báo & nút bấm</span>
            <button
              type="button"
              onClick={onToggleSound}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#FFFDF8] dark:bg-[#26201A] border border-[#E5DBC4] dark:border-[#3B3228] text-xs font-bold flex items-center gap-1.5 text-[#231E18] dark:text-[#FBF8F1]"
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-[#C45A15]" /> : <VolumeX className="w-4 h-4" />}
              <span>{soundOn ? 'Đang bật' : 'Đang tắt'}</span>
            </button>
          </div>
        </div>

        {/* Active student invite code */}
        {activeStudent && (
          <div className="rounded-2xl p-4 bg-[#FFF3E6] dark:bg-[#2B2016] border border-[#E6B88A] dark:border-[#5C3A1E] space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#9C440C] dark:text-[#F09A5E]">
                  Mã kết nối của {activeStudent.name} ({activeStudent.grade})
                </p>
                <p className="font-mono-code text-xl font-bold tracking-widest text-[#231E18] dark:text-[#FBF8F1] mt-0.5">
                  {activeStudent.inviteCode}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(activeStudent.inviteCode)}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#C45A15] hover:bg-[#AA4C0F] text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
              >
                {copiedCode === activeStudent.inviteCode ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-[#6B6154] dark:text-[#B5A898]">
              Thành viên đã kết nối: {activeStudent.studentUid ? 'Học sinh ✓' : 'Chưa có Học sinh'} ·{' '}
              {activeStudent.parentUid ? 'Phụ huynh ✓' : 'Chưa có Phụ huynh'} ·{' '}
              {activeStudent.assistantUid ? 'Trợ lý ✓' : 'Chưa có Trợ lý'}
            </p>
          </div>
        )}

        {feedback && (
          <div
            className={`rounded-xl p-3 text-xs font-semibold ${
              feedback.type === 'ok'
                ? 'bg-[#E9F5EC] dark:bg-[#1E3323] text-[#2B6334] dark:text-[#8CD497]'
                : 'bg-[#FDECEB] dark:bg-[#3A1F1D] text-[#8E2A20] dark:text-[#F07D72]'
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* Join by invite code */}
        <form onSubmit={handleJoin} className="space-y-2">
          <label className="block text-xs font-bold text-[#231E18] dark:text-[#FBF8F1]">
            Liên kết thêm hồ sơ bằng mã NH...
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Nhập mã NH..."
              maxLength={12}
              className="flex-1 min-h-[44px] rounded-xl px-3.5 py-2 text-sm font-mono-code bg-[#FFFDF8] dark:bg-[#191511] border border-[#E5DBC4] dark:border-[#362E25] text-[#231E18] dark:text-[#FBF8F1]"
            />
            <button
              type="submit"
              disabled={!joinCode.trim() || busy}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#231E18] dark:bg-[#E0732C] text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>Kết nối</span>
            </button>
          </div>
        </form>

        {/* Create new student profile (for Parent or Assistant) */}
        {userPublic.role !== 'student' && (
          <form
            onSubmit={handleCreateStudent}
            className="space-y-2.5 pt-3 border-t border-[#E5DBC4] dark:border-[#362E25]"
          >
            <label className="block text-xs font-bold text-[#231E18] dark:text-[#FBF8F1]">
              Tạo thêm hồ sơ học sinh mới
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Tên học sinh"
                maxLength={80}
                className="min-h-[42px] rounded-xl px-3 py-2 text-sm bg-[#FFFDF8] dark:bg-[#191511] border border-[#E5DBC4] dark:border-[#362E25] text-[#231E18] dark:text-[#FBF8F1]"
              />
              <input
                type="text"
                value={newGrade}
                onChange={(e) => setNewGrade(e.target.value)}
                placeholder="Lớp (vd: Lớp 9A)"
                maxLength={40}
                className="min-h-[42px] rounded-xl px-3 py-2 text-sm bg-[#FFFDF8] dark:bg-[#191511] border border-[#E5DBC4] dark:border-[#362E25] text-[#231E18] dark:text-[#FBF8F1]"
              />
            </div>
            <button
              type="submit"
              disabled={!newName.trim() || !newGrade.trim() || busy}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[#C45A15] hover:bg-[#AA4C0F] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tạo hồ sơ học sinh</span>
            </button>
          </form>
        )}

        {/* Danger Zone & Sign Out */}
        <div className="pt-4 border-t border-[#E5DBC4] dark:border-[#362E25] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                signOutUser();
              }}
              className="min-h-[42px] px-4 py-2 rounded-xl border border-[#E5DBC4] dark:border-[#3B3228] text-xs font-bold text-[#231E18] dark:text-[#FBF8F1] hover:bg-[#F3ECDC] dark:hover:bg-[#2C251E] flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất</span>
            </button>

            {!confirmDelete && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setConfirmDelete(true);
                }}
                className="min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold text-[#B9382C] dark:text-[#F07D72] hover:bg-[#FDECEB] dark:hover:bg-[#3A1F1D] flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa tài khoản & dữ liệu</span>
              </button>
            )}
          </div>

          {confirmDelete && (
            <div className="rounded-2xl p-4 bg-[#FDECEB] dark:bg-[#3A1F1D] border border-[#E5A9A2] dark:border-[#703632] space-y-3">
              <div className="flex items-start gap-2 text-xs text-[#8E2A20] dark:text-[#F7B6AF]">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Hành động này sẽ xóa vĩnh viễn tài khoản, thông tin cá nhân và gỡ liên kết/dữ liệu của bạn. Nhập chữ <strong>XOA</strong> để xác nhận.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={deleteTyped}
                  onChange={(e) => setDeleteTyped(e.target.value)}
                  placeholder="Nhập XOA"
                  className="flex-1 min-h-[40px] rounded-xl px-3 py-1.5 text-sm bg-white dark:bg-[#241413] border border-[#E5A9A2] dark:border-[#703632] text-[#231E18] dark:text-[#FBF8F1]"
                />
                <button
                  type="button"
                  disabled={deleteTyped.trim().toUpperCase() !== 'XOA' || busy}
                  onClick={handleDeleteAccount}
                  className="min-h-[40px] px-4 py-1.5 rounded-xl bg-[#B9382C] hover:bg-[#992C22] disabled:opacity-50 text-white text-xs font-bold"
                >
                  {busy ? 'Đang xóa...' : 'Xác nhận xóa'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setConfirmDelete(false);
                    setDeleteTyped('');
                  }}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold text-[#6B6154] dark:text-[#B5A898]"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

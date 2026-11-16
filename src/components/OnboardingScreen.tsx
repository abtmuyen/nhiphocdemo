import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { ArrowRight, KeyRound, PlusCircle, LogOut, AlertCircle } from 'lucide-react';
import { UserRole } from '../types';
import { createOnboardingProfile } from '../services/firestoreService';
import { NhipNhoMascot } from './NhipNhoMascot';
import { playClickSound, playSuccessSound } from '../utils/sound';
import { signOutUser } from '../firebase';

interface OnboardingScreenProps {
  user: User;
  onCompleted: () => void;
}

export function OnboardingScreen({ user, onCompleted }: OnboardingScreenProps) {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [studentName, setStudentName] = useState('');
  const [studentGrade, setStudentGrade] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    setErrorMsg('');

    if (!displayName.trim()) {
      setErrorMsg('Vui lòng nhập tên hiển thị.');
      return;
    }
    if (phone.trim().length < 6) {
      setErrorMsg('Vui lòng nhập số điện thoại hợp lệ (tối thiểu 6 ký tự).');
      return;
    }
    if (mode === 'create') {
      if (role !== 'student' && !studentName.trim()) {
        setErrorMsg('Vui lòng nhập tên học sinh cho hồ sơ mới.');
        return;
      }
      if (!studentGrade.trim()) {
        setErrorMsg('Vui lòng nhập lớp học hiện tại (ví dụ: Lớp 8A).');
        return;
      }
    } else if (!inviteCode.trim()) {
      setErrorMsg('Vui lòng nhập mã kết nối dạng NH...');
      return;
    }

    setSubmitting(true);
    try {
      await createOnboardingProfile({
        user,
        displayName,
        phone,
        role,
        mode,
        studentName: role === 'student' ? studentName.trim() || displayName.trim() : studentName.trim(),
        studentGrade: studentGrade.trim(),
        inviteCode,
      });
      playSuccessSound();
      onCompleted();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể khởi tạo hồ sơ.';
      if (msg.includes('Missing or insufficient permissions') || msg.includes('permission-denied')) {
        setErrorMsg(
          'Không thể liên kết vào mã này: vị trí vai trò của bạn trong hồ sơ học sinh có thể đã có người khác kết nối.',
        );
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen paper-bg-light text-[#231E18] py-8 px-4 sm:px-6 flex items-center justify-center">
      <div className="max-w-2xl w-full space-y-6">
        <div className="flex items-center justify-between gap-4">
          <NhipNhoMascot
            mood={errorMsg ? 'surprised' : 'study'}
            size="md"
            message="Cùng thiết lập tờ giấy note đầu tiên của bạn nhé!"
          />
          <button
            type="button"
            onClick={() => {
              playClickSound();
              signOutUser();
            }}
            className="min-h-[40px] px-3 py-2 text-xs font-semibold text-[#6B6154] hover:text-[#231E18] flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>Đổi tài khoản</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="note-surface note-tape rounded-3xl p-6 sm:p-8 space-y-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#231E18]">
              Chào mừng đến với NhịpHọc
            </h1>
            <p className="text-sm text-[#6B6154] mt-1">
              Email: {user.email || 'Tài khoản Google'} · Thông tin cá nhân luôn được bảo mật riêng tư.
            </p>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="rounded-xl p-3.5 bg-[#FDECEB] border border-[#E5A9A2] text-[#8E2A20] text-sm flex items-start gap-2.5"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#231E18] mb-1.5">
                Tên hiển thị *
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ví dụ: Minh Anh"
                maxLength={80}
                required
                className="w-full min-h-[44px] rounded-xl px-3.5 py-2 text-sm bg-[#FFFDF8] border border-[#E5DBC4] focus:outline-none focus:ring-2 focus:ring-[#C45A15]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#231E18] mb-1.5">
                Số điện thoại liên hệ *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ví dụ: 0912345678"
                maxLength={20}
                required
                className="w-full min-h-[44px] rounded-xl px-3.5 py-2 text-sm bg-[#FFFDF8] border border-[#E5DBC4] focus:outline-none focus:ring-2 focus:ring-[#C45A15]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#231E18] mb-2">
              Vai trò của bạn *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'student' as const, title: 'Học sinh', desc: 'Làm bài & nuôi Cây Tập Trung' },
                { id: 'parent' as const, title: 'Phụ huynh', desc: 'Theo dõi tiến độ & đặt lịch' },
                { id: 'assistant' as const, title: 'Trợ lý (Gia sư)', desc: 'Giao bài, chấm điểm & hỗ trợ' },
              ].map((item) => {
                const active = role === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setRole(item.id);
                    }}
                    className={`text-left rounded-2xl p-3.5 border transition-all min-h-[76px] ${
                      active
                        ? 'bg-[#FFF3E6] border-[#C45A15] ring-2 ring-[#C45A15]/25'
                        : 'bg-[#FFFDF8] border-[#E5DBC4] hover:border-[#C45A15]/50'
                    }`}
                  >
                    <div className="font-bold text-sm text-[#231E18]">{item.title}</div>
                    <div className="text-xs text-[#6B6154] mt-0.5">{item.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-[#E5DBC4] space-y-4">
            <div className="flex items-center gap-1 p-1 bg-[#F2E9D8] rounded-xl">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setMode('create');
                }}
                className={`flex-1 min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                  mode === 'create'
                    ? 'bg-[#FFFDF8] text-[#231E18] shadow-sm'
                    : 'text-[#6B6154] hover:text-[#231E18]'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>{role === 'student' ? 'Tự tạo không gian học' : 'Tạo hồ sơ học sinh mới'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setMode('join');
                }}
                className={`flex-1 min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                  mode === 'join'
                    ? 'bg-[#FFFDF8] text-[#231E18] shadow-sm'
                    : 'text-[#6B6154] hover:text-[#231E18]'
                }`}
              >
                <KeyRound className="w-4 h-4" />
                <span>Nhập mã kết nối NH...</span>
              </button>
            </div>

            {mode === 'create' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#231E18] mb-1.5">
                    {role === 'student' ? 'Tên học sinh (mặc định theo tên bạn)' : 'Tên học sinh *'}
                  </label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder={role === 'student' ? displayName || 'Tên của bạn' : 'Ví dụ: Gia Bảo'}
                    maxLength={80}
                    required={role !== 'student'}
                    className="w-full min-h-[44px] rounded-xl px-3.5 py-2 text-sm bg-[#FFFDF8] border border-[#E5DBC4] focus:outline-none focus:ring-2 focus:ring-[#C45A15]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#231E18] mb-1.5">
                    Lớp / Khối học *
                  </label>
                  <input
                    type="text"
                    value={studentGrade}
                    onChange={(e) => setStudentGrade(e.target.value)}
                    placeholder="Ví dụ: Lớp 7B"
                    maxLength={40}
                    required
                    className="w-full min-h-[44px] rounded-xl px-3.5 py-2 text-sm bg-[#FFFDF8] border border-[#E5DBC4] focus:outline-none focus:ring-2 focus:ring-[#C45A15]"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-[#231E18] mb-1.5">
                  Mã kết nối hồ sơ học sinh (6–12 ký tự) *
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: NH8K4P2M"
                  maxLength={12}
                  required
                  className="w-full min-h-[44px] rounded-xl px-3.5 py-2 text-sm font-mono-code tracking-wider bg-[#FFFDF8] border border-[#E5DBC4] focus:outline-none focus:ring-2 focus:ring-[#C45A15]"
                />
                <p className="text-xs text-[#6B6154] mt-1.5">
                  Mỗi hồ sơ kết nối tối đa 1 Học sinh, 1 Phụ huynh và 1 Trợ lý.
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[48px] rounded-xl bg-[#C45A15] hover:bg-[#AA4C0F] disabled:opacity-60 text-white font-bold text-base flex items-center justify-center gap-2 transition-colors"
          >
            <span>{submitting ? 'Đang khởi tạo không gian...' : 'Bắt đầu vào NhịpHọc'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

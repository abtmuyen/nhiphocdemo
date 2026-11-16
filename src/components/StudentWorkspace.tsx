import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  Flame,
  LogOut,
  Menu,
  MessageSquare,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings,
  Sparkles,
  Star,
  Trash2,
  TreePine,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  Assignment,
  AssignmentStatus,
  ChatMessage,
  FocusSession,
  Schedule,
  StudentProfile,
  UserPublic,
} from '../types';
import {
  createAssignment,
  deletePendingAssignment,
  recordFocusSession,
  submitAssignmentWork,
} from '../services/firestoreService';
import { signOutUser } from '../firebase';
import { formatTimestampVi } from '../utils/dateUtils';
import { playClickSound, playSuccessSound } from '../utils/sound';
import {
  HeartbeatSlogan,
  MascotAvatar,
  NhiphocAnimatedLogo,
  NhiphocLogoMark,
} from './NhipNhoMascot';
import { FocusTree } from './FocusTree';
import { ChatDrawer } from './ChatDrawer';
import { CameraCaptureModal } from './CameraCaptureModal';

interface StudentWorkspaceProps {
  currentUser: UserPublic;
  students: StudentProfile[];
  activeStudent: StudentProfile | null;
  onSelectStudent: (id: string) => void;
  assignments: Assignment[];
  focusSessions: FocusSession[];
  messages: ChatMessage[];
  schedules: Schedule[];
  linkedAssistant: UserPublic | null;
  unreadMessageCount: number;
  soundOn: boolean;
  onToggleSound: () => void;
  onOpenAccount: (section?: 'default' | 'delete') => void;
}

type StudentTab = 'today' | 'extra' | 'schedules' | 'focus';
type AssignmentFilter = 'all' | AssignmentStatus;

const SCHEDULE_STATUS_LABEL = {
  requested: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

export function StudentWorkspace({
  currentUser,
  students,
  activeStudent,
  onSelectStudent,
  assignments,
  focusSessions,
  messages,
  schedules,
  linkedAssistant,
  unreadMessageCount,
  soundOn,
  onToggleSound,
  onOpenAccount,
}: StudentWorkspaceProps) {
  const [tab, setTab] = useState<StudentTab>('today');
  const [filter, setFilter] = useState<AssignmentFilter>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  // Student self-practice extra assignment modal
  const [practiceModalOpen, setPracticeModalOpen] = useState(false);
  const [practiceSubject, setPracticeSubject] = useState('');
  const [practiceTitle, setPracticeTitle] = useState('');
  const [practiceDesc, setPracticeDesc] = useState('');
  const [practiceBusy, setPracticeBusy] = useState(false);
  const [practiceErr, setPracticeErr] = useState('');

  // Pomodoro state
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [focusNote, setFocusNote] = useState('');
  const [savingFocus, setSavingFocus] = useState(false);
  const [focusMessage, setFocusMessage] = useState('');
  const completionHandledRef = useRef(false);

  const allStudentAssignments = useMemo(
    () =>
      activeStudent
        ? assignments
            .filter((a) => a.studentId === activeStudent.id)
            .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
        : [],
    [assignments, activeStudent],
  );

  const activeType = tab === 'extra' ? 'extra' : 'today';

  const tabAssignments = useMemo(
    () => allStudentAssignments.filter((a) => a.type === activeType),
    [allStudentAssignments, activeType],
  );

  const filteredAssignments = useMemo(() => {
    if (filter === 'all') return tabAssignments;
    return tabAssignments.filter((a) => a.status === filter);
  }, [tabAssignments, filter]);

  const studentSchedules = useMemo(
    () =>
      activeStudent
        ? schedules
            .filter((s) => s.studentId === activeStudent.id)
            .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
        : [],
    [schedules, activeStudent],
  );

  const studentSessions = useMemo(
    () =>
      activeStudent
        ? focusSessions
            .filter((s) => s.studentId === activeStudent.id)
            .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
        : [],
    [focusSessions, activeStudent],
  );

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (running && secondsLeft === 0 && !completionHandledRef.current && activeStudent) {
      completionHandledRef.current = true;
      setRunning(false);
      handleLogFocus(durationMinutes);
    }
  }, [secondsLeft, running, activeStudent, durationMinutes]);

  const handleSelectDuration = (mins: number) => {
    if (running) return;
    playClickSound();
    const clamped = Math.min(180, Math.max(1, mins));
    setDurationMinutes(clamped);
    setSecondsLeft(clamped * 60);
    completionHandledRef.current = false;
    setFocusMessage('');
  };

  const handleLogFocus = async (minsToSave: number) => {
    if (!activeStudent || savingFocus) return;
    setSavingFocus(true);
    setFocusMessage('');
    try {
      await recordFocusSession({
        student: activeStudent,
        studentUid: currentUser.uid,
        durationMinutes: minsToSave,
        note: focusNote,
      });
      playSuccessSound();
      setFocusNote('');
      setSecondsLeft(durationMinutes * 60);
      completionHandledRef.current = false;
      setFocusMessage(`Tuyệt vời! Cây Tập Trung vừa nhận thêm ${minsToSave} phút chăm chỉ.`);
    } catch (err) {
      setFocusMessage(err instanceof Error ? err.message : 'Không lưu được phiên tập trung.');
    } finally {
      setSavingFocus(false);
    }
  };

  const handleFinishEarly = () => {
    playClickSound();
    const elapsedSeconds = durationMinutes * 60 - secondsLeft;
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    if (elapsedMinutes < 1) {
      setFocusMessage('Hãy tập trung ít nhất 1 phút trước khi lưu phiên nhé!');
      return;
    }
    setRunning(false);
    handleLogFocus(elapsedMinutes);
  };

  const handleSubmitAssignment = async (imageDataUrl: string, studentNote: string) => {
    if (!selectedAssignment) return;
    await submitAssignmentWork({
      assignmentId: selectedAssignment.id,
      submissionImageDataUrl: imageDataUrl,
      studentNote,
    });
    playSuccessSound();
  };

  const handleCreatePractice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent || practiceBusy) return;
    playClickSound();
    setPracticeBusy(true);
    setPracticeErr('');
    try {
      await createAssignment({
        student: activeStudent,
        createdByUid: currentUser.uid,
        type: 'extra',
        subject: practiceSubject,
        title: practiceTitle,
        description:
          practiceDesc.trim() ||
          'Bài tập tự luyện giúp rèn thêm kỹ năng và nhận thêm phút Cây tập trung.',
        dueDate: 'Linh hoạt trong tuần',
      });
      playSuccessSound();
      setPracticeModalOpen(false);
      setPracticeSubject('');
      setPracticeTitle('');
      setPracticeDesc('');
    } catch (err) {
      setPracticeErr(err instanceof Error ? err.message : 'Không thêm được bài tự luyện.');
    } finally {
      setPracticeBusy(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!activeStudent) return;
    playClickSound();
    try {
      await navigator.clipboard.writeText(activeStudent.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      onOpenAccount('default');
    }
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  const todayAssignments = allStudentAssignments.filter((a) => a.type === 'today');
  const doneCount = tabAssignments.filter((a) => a.status !== 'pending').length;
  const gradedCount = tabAssignments.filter((a) => a.status === 'graded').length;
  const completionPercent =
    tabAssignments.length > 0 ? Math.round((doneCount / tabAssignments.length) * 100) : 0;

  const pageTitleMap: Record<StudentTab, string> = {
    today: 'Bài tập hôm nay',
    extra: 'Bài tập bổ sung',
    schedules: 'Lịch học của em',
    focus: 'Cây tập trung',
  };

  const heroGreetingMap: Record<StudentTab, string> = {
    today: `Xin chào, ${currentUser.displayName}! Hôm nay mình cùng làm từng chút một nhé!`,
    extra: `Xin chào, ${currentUser.displayName}! Cùng khám phá bài tự luyện sáng tạo nhé!`,
    schedules: `Xin chào, ${currentUser.displayName}! Theo dõi lịch học và check-in cùng Trợ lý nhé!`,
    focus: `Xin chào, ${currentUser.displayName}! Giữ nhịp tập trung để Cây xanh lớn nhanh nhé!`,
  };

  const navItems: { id: StudentTab; label: string; icon: React.ReactNode }[] = [
    { id: 'today', label: 'Bài tập hôm nay', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'extra', label: 'Bài tập bổ sung', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'schedules', label: 'Lịch học của em', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'focus', label: 'Cây tập trung', icon: <TreePine className="w-4 h-4" /> },
  ];

  const renderSidebarBody = () => (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="px-5 pt-5 pb-4 space-y-2.5">
        <div className="flex items-center gap-2.5">
          <NhiphocLogoMark className="w-8 h-8 shrink-0" />
          <div className="min-w-0">
            <div className="font-display text-lg font-extrabold leading-tight text-[#231E18]">
              Nhịp<span className="text-[#C45A15]">Học</span>
            </div>
            <p className="text-xs text-[#6B6154] truncate">
              {activeStudent ? `${activeStudent.name} · ${activeStudent.grade}` : currentUser.displayName}
            </p>
          </div>
        </div>

        {students.length > 1 && (
          <select
            value={activeStudent?.id || ''}
            onChange={(e) => {
              playClickSound();
              onSelectStudent(e.target.value);
            }}
            aria-label="Chọn không gian học"
            className="w-full min-h-[36px] rounded-xl px-2.5 py-1.5 bg-[#FAF4E8] border border-[#E5DBC4] text-xs font-bold text-[#231E18]"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.grade}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Navigation */}
      <nav aria-label="Menu học sinh" className="px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                playClickSound();
                setTab(item.id);
                setFilter('all');
                setMobileMenuOpen(false);
              }}
              className={`w-full min-h-[42px] px-3.5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-3 transition-colors text-left ${
                active
                  ? 'bg-[#C45A15] text-white shadow-xs'
                  : 'text-[#231E18] hover:bg-[#F4EDE0]'
              }`}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Family Invite Card */}
      {activeStudent && (
        <div className="mx-3 mt-4 rounded-2xl bg-[#FDF5DE] border border-[#EEDDB8] p-3.5 space-y-2.5">
          <div className="text-xs font-bold text-[#C45A15]">Mã kết nối gia đình</div>
          <p className="text-[11px] leading-relaxed text-[#6B6154]">
            Gửi mã này cho Phụ huynh hoặc Trợ lý để kết nối cùng theo dõi bài tập.
          </p>
          <div className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-xl px-2.5 py-2 flex items-center justify-between gap-2">
            <span className="font-mono-code text-xs font-extrabold tracking-wide text-[#231E18] truncate">
              {activeStudent.inviteCode}
            </span>
            <button
              type="button"
              onClick={handleCopyInvite}
              className="text-[11px] font-bold text-[#C45A15] hover:text-[#AA4C0F] flex items-center gap-1 shrink-0"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* User & Account Actions */}
      <div className="mt-auto border-t border-[#E5DBC4] p-4 space-y-2.5">
        <button
          type="button"
          onClick={() => {
            playClickSound();
            setMobileMenuOpen(false);
            onOpenAccount('default');
          }}
          className="w-full text-left group rounded-xl p-1.5 -m-1.5 hover:bg-[#F4EDE0] transition-colors flex items-center justify-between gap-2"
        >
          <div className="min-w-0">
            <div className="text-sm font-bold text-[#231E18] truncate">{currentUser.displayName}</div>
            <div className="text-[11px] text-[#6B6154] truncate">
              {linkedAssistant
                ? `Trợ lý: ${linkedAssistant.isOnline ? 'Đang online' : 'Ngoại tuyến (nhận xét sau...)'}`
                : 'Chưa kết nối Trợ lý'}
            </div>
          </div>
          <Settings className="w-4 h-4 text-[#6B6154] group-hover:text-[#C45A15] shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            signOutUser();
          }}
          className="w-full min-h-[40px] rounded-xl border border-[#E5DBC4] bg-[#FFFDF8] hover:bg-[#F3ECDC] text-xs font-bold text-[#231E18] flex items-center justify-center gap-2 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Đăng xuất</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            setMobileMenuOpen(false);
            onOpenAccount('delete');
          }}
          className="w-full py-1 text-xs font-semibold text-[#6B6154] hover:text-[#B9382C] flex items-center justify-center gap-1.5 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Xóa tài khoản</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen paper-bg-light text-[#231E18] flex">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen bg-[#FFFDF8] border-r border-[#E5DBC4] overflow-y-auto">
        {renderSidebarBody()}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/45 backdrop-blur-xs"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] h-full bg-[#FFFDF8] border-r border-[#E5DBC4] overflow-y-auto">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Đóng menu"
              className="absolute top-3 right-3 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-[#6B6154]"
            >
              <X className="w-5 h-5" />
            </button>
            {renderSidebarBody()}
          </aside>
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex-1 min-w-0 flex flex-col pb-20 lg:pb-10">
        {/* Top Slim Header */}
        <header className="sticky top-0 z-20 h-16 bg-[#FBF8F1]/95 backdrop-blur-md border-b border-[#E5DBC4] px-4 sm:px-7 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setMobileMenuOpen(true);
              }}
              aria-label="Mở menu"
              className="lg:hidden min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-[#E5DBC4] bg-[#FFFDF8]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-[#6B6154] truncate">
                Học sinh · {activeStudent?.grade || 'Chưa kết nối'}
              </p>
              <h1 className="font-display text-lg sm:text-xl font-extrabold text-[#231E18] truncate">
                {pageTitleMap[tab]}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onToggleSound}
              aria-label={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-[#E5DBC4] bg-[#FFFDF8] text-[#6B6154] hover:text-[#231E18]"
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-[#C45A15]" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setChatOpen(true);
              }}
              className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[#E5DBC4] bg-[#FFFDF8] hover:bg-[#F3ECDC] text-xs font-bold text-[#231E18] flex items-center gap-2 whitespace-nowrap"
            >
              <MessageSquare className="w-4 h-4 text-[#6B6154]" />
              <span className="hidden sm:inline">Tin nhắn trợ lý</span>
              <span className="sm:hidden">Tin nhắn</span>
              {unreadMessageCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#C45A15] text-white text-[10px] font-bold tabular-nums">
                  {unreadMessageCount}
                </span>
              )}
            </button>

            {activeStudent && tab === 'extra' && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setPracticeErr('');
                  setPracticeModalOpen(true);
                }}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-[#C45A15] hover:bg-[#AA4C0F] text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm bài tự luyện</span>
              </button>
            )}
          </div>
        </header>

        <main className="max-w-5xl w-full mx-auto px-4 sm:px-7 pt-6 space-y-6">
          {!activeStudent ? (
            <div className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-3xl p-8 text-center space-y-4">
              <MascotAvatar mood="surprised" size="lg" className="mx-auto" />
              <p className="font-display font-bold text-lg">
                Bạn chưa liên kết với không gian học nào
              </p>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onOpenAccount('default');
                }}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#C45A15] hover:bg-[#AA4C0F] text-white text-sm font-bold"
              >
                Mở Hồ sơ để nhập mã kết nối
              </button>
            </div>
          ) : (
            <>
              {/* Hero Welcome Banner Card */}
              <section className="rounded-3xl bg-gradient-to-r from-[#FBF0CC] via-[#FDF5DC] to-[#FAF0D4] border border-[#EBDAA8] p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 min-w-0">
                  <div className="flex flex-col items-start shrink-0 gap-1">
                    {(tab === 'today' || tab === 'extra') && (
                      <NhiphocAnimatedLogo size="sm" className="mb-0.5" />
                    )}
                    <MascotAvatar
                      mood={
                        tab === 'extra'
                          ? 'creative'
                          : tab === 'focus'
                            ? running
                              ? 'study'
                              : 'relax'
                            : tab === 'schedules'
                              ? 'study'
                              : 'happy'
                      }
                      size="lg"
                    />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <HeartbeatSlogan className="text-xs sm:text-sm" />
                    <h2 className="font-display text-xl sm:text-2xl font-extrabold text-[#231E18] leading-snug text-balance">
                      {heroGreetingMap[tab]}
                    </h2>
                  </div>
                </div>

                <div className="lg:border-l lg:border-[#E5DBC4] lg:pl-6 flex items-center gap-6 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#E5DBC4]">
                  <div className="flex items-center gap-2.5">
                    <Flame className="w-5 h-5 text-[#C45A15] shrink-0" />
                    <div>
                      <p className="text-[11px] font-medium text-[#6B6154]">Chuỗi ngày</p>
                      <p className="font-display text-base font-extrabold text-[#231E18] tabular-nums">
                        {activeStudent.streakDays} ngày
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Star className="w-5 h-5 text-[#C45A15] shrink-0" />
                    <div>
                      <p className="text-[11px] font-medium text-[#6B6154]">Cây tập trung</p>
                      <p className="font-display text-base font-extrabold text-[#C45A15] tabular-nums">
                        {activeStudent.totalFocusMinutes} phút
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* TAB: TODAY & EXTRA ASSIGNMENTS */}
              {(tab === 'today' || tab === 'extra') && (
                <section className="space-y-5">
                  {/* 3 KPI Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between gap-2 text-xs font-medium text-[#6B6154]">
                        <span>
                          {tab === 'today' ? 'Hôm nay em đã hoàn thành' : 'Bài tự luyện đã hoàn thành'}
                        </span>
                        <span className="font-bold text-[#C45A15] tabular-nums">
                          {completionPercent}%
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-display text-2xl font-extrabold text-[#231E18] tabular-nums">
                            {doneCount}/{tabAssignments.length}
                          </span>
                          <span className="text-xs text-[#6B6154]">nhiệm vụ</span>
                        </div>
                        <span className="text-xs text-[#6B6154] tabular-nums">
                          {gradedCount} bài đã chấm
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#EFE7D6] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#C45A15] transition-all duration-500"
                          style={{ width: `${completionPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3 shadow-xs">
                      <span className="text-xs font-medium text-[#6B6154]">Trợ lý đã chấm xong</span>
                      <div className="font-display text-2xl font-extrabold text-[#2B6334] tabular-nums">
                        {gradedCount}/{tabAssignments.length} bài
                      </div>
                    </div>

                    <div className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3 shadow-xs">
                      <span className="text-xs font-medium text-[#6B6154]">Trạng thái trợ lý</span>
                      <div className="font-display text-base sm:text-lg font-extrabold text-[#231E18]">
                        {linkedAssistant
                          ? linkedAssistant.isOnline
                            ? 'Đang online · Sẵn sàng chấm bài'
                            : 'Ngoại tuyến · Nhận xét sau 1h'
                          : 'Chưa có Trợ lý liên kết'}
                      </div>
                    </div>
                  </div>

                  {/* Filter Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#EFE7D6] rounded-xl">
                      {(
                        [
                          { id: 'all', label: 'Tất cả' },
                          { id: 'pending', label: 'Chưa nộp' },
                          { id: 'submitted', label: 'Đã nộp' },
                          { id: 'graded', label: 'Đã chấm xong' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            playClickSound();
                            setFilter(opt.id);
                          }}
                          className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                            filter === opt.id
                              ? 'bg-[#FFFDF8] text-[#231E18] shadow-xs'
                              : 'text-[#6B6154] hover:text-[#231E18]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    <span className="text-xs text-[#6B6154] tabular-nums">
                      Hiển thị {filteredAssignments.length} bài tập
                    </span>
                  </div>

                  {/* Assignment Cards List */}
                  {filteredAssignments.length === 0 ? (
                    <div className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-2xl p-10 text-center space-y-2 shadow-xs">
                      <p className="font-bold text-base text-[#231E18]">
                        Chưa có bài tập {tab === 'today' ? 'hôm nay' : 'bổ sung'} nào phù hợp
                      </p>
                      <p className="text-sm text-[#6B6154]">
                        {tab === 'extra'
                          ? 'Bạn có thể bấm "+ Thêm bài tự luyện" ở góc trên để tự đặt mục tiêu ôn tập.'
                          : 'Khi Trợ lý giao bài mới, tờ giấy note sẽ xuất hiện ngay tại đây.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredAssignments.map((asg) => {
                        const statusText =
                          asg.status === 'graded'
                            ? `Đã chấm · ${asg.gradeText}`
                            : asg.status === 'submitted'
                              ? 'Đã nộp · Chờ chấm'
                              : 'Chưa nộp';
                        const isSelfPracticePending =
                          asg.createdByUid === currentUser.uid && asg.status === 'pending';

                        return (
                          <article
                            key={asg.id}
                            className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs hover:border-[#D4C3A3] transition-colors"
                          >
                            <div className="flex items-start gap-3.5 min-w-0 flex-1">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                  asg.status === 'graded'
                                    ? 'bg-[#E9F5EC] text-[#2B6334]'
                                    : asg.status === 'submitted'
                                      ? 'bg-[#FFF0E5] text-[#C45A15]'
                                      : 'bg-[#F3ECDC] text-[#6B6154]'
                                }`}
                              >
                                {asg.status === 'graded' ? (
                                  <CheckCircle2 className="w-4 h-4" />
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-current" />
                                )}
                              </div>

                              <div className="min-w-0 space-y-1 flex-1">
                                <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B6154]">
                                  <span className="font-bold text-[#C45A15]">{asg.subject}</span>
                                  <span aria-hidden="true">·</span>
                                  <span>
                                    {asg.dueDate ||
                                      (asg.type === 'extra' ? 'Linh hoạt trong tuần' : 'Trong ngày')}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span
                                    className={
                                      asg.status === 'graded'
                                        ? 'font-bold text-[#2B6334]'
                                        : asg.status === 'submitted'
                                          ? 'font-bold text-[#C45A15]'
                                          : ''
                                    }
                                  >
                                    {statusText}
                                  </span>
                                </div>

                                <h3 className="font-display text-base sm:text-lg font-extrabold text-[#231E18] leading-snug">
                                  {asg.title}
                                </h3>

                                {asg.description && (
                                  <p className="text-sm text-[#6B6154] leading-relaxed">
                                    {asg.description}
                                  </p>
                                )}

                                {asg.status === 'graded' && asg.assistantFeedback && (
                                  <div className="mt-2 rounded-xl p-3 bg-[#E9F5EC] border border-[#BBDDC1] text-xs text-[#1F4A26]">
                                    <span className="font-bold">Nhận xét của Trợ lý:</span>{' '}
                                    {asg.assistantFeedback}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 sm:pl-2">
                              {isSelfPracticePending && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    playClickSound();
                                    deletePendingAssignment(asg.id);
                                  }}
                                  aria-label="Xóa bài tự luyện"
                                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-[#E5DBC4] text-[#B9382C] hover:bg-[#FDECEB]"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  playClickSound();
                                  setSelectedAssignment(asg);
                                }}
                                className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${
                                  asg.status === 'graded'
                                    ? 'bg-[#E9F5EC] border border-[#BBDDC1] text-[#2B6334] hover:bg-[#D9EEDF]'
                                    : 'bg-[#C45A15] hover:bg-[#AA4C0F] text-white'
                                }`}
                              >
                                {asg.status === 'graded' ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Xem bài ({asg.gradeText})</span>
                                  </>
                                ) : (
                                  <>
                                    <Camera className="w-4 h-4" />
                                    <span>
                                      {asg.status === 'submitted'
                                        ? 'Nộp lại ảnh'
                                        : 'Chụp ảnh nộp bài'}
                                    </span>
                                  </>
                                )}
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* TAB: SCHEDULES */}
              {tab === 'schedules' && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-lg font-extrabold text-[#231E18]">
                      Lịch học & Check-in của {activeStudent.name}
                    </h3>
                    <span className="text-xs text-[#6B6154] tabular-nums">
                      {studentSchedules.length} lịch hẹn
                    </span>
                  </div>

                  {studentSchedules.length === 0 ? (
                    <div className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-2xl p-10 text-center space-y-2 shadow-xs">
                      <p className="font-bold text-base text-[#231E18]">Chưa có lịch học nào</p>
                      <p className="text-sm text-[#6B6154]">
                        Khi Phụ huynh hoặc Trợ lý đặt lịch học / check-in, lịch sẽ hiển thị ngay tại đây.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {studentSchedules.map((s) => (
                        <article
                          key={s.id}
                          className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-2xl p-5 space-y-2.5 shadow-xs"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-mono-code font-bold text-[#6B6154] tabular-nums">
                              {s.scheduledAt.replace('T', ' ')}
                            </span>
                            <span
                              className={`font-bold ${
                                s.status === 'confirmed' || s.status === 'completed'
                                  ? 'text-[#2B6334]'
                                  : s.status === 'cancelled'
                                    ? 'text-[#B9382C]'
                                    : 'text-[#C45A15]'
                              }`}
                            >
                              {SCHEDULE_STATUS_LABEL[s.status]}
                            </span>
                          </div>
                          <h4 className="font-display text-base font-extrabold text-[#231E18]">
                            {s.title}
                          </h4>
                          {s.note && <p className="text-sm text-[#6B6154]">{s.note}</p>}
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* TAB: FOCUS TREE + POMODORO */}
              {tab === 'focus' && (
                <section className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-6">
                      <FocusTree
                        totalMinutes={activeStudent.totalFocusMinutes}
                        streakDays={activeStudent.streakDays}
                      />
                    </div>

                    <div className="lg:col-span-6 bg-[#FFFDF8] border border-[#E5DBC4] rounded-3xl p-5 sm:p-6 space-y-5 shadow-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-[#6B6154]">Đồng hồ Pomodoro</p>
                          <h3 className="font-display text-lg sm:text-xl font-extrabold text-[#231E18] mt-0.5">
                            Bấm giờ nuôi Cây tập trung
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={onToggleSound}
                          aria-label={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'}
                          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-[#E5DBC4] bg-[#FBF8F1] text-[#6B6154] hover:text-[#231E18]"
                        >
                          {soundOn ? (
                            <Volume2 className="w-4 h-4 text-[#C45A15]" />
                          ) : (
                            <VolumeX className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Segmented Duration Presets */}
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-4 gap-1 p-1 bg-[#EFE7D6] rounded-xl">
                          {[5, 15, 25, 45].map((m) => (
                            <button
                              key={m}
                              type="button"
                              disabled={running}
                              onClick={() => handleSelectDuration(m)}
                              className={`min-h-[38px] rounded-lg text-xs font-bold transition-colors tabular-nums disabled:opacity-60 ${
                                durationMinutes === m
                                  ? 'bg-[#FFFDF8] text-[#231E18] shadow-xs'
                                  : 'text-[#6B6154] hover:text-[#231E18]'
                              }`}
                            >
                              {m} phút
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-3 px-1">
                          <span className="text-xs text-[#6B6154] whitespace-nowrap">
                            Tùy chỉnh ({durationMinutes}p / 1–180p):
                          </span>
                          <input
                            type="range"
                            min={1}
                            max={180}
                            disabled={running}
                            value={durationMinutes}
                            onChange={(e) => handleSelectDuration(Number(e.target.value))}
                            className="flex-1 accent-[#C45A15]"
                          />
                        </div>
                      </div>

                      {/* Timer Warm Display Card */}
                      <div className="rounded-2xl bg-[#FDF3D0] border border-[#EADCB6] py-8 px-4 text-center space-y-2">
                        <div className="font-mono-code text-5xl sm:text-6xl font-extrabold tracking-tight text-[#C45A15] tabular-nums">
                          {mm} : {ss}
                        </div>
                        <p className="text-xs font-medium text-[#6B6154]">
                          {running
                            ? 'Đang tập trung... giữ vững nhịp học nhé!'
                            : 'Sẵn sàng cho phiên học sâu không xao nhãng'}
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#231E18] mb-1.5">
                          Mục tiêu phiên học này
                        </label>
                        <input
                          type="text"
                          value={focusNote}
                          onChange={(e) => setFocusNote(e.target.value)}
                          placeholder="Ví dụ: Làm trọn bộ 5 bài Toán phương trình"
                          maxLength={300}
                          className="w-full min-h-[44px] rounded-xl px-3.5 py-2 text-sm bg-[#FFFDF8] border border-[#E5DBC4] focus:outline-none focus:ring-2 focus:ring-[#C45A15]"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            setRunning((r) => !r);
                            setFocusMessage('');
                          }}
                          className="flex-1 min-h-[46px] px-5 py-2.5 rounded-xl bg-[#C45A15] hover:bg-[#AA4C0F] text-white font-bold text-sm flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                          {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          <span>{running ? 'Tạm dừng' : 'Bắt đầu tập trung'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            setRunning(false);
                            setSecondsLeft(durationMinutes * 60);
                            completionHandledRef.current = false;
                          }}
                          className="min-h-[46px] px-4 py-2.5 rounded-xl border border-[#E5DBC4] bg-[#FFFDF8] hover:bg-[#F3ECDC] text-sm font-bold text-[#231E18] flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Đặt lại</span>
                        </button>

                        {secondsLeft < durationMinutes * 60 && (
                          <button
                            type="button"
                            disabled={savingFocus}
                            onClick={handleFinishEarly}
                            className="w-full sm:w-auto min-h-[46px] px-4 py-2.5 rounded-xl bg-[#231E18] text-white text-sm font-bold disabled:opacity-50"
                          >
                            {savingFocus ? 'Đang lưu...' : 'Lưu phút đã học'}
                          </button>
                        )}
                      </div>

                      {focusMessage && (
                        <div className="rounded-xl p-3 bg-[#E9F5EC] border border-[#BBDDC1] text-[#2B6334] text-sm font-semibold">
                          {focusMessage}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Focus Sessions */}
                  <div className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-2xl p-5 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-display text-base font-extrabold text-[#231E18]">
                        Nhật ký tập trung gần đây
                      </h3>
                      <span className="text-xs text-[#6B6154] tabular-nums">
                        {studentSessions.length} phiên đã ghi nhận
                      </span>
                    </div>

                    {studentSessions.length === 0 ? (
                      <p className="text-sm text-[#6B6154]">
                        Chưa có phiên hoàn thành nào. Hãy thử một phiên 25 phút để Cây Tập Trung lớn thêm nhé!
                      </p>
                    ) : (
                      <ul className="divide-y divide-[#E5DBC4]">
                        {studentSessions.slice(0, 8).map((s) => (
                          <li key={s.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                            <div className="min-w-0">
                              <p className="font-semibold text-[#231E18] truncate">
                                {s.note || 'Phiên tập trung'}
                              </p>
                              <p className="text-xs text-[#6B6154] tabular-nums">
                                {formatTimestampVi(s.createdAt)}
                              </p>
                            </div>
                            <span className="font-bold text-[#C45A15] tabular-nums whitespace-nowrap">
                              +{s.durationMinutes} phút
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav
        aria-label="Điều hướng nhanh"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#FFFDF8]/95 backdrop-blur-md border-t border-[#E5DBC4] grid grid-cols-4 h-16"
      >
        <button
          type="button"
          onClick={() => {
            playClickSound();
            setTab('today');
          }}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold ${
            tab === 'today' ? 'text-[#C45A15]' : 'text-[#6B6154]'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span>Hôm nay ({todayAssignments.filter((a) => a.status === 'pending').length})</span>
        </button>
        <button
          type="button"
          onClick={() => {
            playClickSound();
            setTab('extra');
          }}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold ${
            tab === 'extra' ? 'text-[#C45A15]' : 'text-[#6B6154]'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span>Bổ sung</span>
        </button>
        <button
          type="button"
          onClick={() => {
            playClickSound();
            setTab('schedules');
          }}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold ${
            tab === 'schedules' ? 'text-[#C45A15]' : 'text-[#6B6154]'
          }`}
        >
          <CalendarDays className="w-5 h-5" />
          <span>Lịch học</span>
        </button>
        <button
          type="button"
          onClick={() => {
            playClickSound();
            setTab('focus');
          }}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold ${
            tab === 'focus' ? 'text-[#C45A15]' : 'text-[#6B6154]'
          }`}
        >
          <TreePine className="w-5 h-5" />
          <span>Cây xanh</span>
        </button>
      </nav>

      {/* Self-practice Extra Assignment Modal */}
      {practiceModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleCreatePractice}
            className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-3xl w-full max-w-lg p-6 space-y-4 my-auto shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#E5DBC4] pb-3">
              <div>
                <p className="text-xs font-bold text-[#C45A15]">Bài tập bổ sung</p>
                <h2 className="font-display text-xl font-extrabold text-[#231E18]">
                  Thêm bài tự luyện mới
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPracticeModalOpen(false)}
                aria-label="Đóng"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[#6B6154]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {practiceErr && (
              <div className="rounded-xl p-3 bg-[#FDECEB] text-[#8E2A20] text-xs font-semibold">
                {practiceErr}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#231E18] mb-1.5">Môn học *</label>
              <input
                type="text"
                required
                maxLength={60}
                value={practiceSubject}
                onChange={(e) => setPracticeSubject(e.target.value)}
                placeholder="Ví dụ: Ngữ văn, Toán, Tiếng Anh..."
                className="w-full min-h-[42px] rounded-xl px-3.5 py-2 text-sm bg-[#FBF8F1] border border-[#E5DBC4]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#231E18] mb-1.5">
                Tiêu đề bài tự luyện *
              </label>
              <input
                type="text"
                required
                maxLength={140}
                value={practiceTitle}
                onChange={(e) => setPracticeTitle(e.target.value)}
                placeholder="Ví dụ: Lập dàn ý phân tích khổ thơ đầu bài Mùa xuân nho nhỏ"
                className="w-full min-h-[42px] rounded-xl px-3.5 py-2 text-sm bg-[#FBF8F1] border border-[#E5DBC4]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#231E18] mb-1.5">
                Ghi chú mục tiêu (không bắt buộc)
              </label>
              <textarea
                rows={3}
                maxLength={2000}
                value={practiceDesc}
                onChange={(e) => setPracticeDesc(e.target.value)}
                placeholder="Bài tập bổ sung giúp rèn kỹ năng cảm thụ và ghi nhớ sâu..."
                className="w-full rounded-xl p-3 text-sm bg-[#FBF8F1] border border-[#E5DBC4]"
              />
            </div>

            <button
              type="submit"
              disabled={practiceBusy}
              className="w-full min-h-[46px] rounded-xl bg-[#C45A15] hover:bg-[#AA4C0F] text-white font-bold text-sm disabled:opacity-50"
            >
              {practiceBusy ? 'Đang lưu...' : 'Tạo bài tự luyện'}
            </button>
          </form>
        </div>
      )}

      {/* Camera / Upload Submission Modal */}
      <CameraCaptureModal
        open={Boolean(selectedAssignment)}
        assignmentTitle={selectedAssignment?.title || ''}
        initialImageUrl={selectedAssignment?.submissionImageDataUrl || ''}
        initialNote={selectedAssignment?.studentNote || ''}
        locked={selectedAssignment?.status === 'graded'}
        onClose={() => setSelectedAssignment(null)}
        onSubmit={handleSubmitAssignment}
      />

      {/* Slide-over Chat Drawer */}
      {activeStudent && (
        <ChatDrawer
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          student={activeStudent}
          messages={messages}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

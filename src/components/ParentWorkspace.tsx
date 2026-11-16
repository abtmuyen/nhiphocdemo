import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarClock,
  Check,
  Copy,
  Flame,
  LifeBuoy,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Star,
  Trash2,
  TreePine,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  Assignment,
  ChatMessage,
  FeedbackTicket,
  FocusSession,
  Schedule,
  StudentProfile,
  TicketCategory,
  UserPublic,
} from '../types';
import {
  createFeedbackTicket,
  createScheduleRequest,
  updateScheduleStatus,
} from '../services/firestoreService';
import { signOutUser } from '../firebase';
import { computeTreeLevel, formatTimestampVi } from '../utils/dateUtils';
import { playClickSound, playSuccessSound } from '../utils/sound';
import { HeartbeatSlogan, MascotAvatar, NhiphocLogoMark } from './NhipNhoMascot';
import { FocusTree } from './FocusTree';
import { ChatDrawer } from './ChatDrawer';

interface ParentWorkspaceProps {
  currentUser: UserPublic;
  students: StudentProfile[];
  activeStudent: StudentProfile | null;
  onSelectStudent: (id: string) => void;
  assignments: Assignment[];
  focusSessions: FocusSession[];
  messages: ChatMessage[];
  schedules: Schedule[];
  tickets: FeedbackTicket[];
  linkedAssistant: UserPublic | null;
  unreadMessageCount: number;
  soundOn: boolean;
  onToggleSound: () => void;
  onOpenAccount: (section?: 'default' | 'delete') => void;
}

type ParentTab = 'progress' | 'schedules' | 'tickets' | 'focus';

const SCHEDULE_STATUS_VI = {
  requested: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const TICKET_CAT_VI: Record<TicketCategory, string> = {
  feedback: 'Góp ý',
  support: 'Hỗ trợ học tập',
  management: 'Quản lý lộ trình',
};

export function ParentWorkspace({
  currentUser,
  students,
  activeStudent,
  onSelectStudent,
  assignments,
  focusSessions,
  messages,
  schedules,
  tickets,
  linkedAssistant,
  unreadMessageCount,
  soundOn,
  onToggleSound,
  onOpenAccount,
}: ParentWorkspaceProps) {
  const [tab, setTab] = useState<ParentTab>('progress');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [zoomAssignment, setZoomAssignment] = useState<Assignment | null>(null);

  // Schedule form
  const [schTitle, setSchTitle] = useState('');
  const [schDateTime, setSchDateTime] = useState('');
  const [schNote, setSchNote] = useState('');
  const [schBusy, setSchBusy] = useState(false);
  const [schErr, setSchErr] = useState('');

  // Ticket form
  const [tktCategory, setTktCategory] = useState<TicketCategory>('feedback');
  const [tktSubject, setTktSubject] = useState('');
  const [tktContent, setTktContent] = useState('');
  const [tktBusy, setTktBusy] = useState(false);
  const [tktErr, setTktErr] = useState('');

  const studentAssignments = useMemo(
    () =>
      activeStudent
        ? assignments
            .filter((a) => a.studentId === activeStudent.id)
            .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
        : [],
    [assignments, activeStudent],
  );

  const studentSchedules = useMemo(
    () =>
      activeStudent
        ? schedules
            .filter((s) => s.studentId === activeStudent.id)
            .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
        : [],
    [schedules, activeStudent],
  );

  const studentTickets = useMemo(
    () =>
      activeStudent
        ? tickets
            .filter((t) => t.studentId === activeStudent.id)
            .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
        : [],
    [tickets, activeStudent],
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

  const doneCount = studentAssignments.filter((a) => a.status !== 'pending').length;
  const gradedCount = studentAssignments.filter((a) => a.status === 'graded').length;
  const completionPct =
    studentAssignments.length > 0 ? Math.round((doneCount / studentAssignments.length) * 100) : 0;
  const treeInfo = computeTreeLevel(activeStudent?.totalFocusMinutes || 0);

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

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent || schBusy) return;
    playClickSound();
    setSchBusy(true);
    setSchErr('');
    try {
      await createScheduleRequest({
        student: activeStudent,
        createdByUid: currentUser.uid,
        title: schTitle,
        scheduledAt: schDateTime,
        note: schNote,
      });
      playSuccessSound();
      setSchTitle('');
      setSchDateTime('');
      setSchNote('');
    } catch (err) {
      setSchErr(err instanceof Error ? err.message : 'Không đặt được lịch.');
    } finally {
      setSchBusy(false);
    }
  };

  const handleCancelSchedule = async (scheduleId: string) => {
    playClickSound();
    await updateScheduleStatus(scheduleId, 'cancelled');
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent || tktBusy) return;
    playClickSound();
    setTktBusy(true);
    setTktErr('');
    try {
      await createFeedbackTicket({
        student: activeStudent,
        createdByUid: currentUser.uid,
        category: tktCategory,
        subject: tktSubject,
        content: tktContent,
      });
      playSuccessSound();
      setTktSubject('');
      setTktContent('');
    } catch (err) {
      setTktErr(err instanceof Error ? err.message : 'Không gửi được phiếu hỗ trợ.');
    } finally {
      setTktBusy(false);
    }
  };

  const pageTitleMap: Record<ParentTab, string> = {
    progress: 'Tiến độ học tập',
    schedules: 'Lịch học & Check-in',
    tickets: 'Phiếu phản hồi & Hỗ trợ',
    focus: 'Cây tập trung của con',
  };

  const navItems: { id: ParentTab; label: string; icon: React.ReactNode }[] = [
    { id: 'progress', label: 'Tiến độ học tập', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'schedules', label: 'Lịch học & Check-in', icon: <CalendarClock className="w-4 h-4" /> },
    { id: 'tickets', label: 'Phiếu hỗ trợ', icon: <LifeBuoy className="w-4 h-4" /> },
    { id: 'focus', label: 'Cây tập trung', icon: <TreePine className="w-4 h-4" /> },
  ];

  const renderSidebarBody = () => (
    <div className="flex flex-col h-full">
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

        {students.length > 0 && (
          <select
            value={activeStudent?.id || ''}
            onChange={(e) => {
              playClickSound();
              onSelectStudent(e.target.value);
            }}
            aria-label="Chọn học sinh"
            className="w-full min-h-[38px] rounded-xl px-2.5 py-1.5 bg-[#FAF4E8] border border-[#E5DBC4] text-xs font-bold text-[#231E18]"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.grade}
              </option>
            ))}
          </select>
        )}
      </div>

      <nav aria-label="Menu phụ huynh" className="px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                playClickSound();
                setTab(item.id);
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

      {activeStudent && (
        <div className="mx-3 mt-4 rounded-2xl bg-[#FDF5DE] border border-[#EEDDB8] p-3.5 space-y-2.5">
          <div className="text-xs font-bold text-[#C45A15]">Mã kết nối gia đình</div>
          <p className="text-[11px] leading-relaxed text-[#6B6154]">
            Gửi mã này cho Học sinh hoặc Trợ lý để đồng bộ bài tập và kết quả theo thời gian thực.
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
                ? `Trợ lý: ${linkedAssistant.isOnline ? 'Đang online' : 'Ngoại tuyến'}`
                : 'Hồ sơ & Kết nối'}
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
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen bg-[#FFFDF8] border-r border-[#E5DBC4] overflow-y-auto">
        {renderSidebarBody()}
      </aside>

      {/* Mobile Drawer */}
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

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col pb-20 lg:pb-10">
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
                Phụ huynh · {activeStudent ? `${activeStudent.name} (${activeStudent.grade})` : 'Chưa kết nối'}
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

            {activeStudent && (
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
            )}
          </div>
        </header>

        <main className="max-w-5xl w-full mx-auto px-4 sm:px-7 pt-6 space-y-6">
          {!activeStudent ? (
            <div className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-3xl p-8 text-center space-y-4 shadow-xs">
              <MascotAvatar mood="surprised" size="lg" className="mx-auto" />
              <p className="font-display font-bold text-lg text-[#231E18]">
                Chưa có hồ sơ học sinh nào được liên kết
              </p>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onOpenAccount('default');
                }}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#C45A15] hover:bg-[#AA4C0F] text-white text-sm font-bold"
              >
                Mở Hồ sơ để thêm hoặc kết nối học sinh
              </button>
            </div>
          ) : (
            <>
              {/* Hero Welcome Banner */}
              <section className="rounded-3xl bg-gradient-to-r from-[#FBF0CC] via-[#FDF5DC] to-[#FAF0D4] border border-[#EBDAA8] p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 min-w-0">
                  <MascotAvatar
                    mood={tab === 'focus' ? 'relax' : 'happy'}
                    size="lg"
                    className="shrink-0"
                  />
                  <div className="space-y-1.5 min-w-0">
                    <HeartbeatSlogan className="text-xs sm:text-sm" />
                    <h2 className="font-display text-xl sm:text-2xl font-extrabold text-[#231E18] leading-snug text-balance">
                      Chào Phụ huynh {currentUser.displayName}! Cùng theo dõi nhịp học của{' '}
                      {activeStudent.name}.
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
                        {activeStudent.totalFocusMinutes} phút · Cấp {treeInfo.level}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* TAB 1: PROGRESS */}
              {tab === 'progress' && (
                <section className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between text-xs font-medium text-[#6B6154]">
                        <span>Tiến độ bài tập</span>
                        <span className="font-bold text-[#C45A15] tabular-nums">{completionPct}%</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="font-display text-2xl font-extrabold text-[#231E18] tabular-nums">
                          {doneCount}/{studentAssignments.length} bài
                        </span>
                        <span className="text-xs text-[#6B6154] tabular-nums">{gradedCount} đã chấm</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#EFE7D6] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#C45A15] transition-all duration-500"
                          style={{ width: `${completionPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3 shadow-xs">
                      <span className="text-xs font-medium text-[#6B6154]">Bài đã chấm điểm</span>
                      <div className="font-display text-2xl font-extrabold text-[#2B6334] tabular-nums">
                        {gradedCount}/{studentAssignments.length} bài
                      </div>
                    </div>

                    <div className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3 shadow-xs">
                      <span className="text-xs font-medium text-[#6B6154]">Trạng thái trợ lý</span>
                      <div className="font-display text-base sm:text-lg font-extrabold text-[#231E18]">
                        {linkedAssistant
                          ? `${linkedAssistant.displayName} · ${
                              linkedAssistant.isOnline ? 'Đang online' : 'Ngoại tuyến'
                            }`
                          : 'Chưa kết nối Trợ lý'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-display text-lg font-extrabold text-[#231E18]">
                      Bài tập của {activeStudent.name}
                    </h3>

                    {studentAssignments.length === 0 ? (
                      <div className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-2xl p-8 text-center text-sm text-[#6B6154] shadow-xs">
                        Trợ lý chưa giao bài tập nào cho {activeStudent.name}.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {studentAssignments.map((asg) => (
                          <article
                            key={asg.id}
                            onClick={() => {
                              playClickSound();
                              setZoomAssignment(asg);
                            }}
                            className="bg-[#FFFDF8] border border-[#E5DBC4] hover:border-[#D4C3A3] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-colors shadow-xs"
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B6154]">
                                <span className="font-bold text-[#C45A15]">{asg.subject}</span>
                                <span aria-hidden="true">·</span>
                                <span>{asg.type === 'today' ? 'Hôm nay' : 'Bổ sung'}</span>
                                <span aria-hidden="true">·</span>
                                <span>{asg.dueDate || 'Trong ngày'}</span>
                              </div>
                              <h4 className="font-display text-base font-extrabold text-[#231E18]">
                                {asg.title}
                              </h4>
                              {asg.assistantFeedback && (
                                <p className="text-xs text-[#2B6334] truncate">
                                  Nhận xét: {asg.assistantFeedback}
                                </p>
                              )}
                            </div>

                            <span
                              className={`text-xs font-bold shrink-0 ${
                                asg.status === 'graded'
                                  ? 'text-[#2B6334]'
                                  : asg.status === 'submitted'
                                    ? 'text-[#C45A15]'
                                    : 'text-[#6B6154]'
                              }`}
                            >
                              {asg.status === 'graded'
                                ? `Đã chấm (${asg.gradeText}) →`
                                : asg.status === 'submitted'
                                  ? 'Đã nộp bài →'
                                  : 'Chưa nộp'}
                            </span>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* TAB 2: SCHEDULES */}
              {tab === 'schedules' && (
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <form
                    onSubmit={handleCreateSchedule}
                    className="lg:col-span-5 bg-[#FFFDF8] border border-[#E5DBC4] rounded-2xl p-5 space-y-4 shadow-xs"
                  >
                    <h3 className="font-display text-lg font-extrabold text-[#231E18]">
                      Đặt lịch học / Check-in
                    </h3>
                    {schErr && (
                      <div className="rounded-xl p-3 bg-[#FDECEB] text-[#8E2A20] text-xs font-semibold">
                        {schErr}
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-[#231E18] mb-1.5">
                        Nội dung buổi học / trao đổi *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={140}
                        value={schTitle}
                        onChange={(e) => setSchTitle(e.target.value)}
                        placeholder="Ví dụ: Check-in ôn thi Toán giữa kỳ"
                        className="w-full min-h-[44px] rounded-xl px-3.5 py-2 text-sm bg-[#FBF8F1] border border-[#E5DBC4] text-[#231E18]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#231E18] mb-1.5">
                        Thời gian mong muốn *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={schDateTime}
                        onChange={(e) => setSchDateTime(e.target.value)}
                        className="w-full min-h-[44px] rounded-xl px-3.5 py-2 text-sm bg-[#FBF8F1] border border-[#E5DBC4] text-[#231E18]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#231E18] mb-1.5">
                        Ghi chú thêm
                      </label>
                      <textarea
                        rows={3}
                        maxLength={1000}
                        value={schNote}
                        onChange={(e) => setSchNote(e.target.value)}
                        placeholder="Mục tiêu cần Trợ lý hỗ trợ..."
                        className="w-full rounded-xl p-3 text-sm bg-[#FBF8F1] border border-[#E5DBC4] text-[#231E18]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={schBusy}
                      className="w-full min-h-[46px] rounded-xl bg-[#C45A15] hover:bg-[#AA4C0F] disabled:opacity-50 text-white font-bold text-sm"
                    >
                      {schBusy ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu đặt lịch'}
                    </button>
                  </form>

                  <div className="lg:col-span-7 space-y-3">
                    <h3 className="font-display text-lg font-extrabold text-[#231E18]">Lịch đã đặt</h3>
                    {studentSchedules.length === 0 ? (
                      <div className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-2xl p-8 text-center text-sm text-[#6B6154] shadow-xs">
                        Chưa có lịch học hay check-in nào.
                      </div>
                    ) : (
                      studentSchedules.map((s) => (
                        <div
                          key={s.id}
                          className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs"
                        >
                          <div className="space-y-1">
                            <div className="text-xs text-[#6B6154] tabular-nums">
                              <span className="font-mono-code font-bold">
                                {s.scheduledAt.replace('T', ' ')}
                              </span>{' '}
                              ·{' '}
                              <span
                                className={`font-bold ${
                                  s.status === 'confirmed' || s.status === 'completed'
                                    ? 'text-[#2B6334]'
                                    : s.status === 'cancelled'
                                      ? 'text-[#B9382C]'
                                      : 'text-[#C45A15]'
                                }`}
                              >
                                {SCHEDULE_STATUS_VI[s.status]}
                              </span>
                            </div>
                            <h4 className="font-display font-bold text-base text-[#231E18]">{s.title}</h4>
                            {s.note && <p className="text-xs text-[#6B6154]">{s.note}</p>}
                          </div>
                          {(s.status === 'requested' || s.status === 'confirmed') && (
                            <button
                              type="button"
                              onClick={() => handleCancelSchedule(s.id)}
                              className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-[#E5DBC4] text-xs font-bold text-[#B9382C] hover:bg-[#FDECEB]"
                            >
                              Hủy lịch
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </section>
              )}

              {/* TAB 3: TICKETS */}
              {tab === 'tickets' && (
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <form
                    onSubmit={handleCreateTicket}
                    className="lg:col-span-5 bg-[#FFFDF8] border border-[#E5DBC4] rounded-2xl p-5 space-y-4 shadow-xs"
                  >
                    <h3 className="font-display text-lg font-extrabold text-[#231E18]">
                      Gửi phiếu phản hồi / hỗ trợ
                    </h3>
                    {tktErr && (
                      <div className="rounded-xl p-3 bg-[#FDECEB] text-[#8E2A20] text-xs font-semibold">
                        {tktErr}
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-[#231E18] mb-1.5">Phân loại *</label>
                      <select
                        value={tktCategory}
                        onChange={(e) => setTktCategory(e.target.value as TicketCategory)}
                        className="w-full min-h-[44px] rounded-xl px-3.5 py-2 text-sm bg-[#FBF8F1] border border-[#E5DBC4] text-[#231E18]"
                      >
                        <option value="feedback">Góp ý (feedback)</option>
                        <option value="support">Hỗ trợ (support)</option>
                        <option value="management">Quản lý (management)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#231E18] mb-1.5">Tiêu đề *</label>
                      <input
                        type="text"
                        required
                        maxLength={140}
                        value={tktSubject}
                        onChange={(e) => setTktSubject(e.target.value)}
                        placeholder="Ví dụ: Đề nghị tăng thêm bài tập đọc hiểu"
                        className="w-full min-h-[44px] rounded-xl px-3.5 py-2 text-sm bg-[#FBF8F1] border border-[#E5DBC4] text-[#231E18]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#231E18] mb-1.5">
                        Nội dung chi tiết *
                      </label>
                      <textarea
                        rows={4}
                        required
                        maxLength={2000}
                        value={tktContent}
                        onChange={(e) => setTktContent(e.target.value)}
                        placeholder="Mô tả chi tiết điều phụ huynh mong muốn..."
                        className="w-full rounded-xl p-3 text-sm bg-[#FBF8F1] border border-[#E5DBC4] text-[#231E18]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={tktBusy}
                      className="w-full min-h-[46px] rounded-xl bg-[#C45A15] hover:bg-[#AA4C0F] disabled:opacity-50 text-white font-bold text-sm"
                    >
                      {tktBusy ? 'Đang gửi phiếu...' : 'Gửi phiếu hỗ trợ'}
                    </button>
                  </form>

                  <div className="lg:col-span-7 space-y-3">
                    <h3 className="font-display text-lg font-extrabold text-[#231E18]">
                      Lịch sử phiếu hỗ trợ
                    </h3>
                    {studentTickets.length === 0 ? (
                      <div className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-2xl p-8 text-center text-sm text-[#6B6154] shadow-xs">
                        Chưa có phiếu hỗ trợ nào được gửi.
                      </div>
                    ) : (
                      studentTickets.map((t) => (
                        <div
                          key={t.id}
                          className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-2xl p-4 space-y-2.5 shadow-xs"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs text-[#6B6154]">
                            <span>
                              {TICKET_CAT_VI[t.category]} · {formatTimestampVi(t.createdAt)}
                            </span>
                            <span
                              className={`font-bold ${
                                t.status === 'resolved' ? 'text-[#2B6334]' : 'text-[#C45A15]'
                              }`}
                            >
                              {t.status === 'resolved' ? 'Đã phản hồi' : 'Đang mở'}
                            </span>
                          </div>
                          <h4 className="font-display font-bold text-base text-[#231E18]">{t.subject}</h4>
                          <p className="text-sm text-[#231E18] whitespace-pre-wrap">{t.content}</p>
                          {t.response && (
                            <div className="rounded-xl p-3 bg-[#E9F5EC] border border-[#BBDDC1] text-xs text-[#1F4A26] space-y-1">
                              <div className="font-bold">Phản hồi từ Trợ lý:</div>
                              <div className="whitespace-pre-wrap">{t.response}</div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </section>
              )}

              {/* TAB 4: FOCUS TREE */}
              {tab === 'focus' && (
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-6">
                    <FocusTree
                      totalMinutes={activeStudent.totalFocusMinutes}
                      streakDays={activeStudent.streakDays}
                    />
                  </div>
                  <div className="lg:col-span-6 bg-[#FFFDF8] border border-[#E5DBC4] rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-lg font-extrabold text-[#231E18]">
                        Phiên tập trung gần đây của con
                      </h3>
                      <span className="text-xs text-[#6B6154] tabular-nums">
                        {studentSessions.length} phiên
                      </span>
                    </div>
                    {studentSessions.length === 0 ? (
                      <p className="text-sm text-[#6B6154]">
                        Chưa có phiên tập trung nào được ghi nhận.
                      </p>
                    ) : (
                      <ul className="divide-y divide-[#E5DBC4] max-h-80 overflow-y-auto">
                        {studentSessions.slice(0, 10).map((s) => (
                          <li key={s.id} className="py-3 flex justify-between gap-2 text-sm">
                            <div className="min-w-0">
                              <p className="font-semibold text-[#231E18] truncate">
                                {s.note || 'Phiên tự học'}
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
            setTab('progress');
          }}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold ${
            tab === 'progress' ? 'text-[#C45A15]' : 'text-[#6B6154]'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span>Tiến độ</span>
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
          <CalendarClock className="w-5 h-5" />
          <span>Lịch học</span>
        </button>
        <button
          type="button"
          onClick={() => {
            playClickSound();
            setTab('tickets');
          }}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold ${
            tab === 'tickets' ? 'text-[#C45A15]' : 'text-[#6B6154]'
          }`}
        >
          <LifeBuoy className="w-5 h-5" />
          <span>Hỗ trợ</span>
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

      {/* Assignment Inspection Modal */}
      {zoomAssignment && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-3xl w-full max-w-xl p-6 space-y-4 my-auto max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[#E5DBC4] pb-3">
              <div>
                <p className="text-xs font-bold text-[#C45A15]">
                  {zoomAssignment.subject} · {zoomAssignment.type === 'today' ? 'Hôm nay' : 'Bổ sung'}
                </p>
                <h3 className="font-display text-xl font-bold text-[#231E18]">
                  {zoomAssignment.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setZoomAssignment(null)}
                aria-label="Đóng"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[#6B6154] hover:text-[#231E18]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {zoomAssignment.description && (
              <p className="text-sm text-[#231E18] whitespace-pre-wrap">{zoomAssignment.description}</p>
            )}

            {zoomAssignment.submissionImageDataUrl && (
              <img
                src={zoomAssignment.submissionImageDataUrl}
                alt="Bài làm của học sinh"
                referrerPolicy="no-referrer"
                className="w-full max-h-80 object-contain rounded-2xl border border-[#E5DBC4] bg-white"
              />
            )}

            {zoomAssignment.studentNote && (
              <div className="rounded-xl p-3 bg-[#FBF8F1] border border-[#E5DBC4] text-xs text-[#231E18]">
                <span className="font-bold">Ghi chú của con:</span>{' '}
                {zoomAssignment.studentNote}
              </div>
            )}

            {zoomAssignment.status === 'graded' && (
              <div className="rounded-xl p-4 bg-[#E9F5EC] border border-[#BBDDC1] text-sm text-[#1F4A26] space-y-1">
                <div className="font-bold">Điểm: {zoomAssignment.gradeText}</div>
                <div className="whitespace-pre-wrap">
                  {zoomAssignment.assistantFeedback || 'Đã chấm bài.'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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

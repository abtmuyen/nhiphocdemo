import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarClock,
  Check,
  Copy,
  Edit3,
  Flame,
  LifeBuoy,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Settings,
  Star,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  Assignment,
  AssignmentStatus,
  AssignmentType,
  ChatMessage,
  FeedbackTicket,
  Schedule,
  StudentProfile,
  UserPublic,
} from '../types';
import {
  createAssignment,
  deletePendingAssignment,
  gradeAssignmentWork,
  respondFeedbackTicket,
  toggleAssistantOnline,
  updatePendingAssignment,
  updateScheduleStatus,
} from '../services/firestoreService';
import { signOutUser } from '../firebase';
import { formatTimestampVi } from '../utils/dateUtils';
import { playClickSound, playSuccessSound } from '../utils/sound';
import { HeartbeatSlogan, MascotAvatar, NhiphocLogoMark } from './NhipNhoMascot';
import { ChatDrawer } from './ChatDrawer';

interface AssistantWorkspaceProps {
  currentUser: UserPublic;
  students: StudentProfile[];
  activeStudent: StudentProfile | null;
  onSelectStudent: (id: string) => void;
  assignments: Assignment[];
  messages: ChatMessage[];
  schedules: Schedule[];
  tickets: FeedbackTicket[];
  unreadMessageCount: number;
  soundOn: boolean;
  onToggleSound: () => void;
  onOpenAccount: (section?: 'default' | 'delete') => void;
}

type AssistantTab = 'assignments' | 'schedules' | 'tickets';
type AssignmentFilter = 'all' | AssignmentStatus;

export function AssistantWorkspace({
  currentUser,
  students,
  activeStudent,
  onSelectStudent,
  assignments,
  messages,
  schedules,
  tickets,
  unreadMessageCount,
  soundOn,
  onToggleSound,
  onOpenAccount,
}: AssistantWorkspaceProps) {
  const [tab, setTab] = useState<AssistantTab>('assignments');
  const [asgFilter, setAsgFilter] = useState<AssignmentFilter>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);

  // Create / Edit assignment modal
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [asgType, setAsgType] = useState<AssignmentType>('today');
  const [asgSubject, setAsgSubject] = useState('');
  const [asgTitle, setAsgTitle] = useState('');
  const [asgDesc, setAsgDesc] = useState('');
  const [asgDue, setAsgDue] = useState('');
  const [editorBusy, setEditorBusy] = useState(false);
  const [editorErr, setEditorErr] = useState('');

  // Grading modal
  const [gradingTarget, setGradingTarget] = useState<Assignment | null>(null);
  const [gradeText, setGradeText] = useState('');
  const [assistantFeedback, setAssistantFeedback] = useState('');
  const [gradingBusy, setGradingBusy] = useState(false);
  const [gradingErr, setGradingErr] = useState('');

  // Ticket response state
  const [ticketReplies, setTicketReplies] = useState<Record<string, string>>({});
  const [replyBusyId, setReplyBusyId] = useState<string | null>(null);

  const studentAssignments = useMemo(
    () =>
      activeStudent
        ? assignments
            .filter((a) => a.studentId === activeStudent.id)
            .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
        : [],
    [assignments, activeStudent],
  );

  const filteredAssignments = useMemo(() => {
    if (asgFilter === 'all') return studentAssignments;
    return studentAssignments.filter((a) => a.status === asgFilter);
  }, [studentAssignments, asgFilter]);

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

  const submittedWaitCount = studentAssignments.filter((a) => a.status === 'submitted').length;
  const gradedCount = studentAssignments.filter((a) => a.status === 'graded').length;
  const openTicketsCount = studentTickets.filter((t) => t.status === 'open').length;

  const handleToggleOnline = async () => {
    if (togglingOnline) return;
    playClickSound();
    setTogglingOnline(true);
    try {
      await toggleAssistantOnline(currentUser.uid, !currentUser.isOnline);
    } finally {
      setTogglingOnline(false);
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

  const openCreateModal = () => {
    playClickSound();
    setEditingId(null);
    setAsgType('today');
    setAsgSubject('');
    setAsgTitle('');
    setAsgDesc('');
    setAsgDue('Hôm nay 20:00');
    setEditorErr('');
    setEditorOpen(true);
  };

  const openEditModal = (asg: Assignment) => {
    playClickSound();
    setEditingId(asg.id);
    setAsgType(asg.type);
    setAsgSubject(asg.subject);
    setAsgTitle(asg.title);
    setAsgDesc(asg.description);
    setAsgDue(asg.dueDate);
    setEditorErr('');
    setEditorOpen(true);
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent || editorBusy) return;
    playClickSound();
    setEditorBusy(true);
    setEditorErr('');
    try {
      if (editingId) {
        await updatePendingAssignment({
          assignmentId: editingId,
          type: asgType,
          subject: asgSubject,
          title: asgTitle,
          description: asgDesc,
          dueDate: asgDue,
        });
      } else {
        await createAssignment({
          student: activeStudent,
          createdByUid: currentUser.uid,
          type: asgType,
          subject: asgSubject,
          title: asgTitle,
          description: asgDesc,
          dueDate: asgDue,
        });
      }
      playSuccessSound();
      setEditorOpen(false);
    } catch (err) {
      setEditorErr(err instanceof Error ? err.message : 'Không lưu được bài tập.');
    } finally {
      setEditorBusy(false);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    playClickSound();
    await deletePendingAssignment(id);
  };

  const openGradeModal = (asg: Assignment) => {
    playClickSound();
    setGradingTarget(asg);
    setGradeText(asg.gradeText || '');
    setAssistantFeedback(asg.assistantFeedback || '');
    setGradingErr('');
  };

  const handleSubmitGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingTarget || gradingBusy) return;
    if (!gradeText.trim()) {
      setGradingErr('Vui lòng nhập điểm dạng chữ (ví dụ: 9/10, A+, Tốt).');
      return;
    }
    playClickSound();
    setGradingBusy(true);
    setGradingErr('');
    try {
      await gradeAssignmentWork({
        assignmentId: gradingTarget.id,
        gradeText,
        assistantFeedback,
      });
      playSuccessSound();
      setGradingTarget(null);
    } catch (err) {
      setGradingErr(err instanceof Error ? err.message : 'Không chấm bài được.');
    } finally {
      setGradingBusy(false);
    }
  };

  const handleReplyTicket = async (ticketId: string) => {
    const reply = (ticketReplies[ticketId] || '').trim();
    if (!reply || replyBusyId) return;
    playClickSound();
    setReplyBusyId(ticketId);
    try {
      await respondFeedbackTicket({
        ticketId,
        respondedByUid: currentUser.uid,
        response: reply,
      });
      playSuccessSound();
      setTicketReplies((prev) => ({ ...prev, [ticketId]: '' }));
    } finally {
      setReplyBusyId(null);
    }
  };

  const pageTitleMap: Record<AssistantTab, string> = {
    assignments: 'Bài tập & Chấm bài',
    schedules: 'Lịch học & Check-in',
    tickets: 'Phiếu phản hồi & Hỗ trợ',
  };

  const navItems: { id: AssistantTab; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      id: 'assignments',
      label: 'Bài tập & Chấm',
      icon: <BookOpen className="w-4 h-4" />,
      count: submittedWaitCount,
    },
    {
      id: 'schedules',
      label: 'Lịch học & Check-in',
      icon: <CalendarClock className="w-4 h-4" />,
    },
    {
      id: 'tickets',
      label: 'Phiếu hỗ trợ',
      icon: <LifeBuoy className="w-4 h-4" />,
      count: openTicketsCount,
    },
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
              {activeStudent ? `${activeStudent.name} · ${activeStudent.grade}` : 'Trợ lý đồng hành'}
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
            aria-label="Chọn học sinh phụ trách"
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

      <nav aria-label="Menu trợ lý" className="px-3 py-2 space-y-1">
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
              className={`w-full min-h-[42px] px-3.5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-between gap-2 transition-colors text-left ${
                active
                  ? 'bg-[#C45A15] text-white shadow-xs'
                  : 'text-[#231E18] hover:bg-[#F4EDE0]'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                {item.icon}
                <span className="truncate">{item.label}</span>
              </span>
              {typeof item.count === 'number' && item.count > 0 && (
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md tabular-nums ${
                    active ? 'bg-white/20 text-white' : 'bg-[#EFE7D6] text-[#C45A15]'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Online Status Toggle inside Sidebar */}
      <div className="px-3 mt-2">
        <button
          type="button"
          disabled={togglingOnline}
          onClick={handleToggleOnline}
          className={`w-full min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors text-left ${
            currentUser.isOnline
              ? 'bg-[#E9F5EC] border-[#A7D3AF] text-[#2B6334]'
              : 'bg-[#F3ECDC] border-[#E5DBC4] text-[#6B6154]'
          }`}
        >
          {currentUser.isOnline ? 'Trạng thái: Đang online' : 'Trạng thái: Ngoại tuyến'}
        </button>
      </div>

      {activeStudent && (
        <div className="mx-3 mt-4 rounded-2xl bg-[#FDF5DE] border border-[#EEDDB8] p-3.5 space-y-2.5">
          <div className="text-xs font-bold text-[#C45A15]">Mã kết nối gia đình</div>
          <p className="text-[11px] leading-relaxed text-[#6B6154]">
            Gửi mã này cho Học sinh hoặc Phụ huynh để liên kết cùng theo dõi tiến độ.
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
              Trợ lý · {currentUser.isOnline ? 'Đang online' : 'Ngoại tuyến'}
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
                Trợ lý · {activeStudent ? `${activeStudent.name} (${activeStudent.grade})` : 'Chưa chọn học sinh'}
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
                <span className="hidden sm:inline">Tin nhắn gia đình</span>
                <span className="sm:hidden">Tin nhắn</span>
                {unreadMessageCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#C45A15] text-white text-[10px] font-bold tabular-nums">
                    {unreadMessageCount}
                  </span>
                )}
              </button>
            )}

            {activeStudent && (
              <button
                type="button"
                onClick={openCreateModal}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-[#C45A15] hover:bg-[#AA4C0F] text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Giao bài tập mới</span>
              </button>
            )}
          </div>
        </header>

        <main className="max-w-5xl w-full mx-auto px-4 sm:px-7 pt-6 space-y-6">
          {!activeStudent ? (
            <div className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-3xl p-8 text-center space-y-4">
              <MascotAvatar mood="surprised" size="lg" className="mx-auto" />
              <p className="font-display font-bold text-lg">Chưa có hồ sơ học sinh nào</p>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onOpenAccount('default');
                }}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#C45A15] hover:bg-[#AA4C0F] text-white text-sm font-bold"
              >
                Mở Hồ sơ để tạo hoặc kết nối học sinh
              </button>
            </div>
          ) : (
            <>
              {/* Hero Welcome Banner */}
              <section className="rounded-3xl bg-gradient-to-r from-[#FBF0CC] via-[#FDF5DC] to-[#FAF0D4] border border-[#EBDAA8] p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 min-w-0">
                  <MascotAvatar
                    mood={submittedWaitCount > 0 ? 'surprised' : 'study'}
                    size="lg"
                    className="shrink-0"
                  />
                  <div className="space-y-1.5 min-w-0">
                    <HeartbeatSlogan className="text-xs sm:text-sm" />
                    <h2 className="font-display text-xl sm:text-2xl font-extrabold text-[#231E18] leading-snug text-balance">
                      {submittedWaitCount > 0
                        ? `Có ${submittedWaitCount} bài nộp mới từ ${activeStudent.name} đang chờ Trợ lý chấm!`
                        : `Trợ lý ${currentUser.displayName} đang đồng hành cùng ${activeStudent.name}.`}
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

              {/* TAB 1: ASSIGNMENTS */}
              {tab === 'assignments' && (
                <section className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-2 shadow-xs">
                      <span className="text-xs font-medium text-[#6B6154]">Chờ Trợ lý chấm</span>
                      <div className="font-display text-2xl font-extrabold text-[#C45A15] tabular-nums">
                        {submittedWaitCount} bài
                      </div>
                    </div>
                    <div className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-2 shadow-xs">
                      <span className="text-xs font-medium text-[#6B6154]">Đã chấm xong</span>
                      <div className="font-display text-2xl font-extrabold text-[#2B6334] tabular-nums">
                        {gradedCount}/{studentAssignments.length} bài
                      </div>
                    </div>
                    <div className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-2 shadow-xs">
                      <span className="text-xs font-medium text-[#6B6154]">Trạng thái hiển thị</span>
                      <div className="font-display text-base sm:text-lg font-extrabold text-[#231E18]">
                        {currentUser.isOnline ? 'Đang online · Sẵn sàng' : 'Ngoại tuyến'}
                      </div>
                    </div>
                  </div>

                  {/* Filter Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#EFE7D6] rounded-xl">
                      {(
                        [
                          { id: 'all', label: 'Tất cả' },
                          { id: 'submitted', label: 'Chờ chấm' },
                          { id: 'pending', label: 'Chưa nộp' },
                          { id: 'graded', label: 'Đã chấm' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            playClickSound();
                            setAsgFilter(opt.id);
                          }}
                          className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                            asgFilter === opt.id
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

                  {filteredAssignments.length === 0 ? (
                    <div className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-2xl p-10 text-center text-sm text-[#6B6154] shadow-xs">
                      Chưa có bài tập nào phù hợp. Bấm "Giao bài tập mới" để tạo giấy note đầu tiên!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredAssignments.map((asg) => (
                        <article
                          key={asg.id}
                          className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                        >
                          <div className="flex items-start gap-4 min-w-0 flex-1">
                            {asg.submissionImageDataUrl && (
                              <img
                                src={asg.submissionImageDataUrl}
                                alt="Ảnh bài làm"
                                referrerPolicy="no-referrer"
                                onClick={() => openGradeModal(asg)}
                                className="w-20 h-20 object-cover rounded-xl border border-[#E5DBC4] cursor-pointer shrink-0"
                              />
                            )}
                            <div className="min-w-0 space-y-1 flex-1">
                              <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B6154]">
                                <span className="font-bold text-[#C45A15]">
                                  {asg.subject} · {asg.type === 'today' ? 'Hôm nay' : 'Bổ sung'}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>{asg.dueDate || 'Trong ngày'}</span>
                                <span aria-hidden="true">·</span>
                                <span
                                  className={`font-bold ${
                                    asg.status === 'graded'
                                      ? 'text-[#2B6334]'
                                      : asg.status === 'submitted'
                                        ? 'text-[#C45A15]'
                                        : 'text-[#6B6154]'
                                  }`}
                                >
                                  {asg.status === 'graded'
                                    ? `Đã chấm · ${asg.gradeText}`
                                    : asg.status === 'submitted'
                                      ? 'Học sinh đã nộp'
                                      : 'Đang chờ làm'}
                                </span>
                              </div>
                              <h3 className="font-display text-base sm:text-lg font-extrabold text-[#231E18]">
                                {asg.title}
                              </h3>
                              {asg.description && (
                                <p className="text-sm text-[#6B6154] line-clamp-2">{asg.description}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {asg.status === 'pending' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(asg)}
                                  aria-label="Sửa bài tập"
                                  className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl border border-[#E5DBC4] text-[#231E18] hover:bg-[#F3ECDC]"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAssignment(asg.id)}
                                  aria-label="Xóa bài tập"
                                  className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl border border-[#E5DBC4] text-[#B9382C] hover:bg-[#FDECEB]"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {asg.status !== 'graded' ? (
                              <button
                                type="button"
                                onClick={() => openGradeModal(asg)}
                                className="min-h-[38px] px-4 py-2 rounded-xl bg-[#C45A15] hover:bg-[#AA4C0F] text-white text-xs font-bold whitespace-nowrap"
                              >
                                Chấm bài
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openGradeModal(asg)}
                                className="min-h-[38px] px-4 py-2 rounded-xl border border-[#BBDDC1] bg-[#E9F5EC] text-xs font-bold text-[#2B6334] whitespace-nowrap"
                              >
                                Xem bài
                              </button>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* TAB 2: SCHEDULES */}
              {tab === 'schedules' && (
                <section className="space-y-4">
                  <h3 className="font-display text-lg font-extrabold">Lịch học & Check-in</h3>
                  {studentSchedules.length === 0 ? (
                    <div className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-2xl p-8 text-center text-sm text-[#6B6154] shadow-xs">
                      Chưa có yêu cầu đặt lịch nào từ Phụ huynh.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {studentSchedules.map((s) => (
                        <div
                          key={s.id}
                          className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-2xl p-5 space-y-3 shadow-xs"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs text-[#6B6154]">
                            <span className="font-mono-code font-bold tabular-nums">
                              {s.scheduledAt.replace('T', ' ')}
                            </span>
                            <span className="font-bold text-[#C45A15]">
                              {s.status === 'requested'
                                ? 'Chờ xác nhận'
                                : s.status === 'confirmed'
                                  ? 'Đã xác nhận'
                                  : s.status === 'completed'
                                    ? 'Đã hoàn thành'
                                    : 'Đã hủy'}
                            </span>
                          </div>
                          <h4 className="font-display text-base font-extrabold text-[#231E18]">
                            {s.title}
                          </h4>
                          {s.note && <p className="text-sm text-[#6B6154]">{s.note}</p>}
                          {(s.status === 'requested' || s.status === 'confirmed') && (
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E5DBC4]">
                              {s.status === 'requested' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    playClickSound();
                                    updateScheduleStatus(s.id, 'confirmed');
                                  }}
                                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#C45A15] text-white text-xs font-bold flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Xác nhận lịch</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  playClickSound();
                                  updateScheduleStatus(s.id, 'completed');
                                }}
                                className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#2B6334] text-white text-xs font-bold"
                              >
                                Đánh dấu hoàn thành
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  playClickSound();
                                  updateScheduleStatus(s.id, 'cancelled');
                                }}
                                className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-[#E5DBC4] text-xs font-bold text-[#B9382C]"
                              >
                                Hủy
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* TAB 3: TICKETS */}
              {tab === 'tickets' && (
                <section className="space-y-4">
                  <h3 className="font-display text-lg font-extrabold">Phiếu phản hồi & Hỗ trợ</h3>
                  {studentTickets.length === 0 ? (
                    <div className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-2xl p-8 text-center text-sm text-[#6B6154] shadow-xs">
                      Chưa có phiếu hỗ trợ nào từ Phụ huynh.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {studentTickets.map((t) => (
                        <div
                          key={t.id}
                          className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-2xl p-5 space-y-3 shadow-xs"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs text-[#6B6154]">
                            <span>
                              {t.category} · {formatTimestampVi(t.createdAt)}
                            </span>
                            <span
                              className={`font-bold ${
                                t.status === 'resolved' ? 'text-[#2B6334]' : 'text-[#C45A15]'
                              }`}
                            >
                              {t.status === 'resolved' ? 'Đã giải quyết' : 'Chờ phản hồi'}
                            </span>
                          </div>
                          <h4 className="font-display text-base font-extrabold text-[#231E18]">
                            {t.subject}
                          </h4>
                          <p className="text-sm text-[#231E18] whitespace-pre-wrap">{t.content}</p>

                          {t.status === 'resolved' ? (
                            <div className="rounded-xl p-3 bg-[#E9F5EC] border border-[#BBDDC1] text-sm text-[#1F4A26]">
                              <div className="font-bold text-xs mb-1">Phản hồi của bạn:</div>
                              <div className="whitespace-pre-wrap">{t.response}</div>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row gap-2 pt-2">
                              <input
                                type="text"
                                value={ticketReplies[t.id] || ''}
                                onChange={(e) =>
                                  setTicketReplies((prev) => ({ ...prev, [t.id]: e.target.value }))
                                }
                                placeholder="Nhập câu trả lời gửi Phụ huynh..."
                                maxLength={2000}
                                className="flex-1 min-h-[42px] rounded-xl px-3.5 py-2 text-sm bg-[#FBF8F1] border border-[#E5DBC4]"
                              />
                              <button
                                type="button"
                                disabled={!(ticketReplies[t.id] || '').trim() || replyBusyId === t.id}
                                onClick={() => handleReplyTicket(t.id)}
                                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#C45A15] text-white text-xs font-bold disabled:opacity-50 whitespace-nowrap"
                              >
                                {replyBusyId === t.id ? 'Đang gửi...' : 'Gửi phản hồi'}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav
        aria-label="Điều hướng nhanh"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#FFFDF8]/95 backdrop-blur-md border-t border-[#E5DBC4] grid grid-cols-3 h-16"
      >
        <button
          type="button"
          onClick={() => {
            playClickSound();
            setTab('assignments');
          }}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold ${
            tab === 'assignments' ? 'text-[#C45A15]' : 'text-[#6B6154]'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span>Bài tập</span>
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
      </nav>

      {/* Create / Edit Assignment Modal */}
      {editorOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveAssignment}
            className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-3xl w-full max-w-lg p-6 space-y-4 my-auto shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#E5DBC4] pb-3">
              <h2 className="font-display text-xl font-bold">
                {editingId ? 'Sửa bài tập' : 'Giao bài tập mới'}
              </h2>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                aria-label="Đóng"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[#6B6154]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editorErr && (
              <div className="rounded-xl p-3 bg-[#FDECEB] text-[#8E2A20] text-xs font-semibold">
                {editorErr}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1.5">Loại bài *</label>
                <select
                  value={asgType}
                  onChange={(e) => setAsgType(e.target.value as AssignmentType)}
                  className="w-full min-h-[42px] rounded-xl px-3 py-2 text-sm bg-[#FBF8F1] border border-[#E5DBC4]"
                >
                  <option value="today">Hôm nay</option>
                  <option value="extra">Bổ sung</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5">Môn học *</label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={asgSubject}
                  onChange={(e) => setAsgSubject(e.target.value)}
                  placeholder="Toán, Tiếng Anh..."
                  className="w-full min-h-[42px] rounded-xl px-3 py-2 text-sm bg-[#FBF8F1] border border-[#E5DBC4]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5">Tiêu đề bài tập *</label>
              <input
                type="text"
                required
                maxLength={140}
                value={asgTitle}
                onChange={(e) => setAsgTitle(e.target.value)}
                placeholder="Ví dụ: Giải 5 bài phương trình bậc nhất"
                className="w-full min-h-[42px] rounded-xl px-3.5 py-2 text-sm bg-[#FBF8F1] border border-[#E5DBC4]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5">Mô tả / Yêu cầu chi tiết</label>
              <textarea
                rows={3}
                maxLength={2000}
                value={asgDesc}
                onChange={(e) => setAsgDesc(e.target.value)}
                placeholder="Hướng dẫn làm bài, trang sách giáo khoa..."
                className="w-full rounded-xl p-3 text-sm bg-[#FBF8F1] border border-[#E5DBC4]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5">Hạn nộp</label>
              <input
                type="text"
                maxLength={40}
                value={asgDue}
                onChange={(e) => setAsgDue(e.target.value)}
                placeholder="Ví dụ: 20:00 hôm nay"
                className="w-full min-h-[42px] rounded-xl px-3.5 py-2 text-sm bg-[#FBF8F1] border border-[#E5DBC4]"
              />
            </div>

            <button
              type="submit"
              disabled={editorBusy}
              className="w-full min-h-[46px] rounded-xl bg-[#C45A15] hover:bg-[#AA4C0F] text-white font-bold text-sm disabled:opacity-50"
            >
              {editorBusy ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Giao bài tập'}
            </button>
          </form>
        </div>
      )}

      {/* Grading Modal */}
      {gradingTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSubmitGrade}
            className="bg-[#FFFDF8] border border-[#E5DBC4] rounded-3xl w-full max-w-xl p-6 space-y-4 my-auto max-h-[92vh] overflow-y-auto shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-[#E5DBC4] pb-3">
              <div>
                <p className="text-xs font-bold text-[#C45A15]">{gradingTarget.subject}</p>
                <h2 className="font-display text-xl font-bold">{gradingTarget.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setGradingTarget(null)}
                aria-label="Đóng"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[#6B6154]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {gradingTarget.submissionImageDataUrl ? (
              <img
                src={gradingTarget.submissionImageDataUrl}
                alt="Bài làm của học sinh"
                referrerPolicy="no-referrer"
                className="w-full max-h-80 object-contain rounded-2xl border border-[#E5DBC4] bg-white"
              />
            ) : (
              <div className="rounded-xl p-3 bg-[#FAF4E8] text-xs text-[#6B6154]">
                Học sinh chưa đính kèm ảnh bài làm.
              </div>
            )}

            {gradingTarget.studentNote && (
              <div className="rounded-xl p-3 bg-[#FAF4E8] border border-[#E5DBC4] text-sm">
                <span className="font-bold">Ghi chú của học sinh:</span> {gradingTarget.studentNote}
              </div>
            )}

            {gradingErr && (
              <div className="rounded-xl p-3 bg-[#FDECEB] text-[#8E2A20] text-xs font-semibold">
                {gradingErr}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold mb-1.5">
                Điểm dạng chữ * (khi đã chấm sẽ khóa bài không sửa lại)
              </label>
              <input
                type="text"
                required
                disabled={gradingTarget.status === 'graded'}
                maxLength={40}
                value={gradeText}
                onChange={(e) => setGradeText(e.target.value)}
                placeholder="Ví dụ: 9.5/10, A+, Rất tốt"
                className="w-full min-h-[42px] rounded-xl px-3.5 py-2 text-sm bg-[#FBF8F1] border border-[#E5DBC4] disabled:bg-[#F5EFE2]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5">Nhận xét chi tiết</label>
              <textarea
                rows={3}
                disabled={gradingTarget.status === 'graded'}
                maxLength={1500}
                value={assistantFeedback}
                onChange={(e) => setAssistantFeedback(e.target.value)}
                placeholder="Khen ngợi điểm làm tốt và chỉ dẫn phần cần sửa..."
                className="w-full rounded-xl p-3 text-sm bg-[#FBF8F1] border border-[#E5DBC4] disabled:bg-[#F5EFE2]"
              />
            </div>

            {gradingTarget.status !== 'graded' && (
              <button
                type="submit"
                disabled={gradingBusy}
                className="w-full min-h-[46px] rounded-xl bg-[#C45A15] hover:bg-[#AA4C0F] text-white font-bold text-sm disabled:opacity-50"
              >
                {gradingBusy ? 'Đang lưu kết quả...' : 'Hoàn tất chấm bài'}
              </button>
            )}
          </form>
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

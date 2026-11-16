import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db, handleFirestoreError } from './firebase';
import {
  Assignment,
  ChatMessage,
  FeedbackTicket,
  FocusSession,
  OperationType,
  Schedule,
  StudentProfile,
  ToastItem,
  UserPrivate,
  UserPublic,
} from './types';
import {
  fetchUserPrivate,
  getRoleUidField,
  subscribeUserPublic,
  syncStudentChildrenUids,
} from './services/firestoreService';
import { isSoundEnabled, playClickSound, playToastSound, setSoundEnabled } from './utils/sound';
import { AuthScreen } from './components/AuthScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { StudentWorkspace } from './components/StudentWorkspace';
import { ParentWorkspace } from './components/ParentWorkspace';
import { AssistantWorkspace } from './components/AssistantWorkspace';
import { ToastContainer } from './components/ToastContainer';
import { AccountModal } from './components/AccountModal';
import { NhipNhoMascot } from './components/NhipNhoMascot';

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userPublic, setUserPublic] = useState<UserPublic | null>(null);
  const [userPrivate, setUserPrivate] = useState<UserPrivate | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [tickets, setTickets] = useState<FeedbackTicket[]>([]);
  const [linkedAssistant, setLinkedAssistant] = useState<UserPublic | null>(null);

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [soundOn, setSoundOn] = useState<boolean>(() => isSoundEnabled());
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountInitialSection, setAccountInitialSection] = useState<'default' | 'delete'>('default');
  const [onboardingVersion, setOnboardingVersion] = useState(0);

  const openAccountModal = useCallback((section: 'default' | 'delete' = 'default') => {
    setAccountInitialSection(section);
    setAccountOpen(true);
  }, []);

  // Initial-load refs so first onSnapshot does NOT fire toasts
  const asgInitRef = useRef(false);
  const msgInitRef = useRef(false);
  const tktInitRef = useRef(false);
  const prevAsgStatusRef = useRef<Record<string, string>>({});
  const prevTktStatusRef = useRef<Record<string, string>>({});

  const pushToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    playToastSound();
    setToasts((prev) => [{ ...toast, id }, ...prev].slice(0, 4));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 5500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleToggleSound = useCallback(() => {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
    if (next) playClickSound();
  }, [soundOn]);

  // 1. Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (!user) {
        setUserPublic(null);
        setUserPrivate(null);
        setStudents([]);
        setAssignments([]);
        setFocusSessions([]);
        setMessages([]);
        setSchedules([]);
        setTickets([]);
      }
    });
    return () => unsub();
  }, []);

  // 2. User profile listener
  useEffect(() => {
    if (!firebaseUser) return;
    setProfileLoading(true);
    let active = true;

    const unsubPublic = subscribeUserPublic(firebaseUser.uid, (pub) => {
      if (!active) return;
      setUserPublic(pub);
      setProfileLoading(false);
      if (pub) {
        fetchUserPrivate(firebaseUser.uid)
          .then((priv) => {
            if (active) setUserPrivate(priv);
          })
          .catch(() => {});
      }
    });

    return () => {
      active = false;
      unsubPublic();
    };
  }, [firebaseUser, onboardingVersion]);

  // 3. Real-time data listeners gated by userPublic role
  useEffect(() => {
    if (!firebaseUser || !userPublic) return;

    const uid = firebaseUser.uid;
    const role = userPublic.role;
    const roleField = getRoleUidField(role);

    asgInitRef.current = false;
    msgInitRef.current = false;
    tktInitRef.current = false;
    prevAsgStatusRef.current = {};
    prevTktStatusRef.current = {};

    const unsubStudents = onSnapshot(
      query(collection(db, 'students'), where(roleField, '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as StudentProfile);
        setStudents(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'students'),
    );

    const unsubAssignments = onSnapshot(
      query(collection(db, 'assignments'), where(roleField, '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as Assignment);
        setAssignments(list);

        if (!asgInitRef.current) {
          asgInitRef.current = true;
          list.forEach((a) => {
            prevAsgStatusRef.current[a.id] = a.status;
          });
          return;
        }

        snap.docChanges().forEach((change) => {
          const item = change.doc.data() as Assignment;
          const prevStatus = prevAsgStatusRef.current[item.id];
          prevAsgStatusRef.current[item.id] = item.status;

          if (change.type === 'added' && item.status === 'pending' && role !== 'assistant') {
            pushToast({
              title: `Bài tập mới · ${item.subject}`,
              description: item.title,
              tone: 'info',
            });
          } else if (change.type === 'modified') {
            if (prevStatus !== 'submitted' && item.status === 'submitted' && role !== 'student') {
              pushToast({
                title: 'Học sinh vừa nộp bài',
                description: `${item.subject}: ${item.title}`,
                tone: 'info',
              });
            } else if (prevStatus !== 'graded' && item.status === 'graded' && role !== 'assistant') {
              pushToast({
                title: `Bài đã chấm: ${item.gradeText}`,
                description: `${item.subject}: ${item.title}`,
                tone: 'success',
              });
            }
          }
        });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'assignments'),
    );

    const unsubFocus = onSnapshot(
      query(collection(db, 'focus_sessions'), where(roleField, '==', uid)),
      (snap) => {
        setFocusSessions(snap.docs.map((d) => d.data() as FocusSession));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'focus_sessions'),
    );

    const unsubMessages = onSnapshot(
      query(collection(db, 'messages'), where(roleField, '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as ChatMessage);
        setMessages(list);

        if (!msgInitRef.current) {
          msgInitRef.current = true;
          return;
        }

        snap.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const msg = change.doc.data() as ChatMessage;
            if (msg.senderUid !== uid) {
              pushToast({
                title: `Tin nhắn mới từ ${msg.senderName}`,
                description: msg.text.slice(0, 90),
                tone: 'info',
              });
            }
          }
        });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'messages'),
    );

    const unsubSchedules = onSnapshot(
      query(collection(db, 'schedules'), where(roleField, '==', uid)),
      (snap) => {
        setSchedules(snap.docs.map((d) => d.data() as Schedule));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'schedules'),
    );

    const unsubTickets = onSnapshot(
      query(collection(db, 'feedback_tickets'), where(roleField, '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as FeedbackTicket);
        setTickets(list);

        if (!tktInitRef.current) {
          tktInitRef.current = true;
          list.forEach((t) => {
            prevTktStatusRef.current[t.id] = t.status;
          });
          return;
        }

        snap.docChanges().forEach((change) => {
          const ticket = change.doc.data() as FeedbackTicket;
          const prevStatus = prevTktStatusRef.current[ticket.id];
          prevTktStatusRef.current[ticket.id] = ticket.status;

          if (change.type === 'added' && ticket.status === 'open' && role === 'assistant') {
            pushToast({
              title: 'Phiếu hỗ trợ mới từ Phụ huynh',
              description: ticket.subject,
              tone: 'warning',
            });
          } else if (
            change.type === 'modified' &&
            prevStatus !== 'resolved' &&
            ticket.status === 'resolved' &&
            role === 'parent'
          ) {
            pushToast({
              title: 'Phiếu hỗ trợ đã có phản hồi',
              description: ticket.subject,
              tone: 'success',
            });
          }
        });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'feedback_tickets'),
    );

    return () => {
      unsubStudents();
      unsubAssignments();
      unsubFocus();
      unsubMessages();
      unsubSchedules();
      unsubTickets();
    };
  }, [firebaseUser, userPublic?.uid, userPublic?.role, pushToast]);

  // 4. Maintain selectedStudentId
  const activeStudent = useMemo(() => {
    if (students.length === 0) return null;
    return students.find((s) => s.id === selectedStudentId) || students[0];
  }, [students, selectedStudentId]);

  useEffect(() => {
    if (activeStudent && activeStudent.id !== selectedStudentId) {
      setSelectedStudentId(activeStudent.id);
    }
  }, [activeStudent, selectedStudentId]);

  // 5. Auto-sync member UIDs for historical child documents whenever student membership changes
  useEffect(() => {
    if (!firebaseUser || !userPublic || students.length === 0) return;

    students.forEach((student) => {
      const hasStale =
        assignments.some(
          (d) =>
            d.studentId === student.id &&
            (d.studentUid !== student.studentUid ||
              d.parentUid !== student.parentUid ||
              d.assistantUid !== student.assistantUid),
        ) ||
        focusSessions.some(
          (d) =>
            d.studentId === student.id &&
            (d.studentUid !== student.studentUid ||
              d.parentUid !== student.parentUid ||
              d.assistantUid !== student.assistantUid),
        ) ||
        messages.some(
          (d) =>
            d.studentId === student.id &&
            (d.studentUid !== student.studentUid ||
              d.parentUid !== student.parentUid ||
              d.assistantUid !== student.assistantUid),
        ) ||
        schedules.some(
          (d) =>
            d.studentId === student.id &&
            (d.studentUid !== student.studentUid ||
              d.parentUid !== student.parentUid ||
              d.assistantUid !== student.assistantUid),
        ) ||
        tickets.some(
          (d) =>
            d.studentId === student.id &&
            (d.studentUid !== student.studentUid ||
              d.parentUid !== student.parentUid ||
              d.assistantUid !== student.assistantUid),
        );

      if (hasStale) {
        syncStudentChildrenUids(student, firebaseUser.uid, userPublic.role).catch(() => {});
      }
    });
  }, [
    firebaseUser,
    userPublic,
    students,
    assignments,
    focusSessions,
    messages,
    schedules,
    tickets,
  ]);

  // 6. Listen to linked assistant online status for Student & Parent
  useEffect(() => {
    if (!activeStudent?.assistantUid || userPublic?.role === 'assistant') {
      setLinkedAssistant(null);
      return;
    }
    const unsub = subscribeUserPublic(activeStudent.assistantUid, setLinkedAssistant);
    return () => unsub();
  }, [activeStudent?.assistantUid, userPublic?.role]);

  const unreadMessageCount = useMemo(() => {
    if (!firebaseUser || !activeStudent) return 0;
    return messages.filter(
      (m) =>
        m.studentId === activeStudent.id &&
        m.senderUid !== firebaseUser.uid &&
        !m.readByUids.includes(firebaseUser.uid),
    ).length;
  }, [messages, activeStudent, firebaseUser]);

  if (!authReady || (firebaseUser && profileLoading)) {
    return (
      <div className="min-h-screen paper-bg-light flex flex-col items-center justify-center p-6 gap-4">
        <NhipNhoMascot
          mood="study"
          size="lg"
          message="Đang chuẩn bị bàn học giấy note cho bạn..."
        />
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <AuthScreen />
      </>
    );
  }

  if (!userPublic) {
    return (
      <>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <OnboardingScreen
          user={firebaseUser}
          onCompleted={() => setOnboardingVersion((v) => v + 1)}
        />
      </>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {userPublic.role === 'student' && (
        <StudentWorkspace
          currentUser={userPublic}
          students={students}
          activeStudent={activeStudent}
          onSelectStudent={setSelectedStudentId}
          assignments={assignments}
          focusSessions={focusSessions}
          messages={messages}
          schedules={schedules}
          linkedAssistant={linkedAssistant}
          unreadMessageCount={unreadMessageCount}
          soundOn={soundOn}
          onToggleSound={handleToggleSound}
          onOpenAccount={openAccountModal}
        />
      )}

      {userPublic.role === 'parent' && (
        <ParentWorkspace
          currentUser={userPublic}
          students={students}
          activeStudent={activeStudent}
          onSelectStudent={setSelectedStudentId}
          assignments={assignments}
          focusSessions={focusSessions}
          messages={messages}
          schedules={schedules}
          tickets={tickets}
          linkedAssistant={linkedAssistant}
          unreadMessageCount={unreadMessageCount}
          soundOn={soundOn}
          onToggleSound={handleToggleSound}
          onOpenAccount={openAccountModal}
        />
      )}

      {userPublic.role === 'assistant' && (
        <AssistantWorkspace
          currentUser={userPublic}
          students={students}
          activeStudent={activeStudent}
          onSelectStudent={setSelectedStudentId}
          assignments={assignments}
          messages={messages}
          schedules={schedules}
          tickets={tickets}
          unreadMessageCount={unreadMessageCount}
          soundOn={soundOn}
          onToggleSound={handleToggleSound}
          onOpenAccount={openAccountModal}
        />
      )}

      <AccountModal
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        user={firebaseUser}
        userPublic={userPublic}
        userPrivate={userPrivate}
        students={students}
        activeStudent={activeStudent}
        soundOn={soundOn}
        onToggleSound={handleToggleSound}
        initialSection={accountInitialSection}
      />
    </>
  );
}

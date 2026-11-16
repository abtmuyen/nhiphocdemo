import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { deleteUser, reauthenticateWithPopup, User } from 'firebase/auth';
import { auth, db, googleProvider, handleFirestoreError } from '../firebase';
import {
  Assignment,
  AssignmentType,
  ChatMessage,
  FeedbackTicket,
  FocusSession,
  OperationType,
  Schedule,
  ScheduleStatus,
  StudentInvite,
  StudentProfile,
  TicketCategory,
  UserPrivate,
  UserPublic,
  UserRole,
} from '../types';
import { computeNextStreak, getTodayDateKey } from '../utils/dateUtils';

export function getRoleUidField(role: UserRole): 'studentUid' | 'parentUid' | 'assistantUid' {
  if (role === 'student') return 'studentUid';
  if (role === 'parent') return 'parentUid';
  return 'assistantUid';
}

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `NH${suffix}`;
}

export function generateDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`;
}

export function normalizeInviteCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isValidInviteCodeFormat(code: string): boolean {
  return /^NH[A-Z0-9]{4,10}$/.test(code);
}

export async function fetchUserPublic(uid: string): Promise<UserPublic | null> {
  const path = `users_public/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users_public', uid));
    return snap.exists() ? (snap.data() as UserPublic) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function fetchUserPrivate(uid: string): Promise<UserPrivate | null> {
  const path = `users_private/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users_private', uid));
    return snap.exists() ? (snap.data() as UserPrivate) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeUserPublic(
  uid: string,
  callback: (data: UserPublic | null) => void,
): Unsubscribe {
  const path = `users_public/${uid}`;
  return onSnapshot(
    doc(db, 'users_public', uid),
    (snap) => {
      callback(snap.exists() ? (snap.data() as UserPublic) : null);
    },
    (error) => handleFirestoreError(error, OperationType.GET, path),
  );
}

export async function toggleAssistantOnline(uid: string, isOnline: boolean): Promise<void> {
  const path = `users_public/${uid}`;
  try {
    await updateDoc(doc(db, 'users_public', uid), {
      isOnline,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createOnboardingProfile(params: {
  user: User;
  displayName: string;
  phone: string;
  role: UserRole;
  mode: 'create' | 'join';
  studentName?: string;
  studentGrade?: string;
  inviteCode?: string;
}): Promise<void> {
  const { user, displayName, phone, role, mode, studentName, studentGrade, inviteCode } = params;
  const uid = user.uid;

  const cleanName = displayName.trim().slice(0, 80);
  const cleanPhone = phone.trim().slice(0, 20);
  const cleanEmail = (user.email || '').slice(0, 200);
  const cleanPhoto = (user.photoURL || '').slice(0, 1000);

  // If joining, validate invite code existence BEFORE writing user profile so errors don't leave partial onboarding
  let targetInvite: StudentInvite | null = null;
  if (mode === 'join') {
    const normalized = normalizeInviteCode(inviteCode || '');
    if (!isValidInviteCodeFormat(normalized)) {
      throw new Error('Mã kết nối phải bắt đầu bằng NH và dài từ 6 đến 12 ký tự chữ hoa hoặc số.');
    }
    try {
      const inviteSnap = await getDoc(doc(db, 'student_invites', normalized));
      if (!inviteSnap.exists()) {
        throw new Error(`Không tìm thấy mã kết nối "${normalized}". Vui lòng kiểm tra lại.`);
      }
      targetInvite = inviteSnap.data() as StudentInvite;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Không tìm thấy')) {
        throw error;
      }
      handleFirestoreError(error, OperationType.GET, `student_invites/${normalized}`);
    }
  }

  // Write users_public and users_private
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'users_public', uid), {
      uid,
      displayName: cleanName,
      role,
      photoURL: cleanPhoto,
      isOnline: role === 'assistant',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'users_private', uid), {
      uid,
      email: cleanEmail,
      phone: cleanPhone,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users_public/${uid}`);
  }

  // Create or join student workspace
  if (mode === 'create') {
    const sName = (studentName || cleanName).trim().slice(0, 80);
    const sGrade = (studentGrade || 'Chưa rõ lớp').trim().slice(0, 40);
    await createStudentWorkspace(uid, role, sName, sGrade);
  } else if (targetInvite) {
    await claimStudentSlot(uid, role, targetInvite.studentId);
  }
}

export async function createStudentWorkspace(
  uid: string,
  role: UserRole,
  studentName: string,
  grade: string,
): Promise<StudentProfile> {
  const studentId = generateDocId('stu');
  const code = generateInviteCode();
  const cleanName = studentName.trim().slice(0, 80);
  const cleanGrade = grade.trim().slice(0, 40);

  const studentData = {
    id: studentId,
    name: cleanName,
    grade: cleanGrade,
    inviteCode: code,
    studentUid: role === 'student' ? uid : null,
    parentUid: role === 'parent' ? uid : null,
    assistantUid: role === 'assistant' ? uid : null,
    createdByUid: uid,
    totalFocusMinutes: 0,
    streakDays: 0,
    lastFocusDate: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const inviteData = {
    code,
    studentId,
    studentName: cleanName,
    grade: cleanGrade,
    createdByUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'students', studentId), studentData);
    batch.set(doc(db, 'student_invites', code), inviteData);
    await batch.commit();
    return {
      ...studentData,
      createdAt: null,
      updatedAt: null,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `students/${studentId}`);
  }
}

async function claimStudentSlot(uid: string, role: UserRole, studentId: string): Promise<void> {
  const slotField = getRoleUidField(role);
  const path = `students/${studentId}`;
  try {
    await updateDoc(doc(db, 'students', studentId), {
      [slotField]: uid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function joinStudentByInviteCode(
  uid: string,
  role: UserRole,
  rawCode: string,
): Promise<StudentInvite> {
  const code = normalizeInviteCode(rawCode);
  if (!isValidInviteCodeFormat(code)) {
    throw new Error('Mã kết nối phải bắt đầu bằng NH và dài từ 6 đến 12 ký tự chữ hoa/số.');
  }

  let invite: StudentInvite | null = null;
  try {
    const snap = await getDoc(doc(db, 'student_invites', code));
    if (!snap.exists()) {
      throw new Error(`Không tìm thấy mã kết nối "${code}".`);
    }
    invite = snap.data() as StudentInvite;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Không tìm thấy')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.GET, `student_invites/${code}`);
  }

  if (!invite) {
    throw new Error('Mã kết nối không hợp lệ.');
  }

  await claimStudentSlot(uid, role, invite.studentId);
  return invite;
}

export async function syncStudentChildrenUids(
  student: StudentProfile,
  currentUid: string,
  role: UserRole,
): Promise<number> {
  const roleField = getRoleUidField(role);
  const childCollections = [
    'assignments',
    'focus_sessions',
    'messages',
    'schedules',
    'feedback_tickets',
  ] as const;

  let updatedCount = 0;

  for (const colName of childCollections) {
    try {
      const q = query(collection(db, colName), where(roleField, '==', currentUid));
      const snap = await getDocs(q);
      const staleDocs = snap.docs.filter((d) => {
        const data = d.data();
        return (
          data.studentId === student.id &&
          (data.studentUid !== student.studentUid ||
            data.parentUid !== student.parentUid ||
            data.assistantUid !== student.assistantUid)
        );
      });

      for (let i = 0; i < staleDocs.length; i += 400) {
        const chunk = staleDocs.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach((d) => {
          batch.update(d.ref, {
            studentUid: student.studentUid,
            parentUid: student.parentUid,
            assistantUid: student.assistantUid,
            updatedAt: serverTimestamp(),
          });
          updatedCount++;
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, colName);
    }
  }

  return updatedCount;
}

export async function createAssignment(params: {
  student: StudentProfile;
  createdByUid?: string;
  assistantUid?: string;
  type: AssignmentType;
  subject: string;
  title: string;
  description: string;
  dueDate: string;
}): Promise<void> {
  const id = generateDocId('asg');
  const path = `assignments/${id}`;
  const creatorUid = params.createdByUid || params.assistantUid || '';
  try {
    await setDoc(doc(db, 'assignments', id), {
      id,
      studentId: params.student.id,
      studentUid: params.student.studentUid,
      parentUid: params.student.parentUid,
      assistantUid: params.student.assistantUid,
      type: params.type,
      subject: params.subject.trim().slice(0, 60),
      title: params.title.trim().slice(0, 140),
      description: params.description.trim().slice(0, 2000),
      dueDate: params.dueDate.trim().slice(0, 40),
      status: 'pending',
      submissionImageDataUrl: '',
      studentNote: '',
      assistantFeedback: '',
      gradeText: '',
      createdByUid: creatorUid,
      submittedAt: null,
      gradedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updatePendingAssignment(params: {
  assignmentId: string;
  type: AssignmentType;
  subject: string;
  title: string;
  description: string;
  dueDate: string;
}): Promise<void> {
  const path = `assignments/${params.assignmentId}`;
  try {
    await updateDoc(doc(db, 'assignments', params.assignmentId), {
      type: params.type,
      subject: params.subject.trim().slice(0, 60),
      title: params.title.trim().slice(0, 140),
      description: params.description.trim().slice(0, 2000),
      dueDate: params.dueDate.trim().slice(0, 40),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deletePendingAssignment(assignmentId: string): Promise<void> {
  const path = `assignments/${assignmentId}`;
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'assignments', assignmentId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function submitAssignmentWork(params: {
  assignmentId: string;
  submissionImageDataUrl: string;
  studentNote: string;
}): Promise<void> {
  const path = `assignments/${params.assignmentId}`;
  try {
    await updateDoc(doc(db, 'assignments', params.assignmentId), {
      status: 'submitted',
      submissionImageDataUrl: params.submissionImageDataUrl,
      studentNote: params.studentNote.trim().slice(0, 1000),
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function gradeAssignmentWork(params: {
  assignmentId: string;
  gradeText: string;
  assistantFeedback: string;
}): Promise<void> {
  const path = `assignments/${params.assignmentId}`;
  try {
    await updateDoc(doc(db, 'assignments', params.assignmentId), {
      status: 'graded',
      gradeText: params.gradeText.trim().slice(0, 40),
      assistantFeedback: params.assistantFeedback.trim().slice(0, 1500),
      gradedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function recordFocusSession(params: {
  student: StudentProfile;
  studentUid: string;
  durationMinutes: number;
  note: string;
}): Promise<void> {
  const sessionId = generateDocId('foc');
  const clampedMins = Math.min(180, Math.max(1, Math.round(params.durationMinutes)));
  const todayKey = getTodayDateKey();
  const nextStreak = computeNextStreak(params.student.lastFocusDate, params.student.streakDays);
  const nextTotal = params.student.totalFocusMinutes + clampedMins;

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'focus_sessions', sessionId), {
      id: sessionId,
      studentId: params.student.id,
      studentUid: params.student.studentUid,
      parentUid: params.student.parentUid,
      assistantUid: params.student.assistantUid,
      durationMinutes: clampedMins,
      note: params.note.trim().slice(0, 300),
      completedDate: todayKey,
      createdByUid: params.studentUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'students', params.student.id), {
      totalFocusMinutes: nextTotal,
      streakDays: nextStreak,
      lastFocusDate: todayKey,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `focus_sessions/${sessionId}`);
  }
}

export async function sendChatMessage(params: {
  student: StudentProfile;
  senderUid: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
}): Promise<void> {
  const id = generateDocId('msg');
  const path = `messages/${id}`;
  try {
    await setDoc(doc(db, 'messages', id), {
      id,
      studentId: params.student.id,
      studentUid: params.student.studentUid,
      parentUid: params.student.parentUid,
      assistantUid: params.student.assistantUid,
      senderUid: params.senderUid,
      senderName: params.senderName.trim().slice(0, 80),
      senderRole: params.senderRole,
      text: params.text.trim().slice(0, 2000),
      readByUids: [params.senderUid],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function markMessagesAsRead(messages: ChatMessage[], uid: string): Promise<void> {
  const unread = messages.filter((m) => !m.readByUids.includes(uid));
  if (unread.length === 0) return;

  try {
    for (let i = 0; i < unread.length; i += 400) {
      const chunk = unread.slice(i, i + 400);
      const batch = writeBatch(db);
      chunk.forEach((m) => {
        const nextReadBy = Array.from(new Set([...m.readByUids, uid])).slice(0, 3);
        batch.update(doc(db, 'messages', m.id), {
          readByUids: nextReadBy,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'messages');
  }
}

export async function createScheduleRequest(params: {
  student: StudentProfile;
  createdByUid: string;
  title: string;
  scheduledAt: string;
  note: string;
}): Promise<void> {
  const id = generateDocId('sch');
  const path = `schedules/${id}`;
  try {
    await setDoc(doc(db, 'schedules', id), {
      id,
      studentId: params.student.id,
      studentUid: params.student.studentUid,
      parentUid: params.student.parentUid,
      assistantUid: params.student.assistantUid,
      title: params.title.trim().slice(0, 140),
      scheduledAt: params.scheduledAt.trim().slice(0, 40),
      note: params.note.trim().slice(0, 1000),
      status: 'requested',
      createdByUid: params.createdByUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateScheduleStatus(
  scheduleId: string,
  status: ScheduleStatus,
): Promise<void> {
  const path = `schedules/${scheduleId}`;
  try {
    await updateDoc(doc(db, 'schedules', scheduleId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createFeedbackTicket(params: {
  student: StudentProfile;
  createdByUid: string;
  category: TicketCategory;
  subject: string;
  content: string;
}): Promise<void> {
  const id = generateDocId('tkt');
  const path = `feedback_tickets/${id}`;
  try {
    await setDoc(doc(db, 'feedback_tickets', id), {
      id,
      studentId: params.student.id,
      studentUid: params.student.studentUid,
      parentUid: params.student.parentUid,
      assistantUid: params.student.assistantUid,
      category: params.category,
      subject: params.subject.trim().slice(0, 140),
      content: params.content.trim().slice(0, 2000),
      status: 'open',
      response: '',
      respondedByUid: null,
      createdByUid: params.createdByUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function respondFeedbackTicket(params: {
  ticketId: string;
  respondedByUid: string;
  response: string;
}): Promise<void> {
  const path = `feedback_tickets/${params.ticketId}`;
  try {
    await updateDoc(doc(db, 'feedback_tickets', params.ticketId), {
      status: 'resolved',
      response: params.response.trim().slice(0, 2000),
      respondedByUid: params.respondedByUid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteAccountAndData(
  user: User,
  userPublic: UserPublic,
  students: StudentProfile[],
): Promise<void> {
  const uid = user.uid;
  const roleField = getRoleUidField(userPublic.role);
  const childCollections = [
    'assignments',
    'focus_sessions',
    'messages',
    'schedules',
    'feedback_tickets',
  ] as const;

  const soleStudentIds = new Set(
    students
      .filter((s) => {
        const members = [s.studentUid, s.parentUid, s.assistantUid].filter(Boolean);
        return members.length === 1 && members[0] === uid;
      })
      .map((s) => s.id),
  );

  // 1. Delete or unlink child collection documents
  for (const colName of childCollections) {
    try {
      const snap = await getDocs(query(collection(db, colName), where(roleField, '==', uid)));
      for (let i = 0; i < snap.docs.length; i += 400) {
        const chunk = snap.docs.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach((d) => {
          const data = d.data();
          if (soleStudentIds.has(data.studentId)) {
            batch.delete(d.ref);
          } else {
            batch.update(d.ref, {
              [roleField]: null,
              updatedAt: serverTimestamp(),
            });
          }
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, colName);
    }
  }

  // 2. Delete or leave students & student_invites
  for (const student of students) {
    try {
      const batch = writeBatch(db);
      if (soleStudentIds.has(student.id)) {
        batch.delete(doc(db, 'student_invites', student.inviteCode));
        batch.delete(doc(db, 'students', student.id));
      } else {
        batch.update(doc(db, 'students', student.id), {
          [roleField]: null,
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `students/${student.id}`);
    }
  }

  // 3. Delete user profile documents
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'users_private', uid));
    batch.delete(doc(db, 'users_public', uid));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users_public/${uid}`);
  }

  // 4. Delete Firebase Auth user (with reauth fallback if required)
  try {
    await deleteUser(user);
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code || '';
    if (code === 'auth/requires-recent-login' && auth.currentUser) {
      await reauthenticateWithPopup(auth.currentUser, googleProvider);
      await deleteUser(auth.currentUser);
    } else {
      throw error;
    }
  }
}

import { Timestamp } from 'firebase/firestore';

export type UserRole = 'student' | 'parent' | 'assistant';

export type MascotMood = 'happy' | 'trying' | 'surprised' | 'relax' | 'study' | 'creative';

export type AssignmentType = 'today' | 'extra';
export type AssignmentStatus = 'pending' | 'submitted' | 'graded';

export type ScheduleStatus = 'requested' | 'confirmed' | 'completed' | 'cancelled';

export type TicketCategory = 'feedback' | 'support' | 'management';
export type TicketStatus = 'open' | 'resolved';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface UserPublic {
  uid: string;
  displayName: string;
  role: UserRole;
  photoURL: string;
  isOnline: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface UserPrivate {
  uid: string;
  email: string;
  phone: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface StudentProfile {
  id: string;
  name: string;
  grade: string;
  inviteCode: string;
  studentUid: string | null;
  parentUid: string | null;
  assistantUid: string | null;
  createdByUid: string;
  totalFocusMinutes: number;
  streakDays: number;
  lastFocusDate: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface StudentInvite {
  code: string;
  studentId: string;
  studentName: string;
  grade: string;
  createdByUid: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Assignment {
  id: string;
  studentId: string;
  studentUid: string | null;
  parentUid: string | null;
  assistantUid: string | null;
  type: AssignmentType;
  subject: string;
  title: string;
  description: string;
  dueDate: string;
  status: AssignmentStatus;
  submissionImageDataUrl: string;
  studentNote: string;
  assistantFeedback: string;
  gradeText: string;
  createdByUid: string;
  submittedAt: Timestamp | null;
  gradedAt: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface FocusSession {
  id: string;
  studentId: string;
  studentUid: string | null;
  parentUid: string | null;
  assistantUid: string | null;
  durationMinutes: number;
  note: string;
  completedDate: string;
  createdByUid: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface ChatMessage {
  id: string;
  studentId: string;
  studentUid: string | null;
  parentUid: string | null;
  assistantUid: string | null;
  senderUid: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  readByUids: string[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Schedule {
  id: string;
  studentId: string;
  studentUid: string | null;
  parentUid: string | null;
  assistantUid: string | null;
  title: string;
  scheduledAt: string;
  note: string;
  status: ScheduleStatus;
  createdByUid: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface FeedbackTicket {
  id: string;
  studentId: string;
  studentUid: string | null;
  parentUid: string | null;
  assistantUid: string | null;
  category: TicketCategory;
  subject: string;
  content: string;
  status: TicketStatus;
  response: string;
  respondedByUid: string | null;
  createdByUid: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: 'info' | 'success' | 'warning' | 'error';
}

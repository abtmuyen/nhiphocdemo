import { Timestamp } from 'firebase/firestore';

export function getTodayDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateKey(date: Date = new Date()): string {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - 1);
  return getTodayDateKey(copy);
}

export function computeNextStreak(lastFocusDate: string, currentStreak: number): number {
  const today = getTodayDateKey();
  const yesterday = getYesterdayDateKey();
  if (lastFocusDate === today) {
    return Math.max(1, currentStreak);
  }
  if (lastFocusDate === yesterday) {
    return currentStreak + 1;
  }
  return 1;
}

export interface TreeLevelInfo {
  level: number;
  title: string;
  minMinutes: number;
  nextMinutes: number | null;
  progressPercent: number;
}

const TREE_THRESHOLDS = [
  { level: 1, title: 'Hạt mầm nhỏ', min: 0 },
  { level: 2, title: 'Chồi non xanh', min: 25 },
  { level: 3, title: 'Mầm lá đôi', min: 60 },
  { level: 4, title: 'Cây con cứng cáp', min: 120 },
  { level: 5, title: 'Nhánh lá sum suê', min: 210 },
  { level: 6, title: 'Tán cây rợp bóng', min: 330 },
  { level: 7, title: 'Cây trưởng thành', min: 480 },
  { level: 8, title: 'Cây đơm nụ hoa', min: 660 },
  { level: 9, title: 'Cây nở hoa rực rỡ', min: 900 },
  { level: 10, title: 'Đại thụ NhịpHọc', min: 1200 },
];

export function computeTreeLevel(totalMinutes: number): TreeLevelInfo {
  const mins = Math.max(0, totalMinutes);
  let idx = 0;
  for (let i = TREE_THRESHOLDS.length - 1; i >= 0; i--) {
    if (mins >= TREE_THRESHOLDS[i].min) {
      idx = i;
      break;
    }
  }
  const current = TREE_THRESHOLDS[idx];
  const next = TREE_THRESHOLDS[idx + 1] || null;

  if (!next) {
    return {
      level: current.level,
      title: current.title,
      minMinutes: current.min,
      nextMinutes: null,
      progressPercent: 100,
    };
  }

  const span = next.min - current.min;
  const gained = mins - current.min;
  return {
    level: current.level,
    title: current.title,
    minMinutes: current.min,
    nextMinutes: next.min,
    progressPercent: Math.min(100, Math.max(0, Math.round((gained / span) * 100))),
  };
}

export function formatTimestampVi(ts: Timestamp | null | undefined): string {
  if (!ts) return 'Vừa xong';
  try {
    const d = ts.toDate();
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  } catch {
    return 'Vừa xong';
  }
}

export function getNoteTiltStyle(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  }
  const tilts = ['-0.7deg', '0.5deg', '-0.4deg', '0.8deg', '0deg', '-0.6deg', '0.4deg'];
  return tilts[hash % tilts.length];
}

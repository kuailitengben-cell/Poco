import { Scene } from '../types';

export interface DateRange {
  start: Date;
  end: Date;
}

// 1. Daily Range (日間)
export function getDailyRanges(now: Date = new Date()) {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
  const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);

  return {
    provisional: { start: todayStart, end: todayEnd }, // 途中経過
    finalized: { start: yesterdayStart, end: yesterdayEnd } // 確定・公表
  };
}

// 2. Weekly Range (週間) - Sunday 00:00:00 to Saturday 23:59:59
export function getWeeklyRanges(now: Date = new Date()) {
  const day = now.getDay(); // 0 (Sun) to 6 (Sat)
  
  // This week (Sunday - Saturday)
  const thisWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day, 0, 0, 0, 0);
  const thisWeekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 6, 23, 59, 59, 999);

  // Last week
  const lastWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day - 7, 0, 0, 0, 0);
  const lastWeekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day - 1, 23, 59, 59, 999);

  return {
    provisional: { start: thisWeekStart, end: thisWeekEnd }, // 途中経過
    finalized: { start: lastWeekStart, end: lastWeekEnd } // 確定・公表
  };
}

// 3. Monthly Range (月間)
export function getMonthlyRanges(now: Date = new Date()) {
  // This month
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Last month
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  return {
    provisional: { start: thisMonthStart, end: thisMonthEnd }, // 途中経過
    finalized: { start: lastMonthStart, end: lastMonthEnd } // 確定・公表
  };
}

export function getRangesForPeriod(period: 'daily' | 'weekly' | 'monthly', now: Date = new Date()) {
  if (period === 'daily') return getDailyRanges(now);
  if (period === 'weekly') return getWeeklyRanges(now);
  return getMonthlyRanges(now);
}

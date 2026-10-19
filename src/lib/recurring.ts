import type { ISODate, RoutineItem } from '../types/hub';
import { WEEKDAY_LABELS } from '../types/hub';
import {
  addDays,
  addMonths,
  clampDateToMonth,
  daysInMonth,
  daysBetween,
  kstToday,
  weekdayLabel,
  weekdayOf,
} from './date';

export function routineNeedsSetup(routine: RoutineItem): boolean {
  if (routine.cycle === 'weekly') {
    return routine.weekday === null || routine.weekday < 0 || routine.weekday > 6;
  }
  if (routine.cycle === 'monthly') {
    return (
      routine.dayOfMonth === null ||
      !Number.isInteger(routine.dayOfMonth) ||
      routine.dayOfMonth < 1 ||
      routine.dayOfMonth > 31
    );
  }
  return false;
}

export function isOccurrenceOn(routine: RoutineItem, date: ISODate): boolean {
  if (routineNeedsSetup(routine)) return false;
  if (routine.cycle === 'daily') return true;
  if (routine.cycle === 'weekly') return weekdayOf(date) === routine.weekday;
  const [year, month] = date.split('-').map(Number);
  const day = routine.dayOfMonth as number;
  const clamped = clampDateToMonth(year, month, day);
  return clamped === date;
}

export function monthlyOccurrenceDate(routine: RoutineItem, month: string): ISODate | null {
  if (routine.cycle !== 'monthly' || routine.dayOfMonth === null) return null;
  const [year, monthNumber] = month.split('-').map(Number);
  if (!year || !monthNumber) return null;
  return clampDateToMonth(year, monthNumber, routine.dayOfMonth);
}

export function occurrenceDatesInRange(
  routine: RoutineItem,
  start: ISODate,
  end: ISODate,
): ISODate[] {
  if (routineNeedsSetup(routine)) return [];
  const span = daysBetween(start, end);
  if (span < 0) return [];

  if (routine.cycle === 'monthly') {
    const dates: ISODate[] = [];
    const startMonth = start.slice(0, 7);
    const endMonth = end.slice(0, 7);
    let cursor = startMonth;
    while (cursor <= endMonth) {
      const occurrence = monthlyOccurrenceDate(routine, cursor);
      if (occurrence && occurrence >= start && occurrence <= end) {
        dates.push(occurrence);
      }
      cursor = addMonths(cursor, 1);
    }
    return dates;
  }

  const dates: ISODate[] = [];
  for (let index = 0; index <= span; index += 1) {
    const date = addDays(start, index);
    if (isOccurrenceOn(routine, date)) dates.push(date);
  }
  return dates;
}

export function displayOccurrences(routine: RoutineItem, today = kstToday()): ISODate[] {
  if (routineNeedsSetup(routine)) return [];
  if (routine.cycle === 'daily') {
    return Array.from({ length: 7 }, (_, index) => addDays(today, index - 2));
  }
  if (routine.cycle === 'weekly') {
    return occurrenceDatesInRange(routine, addDays(today, -7), addDays(today, 21));
  }
  const thisMonth = today.slice(0, 7);
  const dates: ISODate[] = [];
  for (let offset = -1; offset <= 2; offset += 1) {
    const month = addMonths(thisMonth, offset);
    const date = monthlyOccurrenceDate(routine, month);
    if (date) dates.push(date);
  }
  return dates;
}

export function toggleOccurrence(
  routine: RoutineItem,
  date: ISODate,
  completed: boolean,
): RoutineItem {
  const completions = { ...routine.completions };
  if (completed) {
    completions[date] = true;
  } else {
    delete completions[date];
  }
  return { ...routine, completions };
}

export function describeSchedule(routine: RoutineItem): string {
  if (routineNeedsSetup(routine)) {
    if (routine.cycle === 'weekly') return '요일 설정이 필요합니다';
    if (routine.cycle === 'monthly') return '날짜 설정이 필요합니다';
    return '반복 설정이 필요합니다';
  }
  const timeText = routine.time ? ` ${routine.time}` : ' 시각 미정';
  if (routine.cycle === 'daily') return `매일${timeText}`;
  if (routine.cycle === 'weekly') {
    return `매주 ${WEEKDAY_LABELS[routine.weekday as number]}요일${timeText}`;
  }
  const day = routine.dayOfMonth as number;
  const monthEndNote = day > 28 ? ' · 없는 날은 월말로 조정' : '';
  return `매월 ${day}일${timeText}${monthEndNote}`;
}

export function todayRoutines(routines: RoutineItem[], today = kstToday()): RoutineItem[] {
  return routines.filter(
    (routine) =>
      routine.enabled &&
      routine.status === 'current' &&
      !routineNeedsSetup(routine) &&
      isOccurrenceOn(routine, today),
  );
}

export function upcomingPreview(routine: RoutineItem, today = kstToday()): string {
  if (routineNeedsSetup(routine)) return '설정이 필요합니다.';
  let cursor = today;
  for (let index = 0; index < 400; index += 1) {
    if (isOccurrenceOn(routine, cursor)) {
      if (cursor === today) return '오늘 예정';
      const diff = daysBetween(today, cursor);
      return `${diff}일 후 (${weekdayLabel(weekdayOf(cursor))}요일)`;
    }
    cursor = addDays(cursor, 1);
  }
  return '다음 회차를 계산할 수 없습니다.';
}

export function isMonthEndAdjusted(routine: RoutineItem, date: ISODate): boolean {
  if (routine.cycle !== 'monthly' || routine.dayOfMonth === null) return false;
  const [year, month] = date.split('-').map(Number);
  return routine.dayOfMonth > daysInMonth(year, month);
}

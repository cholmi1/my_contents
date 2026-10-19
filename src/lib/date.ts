import type { ISODate } from '../types/hub';
import { WEEKDAY_LABELS } from '../types/hub';

const KST = 'Asia/Seoul';

export function kstToday(now = new Date()): ISODate {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: KST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(year, month);
}

export function parseISODate(value: ISODate): Date {
  return new Date(`${value}T12:00:00+09:00`);
}

export function formatKoreanDate(value: ISODate, withWeekday = true): string {
  if (!isISODate(value)) return value;
  const date = parseISODate(value);
  const text = new Intl.DateTimeFormat('ko-KR', {
    timeZone: KST,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
  if (!withWeekday) return text;
  const weekday = new Intl.DateTimeFormat('ko-KR', {
    timeZone: KST,
    weekday: 'long',
  }).format(date);
  return `${text} (${weekday})`;
}

export function weekdayOf(value: ISODate): number {
  return parseISODate(value).getUTCDay();
}

export function weekdayLabel(value: number): string {
  return WEEKDAY_LABELS[value] ?? '';
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthKey(value: ISODate): string {
  return value.slice(0, 7);
}

export function currentMonthKey(now = new Date()): string {
  return kstToday(now).slice(0, 7);
}

export function addDays(value: ISODate, days: number): ISODate {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function addMonths(month: string, months: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + months, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function daysBetween(from: ISODate, to: ISODate): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function clampDateToMonth(year: number, month: number, day: number): ISODate {
  const safeDay = Math.min(day, daysInMonth(year, month));
  return `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
}

export function formatDateTime(value: string | null): string {
  if (!value) return '없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: KST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatMonthLabel(month: string): string {
  if (!/^\d{4}-\d{2}$/.test(month)) return month;
  const [year, monthNumber] = month.split('-').map(Number);
  return `${year}년 ${monthNumber}월`;
}

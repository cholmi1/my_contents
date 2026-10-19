import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  clampDateToMonth,
  formatKoreanDate,
  isISODate,
  kstToday,
  monthKey,
} from './date';

describe('한국 시간 날짜 유틸', () => {
  it('UTC 저녁을 한국 시간 다음 날짜로 계산한다', () => {
    expect(kstToday(new Date('2026-10-18T16:00:00Z'))).toBe('2026-10-19');
    expect(kstToday(new Date('2026-10-18T14:59:59Z'))).toBe('2026-10-18');
  });

  it('유효한 날짜만 허용한다', () => {
    expect(isISODate('2026-10-19')).toBe(true);
    expect(isISODate('2024-02-29')).toBe(true);
    expect(isISODate('2026-02-29')).toBe(false);
    expect(isISODate('2026-13-01')).toBe(false);
    expect(isISODate('2026-1-1')).toBe(false);
  });

  it('날짜 더하기와 월 이동을 처리한다', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });

  it('월말 없는 날짜를 마지막 날로 조정한다', () => {
    expect(clampDateToMonth(2026, 2, 31)).toBe('2026-02-28');
    expect(clampDateToMonth(2024, 2, 31)).toBe('2024-02-29');
    expect(clampDateToMonth(2026, 4, 31)).toBe('2026-04-30');
  });

  it('한국어 날짜와 월 키를 만든다', () => {
    expect(formatKoreanDate('2026-10-19')).toContain('2026년 10월 19일');
    expect(formatKoreanDate('2026-10-19')).toContain('월요일');
    expect(monthKey('2026-10-19')).toBe('2026-10');
  });
});

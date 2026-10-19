import { describe, expect, it } from 'vitest';
import type { RoutineItem } from '../types/hub';
import {
  describeSchedule,
  displayOccurrences,
  isMonthEndAdjusted,
  isOccurrenceOn,
  monthlyOccurrenceDate,
  occurrenceDatesInRange,
  routineNeedsSetup,
  todayRoutines,
  toggleOccurrence,
} from './recurring';

function routine(overrides: Partial<RoutineItem> = {}): RoutineItem {
  return {
    id: 'routine-1',
    title: '테스트 루틴',
    cycle: 'daily',
    weekday: null,
    dayOfMonth: null,
    time: null,
    status: 'current',
    enabled: true,
    completions: {},
    note: '',
    createdAt: '2026-10-01T00:00:00.000Z',
    isDemo: false,
    ...overrides,
  };
}

describe('반복 업무 회차 계산', () => {
  it('매일 항목은 모든 날짜가 회차다', () => {
    const item = routine();
    expect(isOccurrenceOn(item, '2026-10-19')).toBe(true);
    expect(occurrenceDatesInRange(item, '2026-10-19', '2026-10-21')).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
    ]);
  });

  it('요일이 없는 매주 항목은 설정 필요이며 회차를 만들지 않는다', () => {
    const item = routine({ cycle: 'weekly', weekday: null });
    expect(routineNeedsSetup(item)).toBe(true);
    expect(isOccurrenceOn(item, '2026-10-19')).toBe(false);
    expect(occurrenceDatesInRange(item, '2026-10-01', '2026-10-31')).toEqual([]);
    expect(describeSchedule(item)).toContain('설정');
  });

  it('매주 항목은 선택한 요일에만 회차가 생긴다', () => {
    const item = routine({ cycle: 'weekly', weekday: 1, time: '09:00' });
    expect(isOccurrenceOn(item, '2026-10-19')).toBe(true);
    expect(isOccurrenceOn(item, '2026-10-20')).toBe(false);
    expect(occurrenceDatesInRange(item, '2026-10-18', '2026-10-25')).toEqual(['2026-10-19']);
    expect(describeSchedule(item)).toBe('매주 월요일 09:00');
  });

  it('매월 31일은 없는 달에 월말로 조정된다', () => {
    const item = routine({ cycle: 'monthly', dayOfMonth: 31 });
    expect(monthlyOccurrenceDate(item, '2026-02')).toBe('2026-02-28');
    expect(monthlyOccurrenceDate(item, '2024-02')).toBe('2024-02-29');
    expect(monthlyOccurrenceDate(item, '2026-04')).toBe('2026-04-30');
    expect(isOccurrenceOn(item, '2026-02-28')).toBe(true);
    expect(isOccurrenceOn(item, '2026-02-27')).toBe(false);
    expect(isMonthEndAdjusted(item, '2026-02-28')).toBe(true);
  });

  it('완료는 해당 회차에만 적용되고 다음 회차로 이어지지 않는다', () => {
    let item = routine({ cycle: 'daily' });
    item = toggleOccurrence(item, '2026-10-19', true);
    expect(item.completions).toEqual({ '2026-10-19': true });
    expect(item.completions['2026-10-20']).toBeUndefined();

    item = toggleOccurrence(item, '2026-10-20', true);
    expect(item.completions['2026-10-19']).toBe(true);
    expect(item.completions['2026-10-20']).toBe(true);

    item = toggleOccurrence(item, '2026-10-19', false);
    expect(item.completions['2026-10-19']).toBeUndefined();
    expect(item.completions['2026-10-20']).toBe(true);
  });

  it('완료 기록을 삭제해도 원본 항목을 변형하지 않는다', () => {
    const original = routine();
    const changed = toggleOccurrence(original, '2026-10-19', true);
    expect(original.completions).toEqual({});
    expect(changed).not.toBe(original);
  });

  it('오늘 실천 중이며 활성인 항목만 사이트 알림 대상이 된다', () => {
    const items = [
      routine({ id: 'a' }),
      routine({ id: 'b', enabled: false }),
      routine({ id: 'c', status: 'upcoming' }),
      routine({ id: 'd', cycle: 'weekly', weekday: null }),
      routine({ id: 'e', cycle: 'weekly', weekday: 1 }),
    ];
    const result = todayRoutines(items, '2026-10-19');
    expect(result.map((item) => item.id)).toEqual(['a', 'e']);
  });

  it('일별 표시 회차에 오늘과 미래 회차가 포함된다', () => {
    const dates = displayOccurrences(routine(), '2026-10-19');
    expect(dates).toContain('2026-10-19');
    expect(dates).toHaveLength(7);
  });
});

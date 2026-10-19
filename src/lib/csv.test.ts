import { describe, expect, it } from 'vitest';
import {
  autoMapCsv,
  isSafeHttpUrl,
  looksCompanyRelated,
  normalizeDateText,
  normalizeNameForCompare,
  normalizeUrlForCompare,
  parseCsv,
  parseIntegerText,
  splitTags,
} from './csv';
import { APP_CSV_FIELDS } from './csvImport';

describe('CSV 파서', () => {
  it('따옴표 안의 쉼표와 줄바꿈을 처리한다', () => {
    const result = parseCsv('이름,메모\r\n"가상 앱","첫 줄, 둘째 줄\n다음 줄"\r\n');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.csv.headers).toEqual(['이름', '메모']);
    expect(result.csv.rows[0]).toEqual(['가상 앱', '첫 줄, 둘째 줄\n다음 줄']);
  });

  it('이중 따옴표를 이스케이프로 처리한다', () => {
    const result = parseCsv('name,note\n"a","그는 ""안녕""이라고 말했다"\n');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.csv.rows[0][1]).toBe('그는 "안녕"이라고 말했다');
  });

  it('BOM과 빈 줄을 처리한다', () => {
    const result = parseCsv('\uFEFF제목,주소\n\n가상 앱,https://example.com\n\n');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.csv.headers).toEqual(['제목', '주소']);
    expect(result.csv.rows).toHaveLength(1);
  });

  it('닫히지 않은 따옴표는 오류로 처리한다', () => {
    const result = parseCsv('name,note\n"닫히지 않음,https://example.com\n');
    expect(result.ok).toBe(false);
  });

  it('빈 파일과 헤더만 있는 파일을 구분한다', () => {
    expect(parseCsv('').ok).toBe(false);
    const headerOnly = parseCsv('이름,주소\n');
    expect(headerOnly.ok).toBe(true);
    if (headerOnly.ok) expect(headerOnly.csv.rows).toHaveLength(0);
  });
});

describe('CSV 가져오기 보조 함수', () => {
  it('한국어와 영어 열 이름을 자동 매핑한다', () => {
    const mapping = autoMapCsv(
      ['제목', '주소', '구분', '상태', '월 비용', '최근 수정일'],
      APP_CSV_FIELDS,
    );
    expect(mapping.name).toBe(0);
    expect(mapping.url).toBe(1);
    expect(mapping.category).toBe(2);
    expect(mapping.status).toBe(3);
    expect(mapping.monthlyCost).toBe(4);
    expect(mapping.lastModified).toBe(5);
    expect(mapping.editUrl).toBeNull();
  });

  it('http와 https만 허용한다', () => {
    expect(isSafeHttpUrl('https://example.com')).toBe(true);
    expect(isSafeHttpUrl('http://example.com/path?q=1')).toBe(true);
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('data:text/html,hello')).toBe(false);
    expect(isSafeHttpUrl('file:///c:/secret.txt')).toBe(false);
    expect(isSafeHttpUrl('example.com')).toBe(false);
    expect(isSafeHttpUrl('')).toBe(false);
  });

  it('중복 비교용 URL과 이름을 정규화한다', () => {
    expect(normalizeUrlForCompare('https://Example.com/path/#hash')).toBe('example.com/path');
    expect(normalizeUrlForCompare('https://example.com/path')).toBe('example.com/path');
    expect(normalizeNameForCompare('  생활  위키 ')).toBe('생활위키');
  });

  it('날짜와 정수 문자열을 검증한다', () => {
    expect(normalizeDateText('2026.10.09')).toBe('2026-10-09');
    expect(normalizeDateText('2026/2/29')).toBeNull();
    expect(normalizeDateText('2024/2/29')).toBe('2024-02-29');
    expect(parseIntegerText('1,250,000원')).toBe(1250000);
    expect(parseIntegerText('-3000')).toBe(-3000);
    expect(parseIntegerText('12.5')).toBeNull();
    expect(parseIntegerText('abc')).toBeNull();
    expect(parseIntegerText('')).toBeNull();
  });

  it('태그를 나누고 회사 관련 후보를 감지한다', () => {
    expect(splitTags('독서, 기록 | 생활')).toEqual(['독서', '기록', '생활']);
    expect(looksCompanyRelated(['회사 업무 게시판'])).toBe(true);
    expect(looksCompanyRelated(['업무용 도구'])).toBe(true);
    expect(looksCompanyRelated(['https://example.com/company-board'])).toBe(true);
    expect(looksCompanyRelated(['가상 운동 기록'])).toBe(false);
    expect(looksCompanyRelated(['가상 독서 앱'])).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import type { AppItem, SnsItem } from '../types/hub';
import type { CsvMapping } from './csv';
import { buildAppPreviews, buildSnsPreviews } from './csvImport';

function app(overrides: Partial<AppItem> = {}): AppItem {
  return {
    id: 'app-1',
    name: '생활 위키',
    purpose: '',
    service: '',
    url: 'https://example.com/life-wiki',
    editUrl: '',
    category: 'external',
    status: 'active',
    monthlyCost: null,
    renewalDay: null,
    lastModified: null,
    note: '',
    tags: [],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    isDemo: true,
    ...overrides,
  };
}

const mapping: CsvMapping = {
  name: 0,
  url: 1,
  category: 2,
  note: 3,
  tags: 4,
  monthlyCost: 5,
  status: 6,
};

describe('앱 CSV 미리보기', () => {
  const rows = [
    ['가상 독서 기록', 'https://example.com/reading', '내가 만든 앱', '정상 행', '독서;기록', '0', '사용 중'],
    ['생활 위키', 'https://example.com/life-wiki', '외부 도구', '중복 행', '', '11000', '사용 중'],
    ['회사 업무 게시판', 'https://example.com/company-board', '회사', '회사 행', '업무', '0', '사용 중'],
    ['잘못된 주소', 'javascript:alert(1)', '확인 필요', '오류 행', '', '0', '사용 중'],
    ['비용 오류', 'https://example.com/cost', '확인 필요', '오류 행', '', '12.5', '사용 중'],
  ];

  it('유효 행만 기본 선택하고 중복·회사·오류 행은 제외한다', () => {
    const preview = buildAppPreviews(rows, mapping, [app()]);
    expect(preview[0].defaultSelected).toBe(true);
    expect(preview[0].draft?.name).toBe('가상 독서 기록');
    expect(preview[0].draft?.tags).toEqual(['독서', '기록']);

    expect(preview[1].duplicate).toBe(true);
    expect(preview[1].duplicateOf).toBe('생활 위키');
    expect(preview[1].defaultSelected).toBe(false);

    expect(preview[2].company).toBe(true);
    expect(preview[2].defaultSelected).toBe(false);

    expect(preview[3].errors.join(' ')).toContain('http');
    expect(preview[3].defaultSelected).toBe(false);

    expect(preview[4].errors.join(' ')).toContain('정수');
    expect(preview[4].defaultSelected).toBe(false);
  });

  it('구분이 비어 있으면 확인 필요로 두고 경고를 남긴다', () => {
    const preview = buildAppPreviews(
      [['새 앱', '', '', '', '', '', '']],
      { name: 0, url: 1, category: 2, note: 3, tags: 4, monthlyCost: 5, status: 6 },
      [],
    );
    expect(preview[0].draft?.category).toBe('review');
    expect(preview[0].defaultSelected).toBe(true);
    expect(preview[0].warnings.join(' ')).toContain('상태');
  });

  it('필수 이름 열이 매핑되지 않으면 오류를 표시한다', () => {
    const preview = buildAppPreviews([['앱', 'https://example.com']], { name: null }, []);
    expect(preview[0].errors.join(' ')).toContain('이름');
    expect(preview[0].draft).toBeNull();
  });
});

function sns(overrides: Partial<SnsItem> = {}): SnsItem {
  return {
    id: 'sns-1',
    platform: '블로그',
    channelName: '독서 노트',
    url: 'https://example.com/blog/reading',
    status: 'paused',
    lastPosted: null,
    note: '',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    isDemo: true,
    ...overrides,
  };
}

describe('SNS CSV 미리보기', () => {
  it('중복 후보와 회사 관련 후보를 기본 제외한다', () => {
    const preview = buildSnsPreviews(
      [
        ['Instagram', '가상 생활 기록', 'https://example.com/instagram/life-log', '운영 중', '', '정상'],
        ['블로그', '독서 노트', 'https://example.com/blog/reading', '휴식 중', '', '중복'],
        ['회사 홍보', '가상 회사 계정', 'https://example.com/company-sns', '운영 중', '', '회사'],
      ],
      { platform: 0, channelName: 1, url: 2, status: 3, lastPosted: 4, note: 5 },
      [sns()],
    );
    expect(preview[0].defaultSelected).toBe(true);
    expect(preview[1].duplicate).toBe(true);
    expect(preview[1].defaultSelected).toBe(false);
    expect(preview[2].company).toBe(true);
    expect(preview[2].defaultSelected).toBe(false);
  });
});

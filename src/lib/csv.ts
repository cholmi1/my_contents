export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

export type CsvParseResult =
  | { ok: true; csv: ParsedCsv }
  | { ok: false; error: string };

export function parseCsv(text: string): CsvParseResult {
  const source = text.replace(/^\uFEFF/, '');
  if (source.trim() === '') {
    return { ok: false, error: 'CSV 파일이 비어 있습니다.' };
  }
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let index = 0;

  while (index < source.length) {
    const char = source[index];
    if (inQuotes) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 2;
          continue;
        }
        inQuotes = false;
        index += 1;
        continue;
      }
      field += char;
      index += 1;
      continue;
    }
    if (char === '"') {
      if (field === '') {
        inQuotes = true;
        index += 1;
        continue;
      }
      field += char;
      index += 1;
      continue;
    }
    if (char === ',') {
      row.push(field);
      field = '';
      index += 1;
      continue;
    }
    if (char === '\r' || char === '\n') {
      row.push(field);
      field = '';
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
      if (char === '\r' && source[index + 1] === '\n') index += 2;
      else index += 1;
      continue;
    }
    field += char;
    index += 1;
  }

  if (inQuotes) {
    return { ok: false, error: '따옴표가 닫히지 않았습니다. CSV 형식을 확인하세요.' };
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  if (rows.length === 0) {
    return { ok: false, error: 'CSV에 읽을 수 있는 행이 없습니다.' };
  }
  const rawHeaders = rows[0];
  const headers = rawHeaders.map((header, index) => {
    const trimmed = header.trim();
    return trimmed === '' ? `열 ${index + 1}` : trimmed;
  });
  return {
    ok: true,
    csv: {
      headers,
      rows: rows.slice(1).map((cells) => {
        const normalized = [...cells];
        while (normalized.length < headers.length) normalized.push('');
        return normalized;
      }),
    },
  };
}

export interface CsvFieldDefinition {
  key: string;
  label: string;
  aliases: string[];
  required?: boolean;
}

export type CsvMapping = Record<string, number | null>;

function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s_\-()[\]{}]/g, '')
    .replace(/[·:]/g, '');
}

export function autoMapCsv(headers: string[], fields: CsvFieldDefinition[]): CsvMapping {
  const used = new Set<number>();
  const mapping: CsvMapping = {};
  const normalizedHeaders = headers.map(normalizeHeader);

  fields.forEach((field) => {
    const aliases = [field.key, field.label, ...field.aliases].map(normalizeHeader);
    let found: number | null = null;
    for (let index = 0; index < normalizedHeaders.length; index += 1) {
      if (used.has(index)) continue;
      if (aliases.includes(normalizedHeaders[index])) {
        found = index;
        break;
      }
    }
    if (found === null) {
      for (let index = 0; index < normalizedHeaders.length; index += 1) {
        if (used.has(index)) continue;
        if (aliases.some((alias) => alias.length >= 2 && normalizedHeaders[index].includes(alias))) {
          found = index;
          break;
        }
      }
    }
    if (found !== null) used.add(found);
    mapping[field.key] = found;
  });

  return mapping;
}

export function cellValue(row: string[], mapping: CsvMapping, key: string): string {
  const index = mapping[key];
  if (index === undefined || index === null || index < 0) return '';
  return (row[index] ?? '').trim();
}

export function isSafeHttpUrl(value: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function normalizeUrlForCompare(value: string): string {
  if (!value) return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    const path = url.pathname.replace(/\/+$/, '');
    return `${url.hostname.toLowerCase()}${path}`.toLowerCase();
  } catch {
    return '';
  }
}

export function normalizeNameForCompare(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

export function splitTags(value: string): string[] {
  return value
    .split(/[,;|]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function normalizeDateText(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const normalized = trimmed.replace(/[./]/g, '-');
  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  const candidate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const date = new Date(`${candidate}T12:00:00+09:00`);
  if (Number.isNaN(date.getTime())) return null;
  const check = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  return check === candidate ? candidate : null;
}

export function parseIntegerText(value: string): number | null {
  const cleaned = value.replace(/[\s,원]/g, '');
  if (cleaned === '') return null;
  if (!/^-?\d+$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function looksCompanyRelated(values: string[]): boolean {
  const text = values.join(' ').toLowerCase();
  if (/(회사|업무|직장)/.test(text)) return true;
  return /(^|[^\w])(corp|company|corporate)([^\w]|$)/.test(text);
}

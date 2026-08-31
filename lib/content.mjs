import crypto from 'node:crypto';

const MAX_SENTENCE = 500;
const MAX_FIELD = 300;
const MAX_NOTE = 2000;

export function normalizeText(value, field = '값') {
  if (typeof value !== 'string') throw new Error(`${field}은 문자열이어야 합니다.`);
  const normalized = value.normalize('NFC').replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF\u202A-\u202E]/g, '').replace(/\s+/g, ' ').trim();
  if (!normalized) throw new Error(`${field}을 입력해 주세요.`);
  return normalized;
}

function optionalText(value, field, max = MAX_FIELD) {
  if (value === undefined || value === null || value === '') return '';
  const normalized = normalizeText(value, field);
  if (normalized.length > max) throw new Error(`${field}은 ${max}자 이하여야 합니다.`);
  return normalized;
}

function requiredText(value, field, max = MAX_FIELD) {
  const normalized = normalizeText(value, field);
  if (normalized.length > max) throw new Error(`${field}은 ${max}자 이하여야 합니다.`);
  return normalized;
}

function id(prefix) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function normalizeWord(word, existing = {}) {
  if (!word || typeof word !== 'object' || Array.isArray(word)) throw new Error('단어 항목 형식이 올바르지 않습니다.');
  return {
    id: existing.id || word.id || id('word'),
    japanese: requiredText(word.japanese, '단어 일본어'),
    meaning: requiredText(word.meaning, '단어 뜻'),
    reading: optionalText(word.reading, '단어 읽기'),
    note: optionalText(word.note, '단어 메모', MAX_NOTE)
  };
}

export function normalizeSentence(sentence, existing = {}) {
  if (!sentence || typeof sentence !== 'object' || Array.isArray(sentence)) throw new Error('문장 항목 형식이 올바르지 않습니다.');
  const words = sentence.words === undefined ? [] : sentence.words;
  if (!Array.isArray(words)) throw new Error('words는 배열이어야 합니다.');
  if (words.length > 40) throw new Error('문장 하나에는 최대 40개 단어만 등록할 수 있습니다.');
  const now = new Date().toISOString();
  const normalizedWords = words.map((word, index) => normalizeWord(word, existing.words?.[index] || {}));
  const seenWords = new Set();
  for (const word of normalizedWords) {
    const key = canonicalWordKey(word);
    if (seenWords.has(key)) throw new Error(`같은 단어가 중복되었습니다: ${word.japanese}`);
    seenWords.add(key);
  }
  return {
    id: existing.id || sentence.id || id('sent'),
    japanese: requiredText(sentence.japanese, '일본어 문장', MAX_SENTENCE),
    meaning: requiredText(sentence.meaning, '문장 뜻', MAX_SENTENCE),
    reading: optionalText(sentence.reading, '히라가나 읽기', MAX_SENTENCE),
    note: optionalText(sentence.note, '문장 메모', MAX_NOTE),
    words: normalizedWords,
    createdAt: existing.createdAt || sentence.createdAt || now,
    updatedAt: now
  };
}

export function canonicalSentenceKey(sentence) {
  return `${normalizeText(sentence.japanese, '일본어 문장').toLocaleLowerCase('ja-JP')}\u0000${normalizeText(sentence.meaning, '문장 뜻').toLocaleLowerCase('ko-KR')}`;
}

export function canonicalWordKey(word) {
  return `${normalizeText(word.japanese, '단어 일본어').toLocaleLowerCase('ja-JP')}\u0000${normalizeText(word.meaning, '단어 뜻').toLocaleLowerCase('ko-KR')}`;
}

export function parseImportDocument(document) {
  const rawSentences = Array.isArray(document) ? document : document?.sentences;
  if (!Array.isArray(rawSentences) || rawSentences.length === 0) throw new Error('sentences 배열에 적어도 하나의 문장이 필요합니다.');
  if (rawSentences.length > 200) throw new Error('한 번에 최대 200개 문장만 가져올 수 있습니다.');
  return rawSentences.map((sentence) => normalizeSentence(sentence));
}

export function mergeSentences(existingData, incoming) {
  const existing = existingData.sentences || [];
  const keys = new Set(existing.map(canonicalSentenceKey));
  const additions = [];
  const duplicates = [];
  for (const sentence of incoming) {
    const key = canonicalSentenceKey(sentence);
    if (keys.has(key)) {
      duplicates.push(sentence);
      continue;
    }
    keys.add(key);
    additions.push(sentence);
  }
  return {
    data: { schemaVersion: 1, updatedAt: new Date().toISOString(), sentences: [...existing, ...additions] },
    additions,
    duplicates
  };
}

export function validateDataset(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.sentences)) throw new Error('학습 데이터 형식이 올바르지 않습니다.');
  const keys = new Set();
  const ids = new Set();
  data.sentences.forEach((sentence) => {
    const normalized = normalizeSentence(sentence, sentence);
    if (ids.has(normalized.id)) throw new Error(`중복 문장 ID: ${normalized.id}`);
    const key = canonicalSentenceKey(normalized);
    if (keys.has(key)) throw new Error(`중복 문장: ${normalized.japanese}`);
    ids.add(normalized.id);
    keys.add(key);
  });
  return true;
}

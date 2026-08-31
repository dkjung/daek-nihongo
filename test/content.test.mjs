import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeSentences, normalizeSentence, parseImportDocument, validateDataset } from '../lib/content.mjs';

const sample = { japanese: '台風の影響で、配送が遅れました。', meaning: '태풍의 영향으로 배송이 늦어졌습니다.', reading: 'たいふうのえいきょうで、はいそうがおくれました。', words: [{ japanese: '配送', meaning: '배송', reading: 'はいそう' }] };

test('imports a valid sentence and word', () => {
  const [sentence] = parseImportDocument({ sentences: [sample] });
  assert.equal(sentence.japanese, sample.japanese);
  assert.equal(sentence.words[0].japanese, '配送');
});

test('merges new sentences and skips canonical duplicates', () => {
  const [sentence] = parseImportDocument({ sentences: [sample] });
  const merged = mergeSentences({ sentences: [sentence] }, [sentence]);
  assert.equal(merged.additions.length, 0);
  assert.equal(merged.duplicates.length, 1);
});

test('rejects duplicate sentences in a dataset', () => {
  const [sentence] = parseImportDocument({ sentences: [sample] });
  assert.throws(() => validateDataset({ sentences: [sentence, { ...sentence, id: 'another-id' }] }), /중복 문장/);
});

test('rejects a caller-supplied sentence ID collision during import', () => {
  const [existing] = parseImportDocument({ sentences: [{ ...sample, id: 'sent-existing' }] });
  const [incoming] = parseImportDocument({ sentences: [{ ...sample, japanese: '今日は早く寝ます。', meaning: '오늘은 일찍 잘게요.', id: 'sent-existing' }] });
  assert.throws(() => mergeSentences({ sentences: [existing] }, [incoming]), /중복 문장 ID/);
});

test('keeps a matching word ID when words are reordered', () => {
  const [existing] = parseImportDocument({ sentences: [{ ...sample, id: 'sent-sample', words: [{ id: 'word-delivery', japanese: '配送', meaning: '배송', reading: 'はいそう' }, { id: 'word-typhoon', japanese: '台風', meaning: '태풍', reading: 'たいふう' }] }] });
  const updated = { ...existing, words: [{ japanese: '台風', meaning: '태풍', reading: 'たいふう' }, { japanese: '配送', meaning: '배송', reading: 'はいそう' }] };
  const normalized = normalizeSentence(updated, existing);
  assert.deepEqual(normalized.words.map((word) => word.id), ['word-typhoon', 'word-delivery']);
});

test('CLI validates an empty published dataset', () => {
  const directory = path.dirname(fileURLToPath(import.meta.url));
  const fixture = path.join(directory, 'fixtures', 'empty-dataset.json');
  const output = execFileSync(process.execPath, ['bin/nihongo.mjs', 'validate', fixture], { cwd: path.join(directory, '..'), encoding: 'utf8' });
  assert.match(output, /검증 완료: 문장 0개/);
});

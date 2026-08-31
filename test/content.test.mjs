import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeSentences, parseImportDocument, validateDataset } from '../lib/content.mjs';

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

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQuizQueue } from '../lib/quiz.mjs';

test('returns no quiz questions for an empty library', () => {
  assert.deepEqual(buildQuizQueue({ sentences: [] }), []);
});

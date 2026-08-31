#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import YAML from 'yaml';
import { mergeSentences, normalizeSentence, parseImportDocument, validateDataset } from '../lib/content.mjs';

const args = process.argv.slice(2);
const [command, ...rest] = args;

function usage() {
  console.log(`사용법:
  nihongo validate <파일>
  nihongo import <파일> [--dry-run] [--no-push]
  nihongo update <문장-id> <파일> [--no-push]
  nihongo delete <문장-id> [--no-push]
  nihongo list [--query <검색어>]
  nihongo export <파일>`);
}

function repoRoot() {
  try { return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim(); }
  catch { throw new Error('Git 저장소 안에서 실행해 주세요.'); }
}

async function readJson(file) { return JSON.parse(await fs.readFile(file, 'utf8')); }
async function writeJson(file, data) { await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8'); }
async function readInput(file) {
  const source = await fs.readFile(file, 'utf8');
  return path.extname(file).toLowerCase() === '.json' ? JSON.parse(source) : YAML.parse(source);
}
function git(root, args) { execFileSync('git', args, { cwd: root, stdio: 'inherit' }); }
function commitAndPush(root, message, noPush) {
  git(root, ['add', 'data/lessons.json']);
  git(root, ['diff', '--cached', '--check']);
  git(root, ['commit', '-m', message]);
  if (!noPush) git(root, ['push']);
}
function dataFile(root) { return path.join(root, 'data', 'lessons.json'); }
function requireValue(value, label) { if (!value || value.startsWith('--')) throw new Error(`${label}을 입력해 주세요.`); return value; }

try {
  if (!command || command === 'help' || command === '--help') { usage(); process.exit(0); }
  const root = repoRoot();
  const target = dataFile(root);

  if (command === 'validate') {
    const file = requireValue(rest[0], '파일');
    const document = await readInput(file);
    if (document?.schemaVersion) validateDataset(document);
    else parseImportDocument(document);
    console.log(`검증 완료: 문장 ${document.sentences?.length || 0}개`);
  } else if (command === 'import') {
    const file = requireValue(rest[0], '파일');
    const dryRun = rest.includes('--dry-run');
    const noPush = rest.includes('--no-push');
    const incoming = parseImportDocument(await readInput(file));
    if (!dryRun) git(root, ['pull', '--rebase']);
    const merged = mergeSentences(await readJson(target), incoming);
    console.log(`새 문장 ${merged.additions.length}개, 중복 건너뜀 ${merged.duplicates.length}개`);
    if (dryRun) process.exit(0);
    if (!merged.additions.length) process.exit(0);
    await writeJson(target, merged.data);
    commitAndPush(root, `data: import ${merged.additions.length} Japanese study entries`, noPush);
  } else if (command === 'update') {
    const [id, file] = rest;
    requireValue(id, '문장 ID'); requireValue(file, '파일');
    const noPush = rest.includes('--no-push');
    git(root, ['pull', '--rebase']);
    const data = await readJson(target);
    const index = data.sentences.findIndex((sentence) => sentence.id === id);
    if (index === -1) throw new Error(`문장을 찾을 수 없습니다: ${id}`);
    const source = await readInput(file);
    const sentence = Array.isArray(source?.sentences) ? source.sentences[0] : source;
    data.sentences[index] = normalizeSentence(sentence, data.sentences[index]);
    data.updatedAt = new Date().toISOString();
    validateDataset(data);
    await writeJson(target, data);
    commitAndPush(root, `data: update ${id}`, noPush);
  } else if (command === 'delete') {
    const id = requireValue(rest[0], '문장 ID');
    const noPush = rest.includes('--no-push');
    git(root, ['pull', '--rebase']);
    const data = await readJson(target);
    const kept = data.sentences.filter((sentence) => sentence.id !== id);
    if (kept.length === data.sentences.length) throw new Error(`문장을 찾을 수 없습니다: ${id}`);
    data.sentences = kept; data.updatedAt = new Date().toISOString();
    await writeJson(target, data);
    commitAndPush(root, `data: remove ${id}`, noPush);
  } else if (command === 'list') {
    const queryIndex = rest.indexOf('--query');
    const query = queryIndex === -1 ? '' : (rest[queryIndex + 1] || '').toLocaleLowerCase();
    const data = await readJson(target);
    data.sentences.filter((sentence) => !query || JSON.stringify(sentence).toLocaleLowerCase().includes(query)).forEach((sentence) => console.log(`${sentence.id}\t${sentence.japanese}\t${sentence.meaning}`));
  } else if (command === 'export') {
    const file = requireValue(rest[0], '파일');
    const data = await readJson(target);
    await writeJson(file, data);
    console.log(`내보내기 완료: ${file}`);
  } else {
    usage(); process.exitCode = 1;
  }
} catch (error) {
  console.error(`오류: ${error.message}`);
  process.exitCode = 1;
}

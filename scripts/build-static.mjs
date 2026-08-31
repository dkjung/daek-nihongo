import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const output = path.join(root, 'dist');

await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(path.join(output, 'data'), { recursive: true });
await fs.mkdir(path.join(output, 'lib'), { recursive: true });
await Promise.all([
  fs.copyFile(path.join(root, 'index.html'), path.join(output, 'index.html')),
  fs.copyFile(path.join(root, 'styles.css'), path.join(output, 'styles.css')),
  fs.copyFile(path.join(root, 'app.js'), path.join(output, 'app.js')),
  fs.copyFile(path.join(root, 'data', 'lessons.json'), path.join(output, 'data', 'lessons.json')),
  fs.copyFile(path.join(root, 'lib', 'quiz.mjs'), path.join(output, 'lib', 'quiz.mjs'))
]);

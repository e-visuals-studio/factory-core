import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const cli = new URL('../src/cli/check-todo.ts', import.meta.url).pathname;
const run = (cwd: string, ...args: string[]) => spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8' });

async function site(files: Record<string, string>) {
  const dir = await mkdtemp(join(tmpdir(), 'check-todo-'));
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(dir, path, '..'), { recursive: true });
    await writeFile(join(dir, path), content);
  }
  return dir;
}

describe('factory-check-todo', () => {
  it('uspe brez TODO', async () => {
    const dir = await site({ 'dist/index.html': '<p>Pozdravljeni</p>', 'dist/robots.txt': 'User-agent: *\nAllow: /\n' });
    assert.equal(run(dir).status, 0);
  });

  it('pade na TODO v HTML in na nadomestni domeni', async () => {
    const dir = await site({
      'dist/index.html': '<p>TODO: telefon</p>',
      'dist/sitemap-0.xml': '<loc>https://todo-domena.invalid/</loc>',
    });
    const result = run(dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /index\.html:1/);
    assert.match(result.stderr, /sitemap-0\.xml:1/);
  });

  it('pade na TODO v dodatnih datotekah (brief.yaml)', async () => {
    const dir = await site({ 'dist/index.html': '<p>ok</p>', 'brief.yaml': 'kontakt:\n  telefon: TODO\n' });
    const result = run(dir, 'dist', 'brief.yaml');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /brief\.yaml:2/);
  });

  it('preview build (robots Disallow: /) preskoči', async () => {
    const dir = await site({ 'dist/index.html': '<p>TODO</p>', 'dist/robots.txt': 'User-agent: *\nDisallow: /\n' });
    const result = run(dir, 'dist', 'brief.yaml');
    assert.equal(result.status, 0);
    assert.match(result.stdout, /preview/);
  });

  it('ne zamenja besed, ki samo vsebujejo "todo"', async () => {
    const dir = await site({ 'dist/index.html': '<p>TODOS methodology, todo-list</p>' });
    assert.equal(run(dir).status, 0);
  });
});

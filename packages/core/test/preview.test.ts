import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { detectSiteEnv } from '../src/preview.ts';

describe('detectSiteEnv', () => {
  const env = (vars: Record<string, string>) => detectSiteEnv(vars).env;

  it('brez spremenljivk je produkcija', () => assert.equal(env({}), 'production'));
  it('GitHub Actions: main je produkcija, vse ostalo preview', () => {
    assert.equal(env({ GITHUB_REF_NAME: 'main' }), 'production');
    assert.equal(env({ GITHUB_REF_NAME: 'faza-3' }), 'preview');
    assert.equal(env({ GITHUB_REF_NAME: '12/merge' }), 'preview');
  });
  it('Cloudflare Pages kot dodatna možnost', () => {
    assert.equal(env({ CF_PAGES_BRANCH: 'main' }), 'production');
    assert.equal(env({ CF_PAGES_BRANCH: 'preview' }), 'preview');
  });
  it('SITE_ENV ima prednost pred branchem', () => {
    assert.equal(env({ SITE_ENV: 'production', GITHUB_REF_NAME: 'faza-3' }), 'production');
    assert.equal(env({ SITE_ENV: 'preview', GITHUB_REF_NAME: 'main' }), 'preview');
  });
  it('neznan SITE_ENV je napaka', () => assert.throws(() => detectSiteEnv({ SITE_ENV: 'staging' }), /SITE_ENV/));
});

/**
 * Ali je build preview (noindex, brez analitike) ali produkcija.
 *
 * Vrstni red:
 * 1. `SITE_ENV=preview|production` – izrecna izbira ima vedno prednost
 * 2. `CF_PAGES_BRANCH` (Cloudflare Pages) ali `GITHUB_REF_NAME` (GitHub Actions): vse razen `main` je preview
 * 3. sicer produkcija (lokalni build)
 */
export type SiteEnv = 'preview' | 'production';

export interface SiteEnvResult {
  env: SiteEnv;
  /** Od kod je odločitev, za izpis v logu. */
  reason: string;
}

export const PRODUCTION_BRANCH = 'main';

export function detectSiteEnv(env: Record<string, string | undefined> = process.env): SiteEnvResult {
  const explicit = env.SITE_ENV?.trim();
  if (explicit) {
    if (explicit !== 'preview' && explicit !== 'production') {
      throw new Error(`[factory] SITE_ENV mora biti preview ali production, ne "${explicit}".`);
    }
    return { env: explicit, reason: `SITE_ENV=${explicit}` };
  }
  for (const name of ['CF_PAGES_BRANCH', 'GITHUB_REF_NAME'] as const) {
    const branch = env[name]?.trim();
    if (branch) {
      return { env: branch === PRODUCTION_BRANCH ? 'production' : 'preview', reason: `${name}=${branch}` };
    }
  }
  return { env: 'production', reason: 'privzeto (ni SITE_ENV, CF_PAGES_BRANCH ne GITHUB_REF_NAME)' };
}

/**
 * `SITE_NOINDEX=true`: produkcijski build, ki ga iskalniki ne smejo indeksirati (npr. izmišljen primer na javni domeni).
 * Za razliko od preview builda robots.txt ostane odprt, da crawler noindex sploh vidi.
 */
export function detectNoindex(env: Record<string, string | undefined> = process.env): boolean {
  const value = env.SITE_NOINDEX?.trim().toLowerCase();
  if (!value || value === 'false' || value === '0') return false;
  if (value === 'true' || value === '1') return true;
  throw new Error(`[factory] SITE_NOINDEX mora biti true ali false, ne "${env.SITE_NOINDEX}".`);
}

/**
 * GA4 s privolitvijo: banner (vanilla-cookieconsent, MIT) + Google Consent Mode v2, osnovni način.
 *
 * Privzeto stanje ("denied") nastavi inline skripta v <head> (Ga4.astro) pred vsem ostalim.
 * gtag.js se naloži ŠELE po privolitvi v kategorijo `analytics`; brez nje ni nobene zahteve na Google.
 * Ob preklicu se stanje vrne na "denied" in piškotki `_ga*` se izbrišejo.
 */
import * as CookieConsent from 'vanilla-cookieconsent';
import { consentTranslation, type ConsentLang } from './consent-i18n.ts';
import { initTracking } from './track.ts';

const CATEGORY = 'analytics';

export function initConsent(): void {
  const el = document.getElementById('factory-ga4');
  const measurementId = el?.dataset.id;
  if (!measurementId) return;
  const privacy: Record<string, string> = JSON.parse(el.dataset.privacy ?? '{}');

  let gtagLoaded = false;
  const apply = () => {
    const granted = CookieConsent.acceptedCategory(CATEGORY);
    window.gtag?.('consent', 'update', { analytics_storage: granted ? 'granted' : 'denied' });
    if (granted && !gtagLoaded) {
      gtagLoaded = true;
      void CookieConsent.loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`, {
        async: '',
      });
    }
  };

  void CookieConsent.run({
    guiOptions: {
      consentModal: { layout: 'box', position: 'bottom left', equalWeightButtons: true },
      preferencesModal: { layout: 'box', equalWeightButtons: true },
    },
    categories: {
      necessary: { enabled: true, readOnly: true },
      [CATEGORY]: {
        autoClear: { cookies: [{ name: /^_ga/ }, { name: '_gid' }] },
      },
    },
    onConsent: apply,
    onChange: apply,
    language: {
      default: 'sl',
      autoDetect: 'document',
      translations: Object.fromEntries(
        (['sl', 'en'] as const).map((lang: ConsentLang) => [lang, consentTranslation(lang, privacy[lang] ?? privacy.default)]),
      ),
    },
  });

  // Dogodki gredo v GA4 samo s privolitvijo; brez nje se tiho zavržejo (ne čakajo v dataLayer).
  initTracking((name, props) => {
    if (CookieConsent.acceptedCategory(CATEGORY)) window.gtag?.('event', name, props);
  });
}

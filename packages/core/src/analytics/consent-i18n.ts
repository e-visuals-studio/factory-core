/**
 * Besedila bannerja za piškotke (vanilla-cookieconsent) v slovenščini in angleščini.
 * Jezik se izbere po `<html lang>`; povezava na politiko zasebnosti je neobvezna.
 */
import type { Translation } from 'vanilla-cookieconsent';

export type ConsentLang = 'sl' | 'en';

/** Besedila za en jezik; `privacyHref` doda povezavo v noge obeh oken. */
export function consentTranslation(lang: ConsentLang, privacyHref?: string): Translation {
  const t = TEXTS[lang];
  const footer = privacyHref ? `<a href="${encodeURI(privacyHref)}">${t.privacy}</a>` : undefined;
  return {
    consentModal: { ...t.consentModal, footer },
    preferencesModal: {
      ...t.preferencesModal,
      sections: [...t.preferencesModal.sections, ...(footer ? [{ title: t.more, description: footer }] : [])],
    },
  };
}

/** Besedilo gumba v footerju, ki znova odpre nastavitve. */
export const cookieSettingsLabels: Record<ConsentLang, string> = {
  sl: 'Nastavitve piškotkov',
  en: 'Cookie settings',
};

const TEXTS = {
  sl: {
    privacy: 'Politika zasebnosti',
    more: 'Več informacij',
    consentModal: {
      title: 'Piškotki',
      description:
        'Nujni piškotki omogočajo delovanje strani. Z vašo privolitvijo uporabljamo tudi Google Analytics, da vidimo, kako se stran uporablja. Privolitev lahko kadarkoli prekličete v nastavitvah piškotkov na dnu strani.',
      acceptAllBtn: 'Sprejmi vse',
      acceptNecessaryBtn: 'Samo nujni',
      showPreferencesBtn: 'Nastavitve',
    },
    preferencesModal: {
      title: 'Nastavitve piškotkov',
      acceptAllBtn: 'Sprejmi vse',
      acceptNecessaryBtn: 'Samo nujni',
      savePreferencesBtn: 'Shrani izbiro',
      closeIconLabel: 'Zapri',
      sections: [
        {
          description: 'Izberite, katere piškotke dovolite. Izbiro lahko kadarkoli spremenite.',
        },
        {
          title: 'Nujni piškotki',
          description: 'Potrebni za delovanje strani in za shranjevanje vaše izbire o piškotkih. Ni jih mogoče izklopiti.',
          linkedCategory: 'necessary',
        },
        {
          title: 'Analitični piškotki',
          description:
            'Google Analytics nam pove, katere strani so obiskane in kako obiskovalci pridejo do nas.',
          linkedCategory: 'analytics',
        },
      ],
    },
  },
  en: {
    privacy: 'Privacy policy',
    more: 'More information',
    consentModal: {
      title: 'Cookies',
      description:
        'Necessary cookies keep this site working. With your consent we also use Google Analytics to see how the site is used. You can withdraw consent at any time in the cookie settings at the bottom of the page.',
      acceptAllBtn: 'Accept all',
      acceptNecessaryBtn: 'Necessary only',
      showPreferencesBtn: 'Settings',
    },
    preferencesModal: {
      title: 'Cookie settings',
      acceptAllBtn: 'Accept all',
      acceptNecessaryBtn: 'Necessary only',
      savePreferencesBtn: 'Save choice',
      closeIconLabel: 'Close',
      sections: [
        {
          description: 'Choose which cookies you allow. You can change your choice at any time.',
        },
        {
          title: 'Necessary cookies',
          description: 'Required for the site to work and to remember your cookie choice. They cannot be turned off.',
          linkedCategory: 'necessary',
        },
        {
          title: 'Analytics cookies',
          description: 'Google Analytics tells us which pages are visited and how visitors find us.',
          linkedCategory: 'analytics',
        },
      ],
    },
  },
} satisfies Record<ConsentLang, Translation & { privacy: string; more: string }>;

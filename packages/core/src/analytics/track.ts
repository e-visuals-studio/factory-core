/**
 * Enoten API za sledenje dogodkom, neodvisen od ponudnika (Umami, Plausible, GA4).
 *
 * - Deklarativno: `data-track="generate_lead"` + lastnosti `data-track-<ime>="…"` (npr. `data-track-method="phone"`).
 * - Samodejno: klik na `tel:` / `mailto:` povezavo → `generate_lead` z `method: phone | email`
 *   (pokrije tudi povezave iz CMS vsebine brez atributa); oddaja `form[data-track]` → dogodek obrazca.
 * - Programsko: `window.factoryTrack('ime', { … })`, npr. iz Astro islanda.
 *
 * Modul se zapakira samo, kadar je analitika vklopljena (glej Analytics.astro).
 */

export type TrackProps = Record<string, string | number | boolean>;
export type TrackSender = (name: string, props: TrackProps) => void;

declare global {
  interface Window {
    factoryTrack?: (name: string, props?: TrackProps) => void;
    umami?: { track: (name: string, data?: TrackProps) => void };
    plausible?: (name: string, options?: { props?: TrackProps }) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/** Priporočen GA4 dogodek za povpraševanje; v GA4 ga označiš kot ključni dogodek (konverzijo). */
export const LEAD_EVENT = 'generate_lead';

const CLICK_SELECTOR = ':not(form)[data-track], a[href^="tel:" i], a[href^="mailto:" i]';

/** Pripne poslušalce za klike in oddaje obrazcev ter nastavi `window.factoryTrack`. */
export function initTracking(send: TrackSender): void {
  const track = (name: string, props: TrackProps = {}) => {
    try {
      send(name, props);
    } catch {
      // Analitika nikoli ne sme zlomiti strani (npr. blokirana skripta ponudnika).
    }
  };
  window.factoryTrack = track;

  document.addEventListener(
    'click',
    (event) => {
      const el = (event.target as Element | null)?.closest?.(CLICK_SELECTOR);
      if (!(el instanceof HTMLElement)) return;
      const href = el.getAttribute('href')?.toLowerCase() ?? '';
      const method = href.startsWith('tel:') ? 'phone' : href.startsWith('mailto:') ? 'email' : undefined;
      const name = el.dataset.track || (method ? LEAD_EVENT : '');
      if (!name) return;
      track(name, { ...(method && { method }), ...propsFrom(el) });
    },
    { capture: true },
  );

  // `submit` se sproži šele, ko obrazec prestane HTML validacijo.
  // TODO(faza 4): ko bo obrazec poslan prek fetch na Worker, mora `generate_lead` za obrazec priti šele
  // po uspešnem odgovoru Workerja (klic `window.factoryTrack` iz islanda), ne ob `submit`.
  document.addEventListener(
    'submit',
    (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.dataset.track) return;
      track(form.dataset.track, { method: 'form', ...propsFrom(form) });
    },
    { capture: true },
  );
}

/** `data-track-form-id="x"` → `{ form_id: 'x' }` (snake_case, kot ga pričakuje GA4). */
function propsFrom(el: HTMLElement): TrackProps {
  const props: TrackProps = {};
  for (const [key, value] of Object.entries(el.dataset)) {
    if (!key.startsWith('track') || key === 'track' || value === undefined) continue;
    const name = key.slice(5).replace(/[A-Z]/g, (c, i: number) => (i ? '_' : '') + c.toLowerCase());
    props[name] = value;
  }
  return props;
}

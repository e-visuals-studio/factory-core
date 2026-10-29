import type { LinkItem, NavItem, PostalAddress } from '@e-visuals-studio/core';

/** Podatki o stranki – v site-template jih bo napolnil brief.yaml. */
export const site = {
  name: 'Mizarstvo Primer',
  description: 'Mizarska delavnica iz Kamnika: kuhinje, vgradne omare in pohištvo po meri iz masivnega lesa.',
  email: 'info@mizarstvo-primer.si',
  phone: '+386 1 234 56 78',
  address: {
    streetAddress: 'Primerna ulica 12',
    addressLocality: 'Kamnik',
    postalCode: '1241',
    addressCountry: 'SI',
  } satisfies PostalAddress,
  openingHours: ['Pon–pet: 7.00–15.00', 'Sob: po dogovoru'],
};

export const nav: NavItem[] = [
  { label: 'Storitve', href: '/#storitve' },
  { label: 'O nas', href: '/#o-nas' },
  { label: 'Reference', href: '/#galerija' },
  { label: 'Blog', href: '/blog/', match: '/blog/' },
  { label: 'Kontakt', href: '/#kontakt' },
];

export const cta: LinkItem = { label: 'Pošljite povpraševanje', href: '/#kontakt' };

export const footer = {
  tagline: site.description,
  columns: [
    { title: 'Stran', links: nav.slice(0, 4) },
    {
      title: 'Kontakt',
      links: [
        { label: site.phone, href: `tel:${site.phone.replace(/[^\d+]/g, '')}` },
        { label: site.email, href: `mailto:${site.email}` },
      ],
    },
  ],
  legal: [
    { label: 'Politika zasebnosti', href: '/zasebnost/' },
    { label: 'RSS', href: '/rss.xml' },
  ],
  companyInfo: 'Mizarstvo Primer d.o.o., Kamnik',
};

import type { ImageMetadata } from 'astro';

export interface LinkItem {
  label: string;
  href: string;
}

export interface NavItem extends LinkItem {
  /** Za `aria-current="page"`, če se pot ne ujema dobesedno. */
  match?: string;
}

/** Slika za bloke: vedno lokalna (astro:assets), alt je obvezen. */
export interface ImageInput {
  src: ImageMetadata;
  /** Prazen niz samo za dekorativne slike. */
  alt: string;
}

export interface BlogListItem {
  title: string;
  description: string;
  href: string;
  date: Date;
  image?: ImageInput;
}

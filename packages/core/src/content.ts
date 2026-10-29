import type { SchemaContext } from 'astro:content';
import { z } from 'astro/zod';

const required = (field: string) => z.string().trim().min(1, `${field} je obvezen.`);

/**
 * Slika z dokazano pravico do uporabe (glej WEBSITE_FACTORY_PLAN.md, Avtorske pravice).
 * Vsa polja so obvezna: brez avtorja, vira in licence slike ni mogoče objaviti.
 */
export const licensedImageSchema = ({ image }: SchemaContext) =>
  z.object({
    src: image(),
    /** Opis za bralnike zaslona (dostopnost). */
    alt: required('alt'),
    /** Fotograf, stranka, orodje za AI sliko … */
    avtor: required('avtor'),
    /** Od kod je slika: URL, "stranka", "naročen fotograf", "generirano" … */
    vir: required('vir'),
    /** npr. "Unsplash License", "CC BY 4.0", "pogodba s fotografom", "lastna" */
    licenca: required('licenca'),
    /**
     * AI generirana slika (pravilo o AI slikah iz plana): samo ilustracija, nikoli prikaz resničnih oseb,
     * izdelkov ali objektov stranke. Na strani se označi kot AI ilustracija.
     */
    ai: z.boolean().default(false),
  });

export type LicensedImage = z.infer<ReturnType<typeof licensedImageSchema>>;

/**
 * Shema za blog in novice. Uporaba v `src/content.config.ts` stranke:
 *   defineCollection({ loader: glob(...), schema: blogSchema })
 */
export const blogSchema = (context: SchemaContext) =>
  z.object({
    title: z.string().min(1).max(90),
    description: z.string().min(50).max(160),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('Uredništvo'),
    /** Neobvezna; brez nje se uporabi samodejna OG slika (`ogImage()`). Če obstaja, so vsa polja obvezna. */
    image: licensedImageSchema(context).optional(),
    tags: z.array(z.string()).default([]),
    lang: z.string().optional(),
    draft: z.boolean().default(false),
  });

export type BlogFrontmatter = z.infer<ReturnType<typeof blogSchema>>;

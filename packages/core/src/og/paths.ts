export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** Pot do samodejne OG slike za vnos v kolekciji (glej integracijo, opcija `og`). */
export function ogImage(collection: string, id: string) {
  return { src: `/og/${collection}/${id}.png`, width: OG_WIDTH, height: OG_HEIGHT };
}

/** Privzeta OG slika strani (ime strani in slogan). */
export const defaultOgImage = { src: '/og/default.png', width: OG_WIDTH, height: OG_HEIGHT };

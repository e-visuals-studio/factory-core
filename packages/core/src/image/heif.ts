/**
 * Slike HEIF družine (AVIF, HEIC …) niso dovoljene kot vhod: dekodira jih libheif v sharpu,
 * kjer je bila kritična ranljivost (GHSA-26w7-cxv4-gfx2). AVIF ostane samo izhodni format optimizacije.
 */

/** ISO-BMFF `ftyp` znamke, ki jih dekodira libheif. */
const HEIF_BRANDS = new Set(['avif', 'avis', 'heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'hevm', 'hevs', 'mif1', 'msf1', 'mif2']);

/** Končnice za zgodnjo napako (brief, content kolekcije) – vsebino vedno preveri še `heifBrand()`. */
export const HEIF_EXTENSION = /\.(avif|heic|heif|hif)(\?.*)?$/i;

export const heifMessage = (src: string, kind: string) =>
  `Slika "${src}" je v formatu ${kind}, ki ni dovoljen kot vhodna slika (varnost: GHSA-26w7-cxv4-gfx2). ` +
  'Pretvori jo v JPG, PNG ali WebP (iPhone fotografije so HEIC). AVIF ostane samo izhodni format optimizacije.';

/** Vrne HEIF znamko (npr. `avif`, `heic`), če je buffer slika HEIF družine, sicer `null`. Ne glede na končnico. */
export function heifBrand(data: Uint8Array): string | null {
  if (data.length < 16) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const ascii = (at: number) => String.fromCharCode(data[at]!, data[at + 1]!, data[at + 2]!, data[at + 3]!);
  if (ascii(4) !== 'ftyp') return null;
  const boxEnd = Math.min(view.getUint32(0), data.length);
  // Glavna znamka (8), nato minor version (12) in seznam združljivih znamk do konca škatle.
  for (const at of [8, ...Array.from({ length: Math.max(0, (boxEnd - 16) >> 2) }, (_, i) => 16 + i * 4)]) {
    const brand = ascii(at);
    if (HEIF_BRANDS.has(brand)) return brand;
  }
  return null;
}

export function assertNotHeif(data: Uint8Array, src: string) {
  const brand = heifBrand(data);
  if (brand) throw new Error(`[factory] ${heifMessage(src, `HEIF (${brand})`)}`);
}

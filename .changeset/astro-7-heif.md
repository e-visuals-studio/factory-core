---
"@e-visuals-studio/core": minor
---

Astro 7 in zavrnitev vhodnih slik HEIF/AVIF (varnost).

- **Astro 7** (`peerDependencies.astro` `^7.2.8`) in **sharp 0.35.5**: odpravi GHSA-26w7-cxv4-gfx2 (RCE prek AVIF, za Astro 6.x ni popravka) in tri high ranljivosti v sharp/libvips/libheif/librsvg. Strani strank morajo nadgraditi `astro` na `^7.4.2`, `sharp` na `^0.35.5` in Node na **22.23.4** (`.nvmrc`, `engines`).
- **Vhodne slike HEIF družine (AVIF, HEIC) niso več dovoljene.** Zavrnejo jih shema briefa (`slike.*.datoteka`), `licensedImageSchema` (po končnici, z navodilom za pretvorbo) in nov `@e-visuals-studio/core/image-service`, ki ga `factory()` nastavi namesto privzetega sharpa in sliko preveri po vsebini, ne po končnici. AVIF ostane izhodni format optimizacije. Breaking: brief ali vsebina z `.avif` sliko ne gre več skozi build.
- `factory()` ohrani presledke med inline elementi kot v Astro 6 (`compressHTML: true`, če ni nastavljeno), ker privzeti `'jsx'` iz Astro 7 zlepi besede.

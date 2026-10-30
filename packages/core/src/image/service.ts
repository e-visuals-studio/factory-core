/**
 * Astrov sharp image service z varovalom: slike HEIF družine (AVIF, HEIC) zavrne pred sharpom.
 * `factory()` ga nastavi namesto privzetega `astro/assets/services/sharp`.
 */
import type { LocalImageService } from 'astro';
import sharpService from 'astro/assets/services/sharp';
import { assertNotHeif } from './heif.ts';

const service: LocalImageService = {
  ...sharpService,
  async transform(inputBuffer, transform, config, logger) {
    try {
      assertNotHeif(inputBuffer, String(transform.src));
    } catch (error) {
      // Astro napako ovije v splošni »Could not transform image«, zato razlog izpišemo sami.
      logger.error((error as Error).message);
      throw error;
    }
    return sharpService.transform(inputBuffer, transform, config, logger);
  },
};

export default service;

---
"@e-visuals-studio/core": patch
---

Reusable workflow `site.yml` za repozitorije strank (`.github/workflows/site.yml`): install, build, check, check:tokens, test in Lighthouse, na pushu v `main` še check:todo; brez deploya. Repozitorij stranke ga kliče na istem tagu kot paket (`uses: e-visuals-studio/factory-core/.github/workflows/site.yml@vX.Y.Z`), `pnpm core:update` posodobi oboje.

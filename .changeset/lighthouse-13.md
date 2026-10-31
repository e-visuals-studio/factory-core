---
"@e-visuals-studio/core": minor
---

Lighthouse 13 namesto `@lhci/cli` in varnostni gate tudi za devDependencies.

- **`factory-lighthouse`** (nov bin): Lighthouse 13 na zgrajeni strani z istim `lighthouserc.json` kot prej (`staticDistDir`, `url`, `numberOfRuns`, `chromeFlags`, meje `categories:*` z `minScore` in `aggregationMethod`). Statični strežnik kot pri Lighthouse CI (301 za mape brez poševnice, gzip), poročila v `.lighthouseci/`, jasna napaka in exit 1 pod mejo. `lighthouse` (^13.5.0) je neobvezen peerDependency.
- `@lhci/cli` 0.15.1 (zadnja izdaja 2025-06, pripne Lighthouse 12.6.1) je prinašal 6× high v devDependencies (`tmp`, `extract-zip` brez popravka, `basic-ftp`, `zod`); Lighthouse 13.5.0 nima znanih ranljivosti.
- **`site.yml`**: nov korak `pnpm audit --audit-level high` (tudi devDependencies) v jobu `site`. Repozitorij stranke z `@lhci/cli` mora preiti na `lighthouse` + `factory-lighthouse` (`"lighthouse": "factory-lighthouse"` v `package.json`), sicer CI pade.

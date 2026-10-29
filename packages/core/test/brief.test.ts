import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import { parse } from 'yaml';
import {
  briefSchema,
  companyInfo,
  loadBrief,
  openingHours,
  openingHoursText,
  siteUrl,
  TODO_SITE,
} from '../src/brief/index.ts';

const fixtures = new URL('./fixtures/', import.meta.url).pathname;
const todoBrief = () => readFile(`${fixtures}brief-todo.yaml`, 'utf8').then((s) => parse(s));
const issues = (data: unknown) => {
  const result = briefSchema.safeParse(data);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};

describe('briefSchema', () => {
  it('sprejme predlogo, kjer je vse TODO', async () => {
    assert.deepEqual(issues(await todoBrief()), []);
  });

  it('zavrne prazno ali manjkajočo vrednost (dovoljen je samo izrecen TODO)', async () => {
    const brief = await todoBrief();
    brief.kontakt.telefon = '';
    delete brief.pravno.davcna;
    const found = issues(brief);
    assert.ok(found.some((i) => i.startsWith('kontakt.telefon')), found.join('\n'));
    assert.ok(found.some((i) => i.startsWith('pravno.davcna')), found.join('\n'));
  });

  it('zavrne neznan ključ (strict)', async () => {
    const brief = await todoBrief();
    brief.kontakt.fax = '123';
    assert.ok(issues(brief).some((i) => i.startsWith('kontakt')));
  });

  it('preveri obliko vrednosti, ki niso TODO', async () => {
    const brief = await todoBrief();
    Object.assign(brief.kontakt, { email: 'ni-email', telefon: '01 234' });
    brief.pravno.davcna = '12345678';
    brief.stranka.opis.sl = 'Prekratko.';
    const found = issues(brief).map((i) => i.split(':')[0]);
    assert.deepEqual(found.sort(), ['kontakt.email', 'kontakt.telefon', 'pravno.davcna', 'stranka.opis.sl']);
  });

  it('z jezikom en zahteva angleška besedila povsod', async () => {
    const brief = await todoBrief();
    brief.jeziki = ['sl', 'en'];
    const found = issues(brief);
    for (const path of ['stranka.dejavnost.en', 'storitve.0.ime.en', 'slike.hero.alt.en', 'kljucneBesede.en']) {
      assert.ok(found.some((i) => i.startsWith(path)), `${path} manjka v:\n${found.join('\n')}`);
    }
  });

  it('privzeti jezik je sl', async () => {
    const brief = await todoBrief();
    brief.jeziki = ['en'];
    assert.ok(issues(brief).some((i) => i.startsWith('jeziki')));
  });
});

describe('loadBrief', () => {
  it('vrne brief in seznam TODO poti', async () => {
    const { todos } = await loadBrief('brief-todo.yaml', { root: fixtures });
    assert.ok(todos.includes('kontakt.telefon'));
    assert.ok(todos.includes('slike.hero.alt.sl'));
  });

  it('pade, če slika nima zapisa v registru licenc', async () => {
    await assert.rejects(
      loadBrief('brief-todo.yaml', { root: fixtures, licenses: 'ne-obstaja.yaml' }),
      /register licenc ne obstaja/,
    );
  });

  it('pade, če zapis nima avtorja, vira ali licence', async () => {
    const { writeFile, rm } = await import('node:fs/promises');
    await writeFile(`${fixtures}licenses-brez-avtorja.yaml`, '- datoteka: src/assets/**\n  vir: generirano\n  licenca: brez\n');
    try {
      await assert.rejects(
        loadBrief('brief-todo.yaml', { root: fixtures, licenses: 'licenses-brez-avtorja.yaml' }),
        /nima polj avtor/,
      );
    } finally {
      await rm(`${fixtures}licenses-brez-avtorja.yaml`);
    }
  });

  it('pade, če datoteka slike ne obstaja', async () => {
    const brief = await todoBrief();
    brief.slike.hero.datoteka = 'src/assets/ni.jpg';
    const { writeFile, rm } = await import('node:fs/promises');
    const { stringify } = await import('yaml');
    await writeFile(`${fixtures}brief-ni-slike.yaml`, stringify(brief));
    try {
      await assert.rejects(loadBrief('brief-ni-slike.yaml', { root: fixtures }), /slike\.hero\.datoteka: src\/assets\/ni\.jpg ne obstaja/);
    } finally {
      await rm(`${fixtures}brief-ni-slike.yaml`);
    }
  });
});

describe('pretvorbe', () => {
  it('delovni čas v schema.org in za ljudi', async () => {
    const brief = briefSchema.parse({
      ...(await todoBrief()),
      delovniCas: [
        { dnevi: ['Mo', 'Tu', 'We', 'Th', 'Fr'], od: '07:00', do: '15:00' },
        { dnevi: ['Sa'], od: '08:00', do: '12:00' },
      ],
    });
    assert.deepEqual(openingHours(brief), ['Mo-Fr 07:00-15:00', 'Sa 08:00-12:00']);
    assert.deepEqual(openingHoursText(brief, 'sl'), ['pon–pet: 7.00–15.00', 'sob: 8.00–12.00']);
    assert.deepEqual(openingHoursText(brief, 'en'), ['Mon–Fri: 07:00–15:00', 'Sat: 08:00–12:00']);
  });

  it('TODO ostane viden (da ga ujame check:todo)', async () => {
    const brief = briefSchema.parse(await todoBrief());
    assert.deepEqual(openingHours(brief), ['TODO']);
    assert.equal(siteUrl(brief), TODO_SITE);
    assert.match(companyInfo(brief), /TODO/);
  });
});

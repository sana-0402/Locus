# Locus

*A field guide to biological databases.*

Locus is a single self-contained web page with two ways into a curated catalog of **167 biological databases across 16 categories**: a plain-language search that ranks the five best fits for whatever you're working on, and a full directory rendered as an animated galaxy — one solar system per category, one orbiting point per database.

No install, no build step, no server required. Open `locus.html` in a browser and it works.

---

## What's in this repo

| File | What it is |
|---|---|
| `locus.html` | The whole app — markup, styling, the 167-entry database catalog, and all logic in one file. This is the only file you need to open. |
| `locus-proxy-worker.js` | An **optional** Cloudflare Worker that lets the AI-ranked search work outside of Claude.ai, without exposing an API key in the page. See [AI search setup](#optional-ai-ranked-search-setup) below. Not required — the app works fully without it. |

---

## Using it

Open `locus.html` in any modern browser (Chrome, Safari, Firefox, Edge). There's no build process — it's a static file.

### Find a database

Describe what you're working on in plain language — an organism, a molecule, a technique, a disease — and Locus returns its five best-guess matches, each with a one-line reason and a direct link to the real database.

```
"I need 3D structures of a human kinase to plan a drug-binding study"
"I have RNA-seq gene expression data from tumor samples"
"which genes give bacteria antibiotic resistance"
```

If a query doesn't land on anything solid, Locus says so honestly instead of presenting weak guesses as confident answers, and suggests naming something more specific (an organism, molecule, or technique).

### The full directory (the galaxy)

Every category is a **sun**; every database in that category is a **point orbiting it**. The layout encodes real structure, not just decoration:

- **Orbit distance from a sun** — the database Locus judges most central to that category sits in the **habitable zone** (the middle orbit). The rest fan outward from newest to most dated, oldest at the edge.
- **Sun size** — purely how many databases belong to that category, relative to every other category.
- **Distance from the galaxy's center** — categories with few, thematically isolated databases sit near the center (least explored); broad categories with many databases sit in the middle band (general hubs); narrow, self-contained categories sit toward the outer edge (specialized).
- **Distance between two suns** — categories whose databases are conceptually related (measured by keyword overlap) drift closer together than unrelated ones.
- **Motion** — everything keeps orbiting on its own. Closer/smaller systems move faster, farther/bigger ones move slower, and hovering over a system eases its motion down so you can actually click something.

Drag to pan, scroll or pinch to zoom, hover a point to see its name, click to open the real site. A filter box dims non-matches instead of hiding them, so you don't lose your place.

---

## How the data is organized

The 167 entries were originally sourced from Wikipedia's [List of biological databases](https://en.wikipedia.org/wiki/List_of_biological_databases), then substantially reworked:

- **Categories were consolidated from 73 down to 16** — the original per-Wikipedia-section categorization left most categories with a single member, which told you more about how Wikipedia's editors split up a page than about how these tools relate to each other. Each of the 16 categories groups databases that are genuinely used for the same kind of work (e.g. *Protein Structure & 3D Modeling*, *Antimicrobial Resistance & Pathogen Biology*, *Taxonomy & Biodiversity*), sized between 3 and 27 members so no single sun is a lonely dot and no category is a meaningless catch-all.
- **Keywords were expanded per entry** — each database got 5–12 additional accurate keywords (institutions, technical terms, file formats, related concepts) grounded in what that specific site actually does, not generic padding.

Current category breakdown:

```
27  Antimicrobial Resistance & Pathogen Biology
18  Model Organism & Genome Databases
16  Pathways, Metabolism & Systems Models
14  Meta-Databases, Literature & Data Repositories
14  Protein Sequence & Family Databases
11  Protein Structure & 3D Modeling
10  Human Genetics, Variation & Disease
10  Biological & Medical Imaging
 9  Protein Interactions & Modifications
 7  Nucleotide Sequence & Genome Archives
 7  Gene Regulation & Epigenetics
 6  RNA Biology & Extracellular Vesicles
 6  Taxonomy & Biodiversity
 5  Cancer & Disease Genomics
 4  Gene Expression & Transcriptomics
 3  Chemistry, Toxicology & Drug Discovery
```

Each entry has the shape:

```js
{
  "id": "card",
  "name": "CARD",
  "url": "https://card.mcmaster.ca/",
  "category": "Antimicrobial Resistance & Pathogen Biology",
  "description": "Curated database of antibiotic resistance genes, mechanisms and mutations.",
  "keywords": ["CARD", "antibiotic resistance", "Resistance Gene Identifier", "..."]
}
```

The full dataset lives inline in `locus.html` as `const BIO_DATABASES = [...]`.

---

## How the search actually works

There are two layers, and the app always has a working fallback:

**1. AI-ranked search (optional).** If configured, Locus sends the full catalog plus your query to Claude and gets back a ranked top 5 with tailored reasons. This only works out of the box while the page is running inside Claude.ai as an artifact — see [setup](#optional-ai-ranked-search-setup) to make it work anywhere else.

**2. Keyword search (always available, no setup).** A real matcher, not a substring search:
- Light stemming so "sequencing"/"sequence" and "proteins"/"protein" line up without needing exact plural/tense matches.
- A ~25-entry bio-abbreviation dictionary so "AMR," "GWAS," "PPI," "ChIP-seq," "3D," etc. expand to the fuller phrasing the descriptions use.
- **Concept bridging** for lab techniques that don't have a dedicated database in this catalog (CRISPR, PCR, mass spec, molecular docking, western blot, single-cell sequencing, metagenomics, phylogenetics, vaccine design) — these get redirected to the nearest genuinely relevant category (e.g. CRISPR → general sequence/genome/protein databases) instead of returning near-random noise.
- A phrase bonus reserved for real multi-word phrases or genuine acronyms, not generic single words, so a database whose keyword list happens to contain "gene" twice doesn't out-rank the one you actually want.
- An honest confidence signal — if nothing scores meaningfully, the app says so and suggests adding a specific organism, molecule, technique, or disease name, rather than presenting five weak guesses as if they were solid.

If you refine or expand the keyword list in `BIO_DATABASES`, the fallback search picks it up automatically — no other code changes needed.

---

## Optional: AI-ranked search setup

By default, `API_PROXY_URL` (near the top of the `<script>` in `locus.html`) is empty, and every search uses the keyword matcher. That's a complete, working experience on its own.

If you want the AI-ranked layer to work when the page is opened outside Claude.ai, you need a small proxy that holds your Anthropic API key server-side (never put a real key directly in the HTML — anyone with dev tools open could read it straight out of the page).

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Worker** (free tier).
2. Paste in the entire contents of `locus-proxy-worker.js`, click **Deploy**.
3. In that worker's **Settings → Variables and Secrets**:
   - Add a **secret** `ANTHROPIC_API_KEY` = your real API key.
   - Add a plain variable `ALLOWED_ORIGIN` = the exact URL you host Locus at, so only your site can use the key.
4. Copy the worker's URL and paste it into `API_PROXY_URL` in `locus.html`.

Cost is genuinely low for casual use (a few cents per search at current pricing), but it does require your own billing on the Anthropic API — worth doing only if you want it, not a requirement.

---

## Hosting it

`locus.html` is a static file — no server-side code required for the core app.

- **Fastest:** drag it into [Netlify Drop](https://app.netlify.com/drop) for an instant live link.
- **Free + git-based:** GitHub Pages.
- **Simplest of all:** just send someone the file. Double-clicking it opens it in a browser, no hosting needed — the galaxy view works fully offline either way.

---

## Customizing

Everything is in `locus.html`, in three logical (though not physically separate) parts:

- **CSS** (`<style>` block) — monochrome black/white/gray palette throughout, with the galaxy view intentionally full-black regardless of the rest of the theme.
- **Data** (`const BIO_DATABASES = [...]`) — add, remove, or edit entries here. Keep the same shape (`id`, `name`, `url`, `category`, `description`, `keywords`).
- **Logic** (rest of the `<script>`) — tab navigation, the search/ranking pipeline, and the galaxy engine (category stats, orbit placement, force-directed sun layout, canvas rendering, interaction handling).

If you add a new category, the galaxy engine picks it up automatically — sun size, orbit distances, and sun-to-sun clustering are all computed from the data, not hardcoded per category.

---

## Known limitations

- **Founding "era" values used for orbit placement are editorial estimates**, not verified historical facts, for the many niche/undocumented databases in the catalog — real, well-known launch years (GenBank, PDB, UniProt, etc.) are accurate; the rest use a stable placeholder so the layout doesn't jitter between reloads.
- **The galaxy is canvas-only** — no screen reader support, no keyboard navigation. Fine for casual/personal use; would need a "view as list" fallback to be genuinely accessible.
- **Keyword search has no real semantic understanding** — it can bridge known techniques toward relevant categories, but it can't recognize "no good match exists" for a technique it doesn't know about, and will return its closest (sometimes weak) guesses instead.
- **167 external links, some to smaller academic/institutional sites** — a few will inevitably go stale over time and need periodic checking.

---

## Version history

See [CHANGELOG.md](./CHANGELOG.md) for the full history of what changed between v1.0, v2.0, and v2.1, and why.

---

## Credits

Made by Saanchi and Claude. Catalog compiled and condensed from Wikipedia's [List of biological databases](https://en.wikipedia.org/wiki/List_of_biological_databases).

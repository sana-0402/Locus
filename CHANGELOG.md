# Changelog

All notable changes to Locus are documented here, grouped by version. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

---

## v2.1 — Smarter keyword search

The keyword fallback (the search path that always works, with no API key required) got a real overhaul, prompted by testing it adversarially instead of trusting it after one pass.

### Added
- Word-boundary, stemmed matching in place of raw substring matching, so "sequencing" matches "sequence," "proteins" matches "protein," and short terms like "rna" can no longer accidentally match inside unrelated words.
- A ~25-entry bio-abbreviation dictionary so queries using shorthand — AMR, GWAS, PPI, SNP, ChIP-seq, RNA-seq, 3D, PCR — expand to the fuller phrasing the descriptions and keywords actually use.
- **Concept bridging** for lab techniques that don't have a dedicated database anywhere in the 167-entry catalog (CRISPR/Cas9, PCR, mass spectrometry, molecular docking, western blot, single-cell sequencing, metagenomics, phylogenetics, vaccine/antigen design). Instead of returning near-random noise, these now redirect to the nearest genuinely relevant category — e.g. CRISPR points toward general sequence/genome/protein databases rather than unrelated antimicrobial-resistance entries.
- A phrase-match bonus, but scoped to real multi-word phrases or genuine acronyms only, so a database whose keyword list happens to repeat a generic single word doesn't out-rank the one actually relevant to the query.
- An honest low-confidence signal: when nothing scores meaningfully, the result note now says so explicitly and suggests naming a specific organism, molecule, technique, or disease — rather than presenting five weak guesses as if they were solid matches.

### Fixed
- An over-aggressive stemmer was quietly breaking gene-related matches by stripping "genes" down to "gen" instead of "gene." Found by debugging why core antimicrobial-resistance databases (CARD, VFDB) weren't surfacing for an "AMR genes" query.
- A stateful-regex bug: several phrase-matching patterns used the global (`/g`) flag together with `.test()`, which in JavaScript causes the regex to remember its position between calls. The same identical query could silently alternate between matching and not matching across repeated searches. Verified and fixed; confirmed identical results across three repeated runs of the same query afterward.
- The original short-acronym exclusion (keywords under 4 characters, like "AMR," were being filtered out of phrase matching entirely) — replaced with logic that specifically recognizes acronym-style keywords instead of just gating on length.

---

## v2.0 — Galaxy visualization, dark theme, and data overhaul

The biggest single stretch of work: the Full Directory page was rebuilt from a plain filterable list into an animated galaxy, the whole site's palette flipped to a minimalist black/white/gray scheme, and the underlying 167-entry dataset (swapped in from a fresh, richer source file) was reorganized from scratch.

### Data & categorization
- Replaced the original 78-entry hand-picked catalog with the full 167-entry dataset, initially carrying 73 categories inherited from the source data — most of which held only a single database.
- Consolidated those 73 categories down to **16**, sized between 3 and 27 members each, specifically to avoid the two failure modes at either extreme: dozens of one-database "categories" (too specialized to mean anything) and a handful of giant catch-alls (too generalized to be useful). Every database was reassigned by hand based on what it's actually used for.
- Expanded every entry's keyword list with 5–12 additional accurate, entry-specific terms (institutions, technical terms, file formats, related concepts) rather than generic padding.

### Galaxy visualization
Built incrementally, each round driven by a specific problem:
- **Initial build:** categories became suns, databases became orbiting points. Orbit distance combined two signals — preference (the most central database in a category sits in the "habitable zone," the middle orbit) and founding era (older, more dated resources pushed toward the outer edge). Sun-to-sun distance was driven by keyword overlap between categories, so topically related categories cluster together. Continuous idle animation, hover-to-reveal names, click-to-visit.
- **Reliability fixes:** the fastest, smallest systems were too quick to reliably hover and click. Fixed by trusting the already-tracked hovered point at click time instead of re-hit-testing at the exact release position (which could miss due to mid-orbit drift), and by speeding up how quickly hovering slows a system down.
- **Orbit-around-center + visibility:** suns themselves were made to orbit the galaxy's center, not just sit static. Category name labels were hidden by default and only shown on hover, to reduce clutter. A "gravity" rule was added — a hard constraint pass guaranteeing no two systems can ever overlap, verified programmatically to converge to zero overlaps.
- **Meaningful radial placement:** distance from the galaxy's center was made deliberate rather than emergent — categories with low usage and low topical connectedness sit near the center (least explored), broad high-count categories sit in the middle band (general hubs), and narrow, thematically isolated categories sit toward the outer edge (specialized).
- **Sizing and motion tied to real usage:** sun size was decoupled to reflect purely how many databases belong to that category, relative to every other one. Orbital speed was tied to both distance from center (closer = faster) and system size (bigger = slower, like inertia), and increased 25% overall based on direct feedback that the motion felt too slow. Planet size was scaled to its own orbit distance.
- **Congestion fixes (two rounds):** first pass increased orbit spacing generally since the large viewing space felt cramped; a specific size boost (1.75x planets, 1.3x sun) was added for the "Meta-Databases" category so its many small entries weren't lost. A second, larger pass followed after systems were still visibly superimposing on each other: sun size was increased to a 30–320 unit range (roughly 5x the previous scale) since suns weren't visually distinguishable from their own planets, the repulsion and gravity-constraint margins between systems were substantially increased to guarantee real visible gaps (not just "technically not touching"), and each system's orbit spacing was anchored to its own sun's size so a big sun's planets never sit on top of it.

### Design
- The entire site's color palette moved from a light "paper" theme (moss green, amber, cream) to a minimalist black/white/gray scheme, including flipping the Find-a-Database page from majorly white to majorly black. The galaxy view stayed black throughout, since a black background suited the space metaphor even before the rest of the site matched it.

### Infrastructure
- Moved the AI-ranked search off a direct client-side call to the Anthropic API (which would have exposed a real API key in the page source) to an optional proxy architecture: a small Cloudflare Worker (`locus-proxy-worker.js`) holds the key server-side, with an origin lock so only the intended site can use it. Left unconfigured by default — the app runs fully on the keyword fallback with zero setup, since for a for-fun project the ongoing API billing and key-management overhead wasn't judged worth it.

### Misc
- Added a footer credit line: "Made by Saanchi and Claude."

---

## v1.0 — Original build

- Two views: **Find a Database**, a natural-language search returning the top 5 matching databases with tailored reasons and direct links; and **Full Directory**, an exhaustive, filterable, category-grouped list of every database with a brief description and a visit button.
- Catalog: 78 databases hand-curated from Wikipedia's [List of biological databases](https://en.wikipedia.org/wiki/List_of_biological_databases), organized into roughly a dozen categories.
- Design: a light "paper/specimen" theme — pale lichen background, moss-green and amber accents, Space Grotesk/Inter/IBM Plex Mono typography, index-card-styled result cards with rank stamps.
- Search: called the Anthropic API directly from the page for AI-ranked results, with a basic local keyword-match fallback if the API call failed.

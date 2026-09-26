# GitHub SEO & Discoverability Optimization — Pixel FX Forge

Repository: `GameDev-Toolkit/pixel-ability-fx-forge`
Audited: 2026-09-26
Current state found: empty description, **zero topics**, 0 stars, dead org links (see *Blocking issues* below).

---

## 1. Repository name — 5 SEO-friendly options

All five were checked against the GitHub API and are **still available** inside the `GameDev-Toolkit` org.
Priority keyword: `pixel VFX generator` — the highest-intent phrase this tool answers, and `generator` is what developers actually type.

| # | Name | Strategy | Best for |
| --- | --- | --- | --- |
| 1 | `pixel-vfx-generator` | Exact-match head term | Max search capture — **top pick** |
| 2 | `pixel-ability-fx-generator` | Keeps current identity, adds head term | Minimal disruption to existing links |
| 3 | `pixel-spell-fx-generator` | Targets "spell"/"ability VFX" intent | RPG / roguelike audience |
| 4 | `pixel-sprite-fx-generator` | Targets "sprite" — top-5 keyword in the niche | Discoverability via sprite tooling searches |
| 5 | `pixel-vfx-forge` | Short + brandable, keeps the `forge` identity | Brand-preserving alternative |

Notes on the trade-off: the current name `pixel-ability-fx-forge` leads with `ability`, a word almost nobody searches. `generator` + `vfx` + `pixel` carry the search demand. Avoid `awesome`, `tool`, `app` — they dilute names without adding search intent.

---

## 2. Repository description (final, 271 characters — within the 250–290 limit)

```

✨ Browser-based pixel art VFX generator for game developers: design animated spell, impact, barrier, and aura effects from 48 formations, 10 element palettes, and reproducible seeds, then export sprite sheets, PNG sequences, or transparent GIFs. No backend or build step.
```

Keyword coverage: `pixel art` · `VFX` · `generator` · `game developers` · `spell` · `sprite sheets` · `animation` · `PNG` · `GIF` · `browser` — all organically integrated, no keyword stuffing, one leading emoji.

Value proposition ordering: what it is → who it's for → what you get → why it's painless (no backend / no build).

### Alternative, if you want a different emphasis (all within limits)

- **Export-first (262)**: `✨ Pixel art VFX generator for game developers: craft animated spell, impact, barrier, and aura effects from 48 formations with reproducible seeds, then export sprite sheets, PNG sequences, or transparent GIFs straight from the browser. No backend, no build step.`
  — Drops the palette count, leads on the export payoff. Use this if GIF/sprite-sheet output is the stronger hook for your audience.

The primary version is recommended: it carries the most keyword surface (`pixel art`, `VFX`, `generator`, `spell`, `sprite sheets`, `GIF`, `browser`) while staying readable at 271 characters.

---

## 3. Topics — exactly 20, paste-ready

Each topic is a real, populated GitHub topic; volumes below are live `topic:` search counts measured via the GitHub API during this audit.

```
pixel-art
pixelart
gamedev
game-development
vfx
particle-system
particle-effects
sprite-sheet
spritesheet
sprite-animation
animation
game-assets
procedural-generation
html5-canvas
canvas
canvas2d
javascript
browser-tool
no-build
contributions-welcome
```

### Why these 20

| Topic | Live repos | Role |
| --- | --- | --- |
| `contributions-welcome` | 1,845 | **Required.** Surfaces the repo to contributors browsing for projects to help. |
| `game-development` | 38,175 | Highest-traffic relevant topic. |
| `gamedev` | 13,604 | The tag the actual audience uses; same project format as Pixelorama. |
| `animation` | 19,427 | Animation tooling discovery. |
| `canvas` | 15,798 | Core technology, well-trafficked. |
| `javascript` | 686,036 | Primary language tag. |
| `pixel-art` | 5,154 | Core niche identity. |
| `procedural-generation` | 4,369 | Deterministic seeded generation is a genuine feature. |
| `html5-canvas` | 3,070 | Matches the renderer exactly. |
| `pixelart` | 698 | Synonym — the niche's leading repos (Pixelorama) tag both spellings. |
| `canvas2d` | 1,539 | Exact API used by the renderer. |
| `browser-tool` | 612 | Distribution model. |
| `no-build` | 950 | Differentiator vs. npm-heavy tooling. |
| `vfx` | 982 | Head term for the output. |
| `spritesheet` | 587 | Export format, main spelling. |
| `sprite-sheet` | 154 | Export format, hyphenated spelling. |
| `particle-system` | 418 | Core engine capability. |
| `game-assets` | 352 | Asset-pipeline discovery. |
| `sprite-animation` | 301 | What the exports are used for. |
| `particle-effects` | 125 | Long-tail niche term. |

Deliberately excluded: `hacktoberfest` (seasonal, and implies program membership), `game-engine` / `godot` / `unity` (you are not an engine or plugin — wrong-intent traffic that inflates bounces), `image-editor` (not a general editor), plus `generator`, `assets`, `gif` (too generic to convert browsers into users).

---

## 4. How to apply (repository settings require admin permission)

The sandbox token used for this audit can push code but cannot write repository settings, so apply these with your own account — or run:

```bash
gh repo edit GameDev-Toolkit/pixel-ability-fx-forge \
  --description "✨ Browser-based pixel art VFX generator for game developers: design animated spell, impact, barrier, and aura effects from 48 formations, 10 element palettes, and reproducible seeds, then export sprite sheets, PNG sequences, or transparent GIFs. No backend or build step."

gh api --method PUT repos/GameDev-Toolkit/pixel-ability-fx-forge/topics \
  -f "names[]=pixel-art" -f "names[]=pixelart" -f "names[]=gamedev" \
  -f "names[]=game-development" -f "names[]=vfx" -f "names[]=particle-system" \
  -f "names[]=particle-effects" -f "names[]=sprite-sheet" -f "names[]=spritesheet" \
  -f "names[]=sprite-animation" -f "names[]=animation" -f "names[]=game-assets" \
  -f "names[]=procedural-generation" -f "names[]=html5-canvas" -f "names[]=canvas" \
  -f "names[]=canvas2d" -f "names[]=javascript" -f "names[]=browser-tool" \
  -f "names[]=no-build" -f "names[]=contributions-welcome"
```

Then, on the repository page: **Settings → General → Social preview → Upload image** → `assets/social-preview.png` (1280×640, generated in this audit). This is the image every Slack/X/Discord/GitHub share of the repo renders — with none set, shares currently show a blank grey card.

---

## 5. Blocking issues found and fixed in this audit

These mattered more than any copy: they broke real links and one was a public-facing bug.

1. **Dead org in 10 places (fixed).** The org `GamingToolset` does not exist (HTTP 404). Every GitHub link in `README.md`, `index.html`, and `website/index.html` was broken, including the clone command users copy and the star badge the README asks for. All rewritten to `GameDev-Toolkit`.
2. **Dead Pages URLs (fixed).** `gamingtoolset.github.io/...` → `gamedev-toolkit.github.io/...`, matching the live Pages build (`https://gamedev-toolkit.github.io/pixel-ability-fx-forge/`), which the Pages API confirms is deployed from `main` / root.
3. **Missing social/SEO metadata (fixed).** Added `canonical`, Open Graph, and Twitter-card tags with `summary_large_image` to both `index.html` and `website/index.html`, plus a keyword-carrying `<title>` and meta description. Shared links to the live app previously produced bare, image-less previews.
4. **New asset.** `assets/social-preview.png` + matching `.svg` source — a purpose-built 1280×640 card (dark pixel-art star burst, name, tagline, four feature chips) for the GitHub social preview and OG image.

### Still worth doing (needs your action)

- **Add a demo GIF to the README above the fold.** Star conversion on visual tools is driven by one thing: showing the output. Export a 4–5 second looping GIF from the forge itself (GIF export at 24 FPS, 256×256) and place it directly under the intro line. A README with a moving preview reliably outperforms a static banner.
- **Cut a `v1.0.0` release.** Releases get their own page, show up in `releases` search, and give the README a stable link target.
- **Add `wiki`/discussion or Issues templates** — `contributions-welcome` drives traffic to the repo, and visitors bounce if there is no obvious way to contribute. Issue templates materially raise first-PR conversion.
- **Consider renaming** to option 1 or 5 above and setting the GitHub *website* field (already correct: `https://gamedev-toolkit.github.io/pixel-ability-fx-forge/`).
- **The other four repos in the org have no description and no topics either** — the same wasted-visibility problem. The audit commands here transfer directly.

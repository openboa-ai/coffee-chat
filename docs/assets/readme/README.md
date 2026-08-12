# Coffee Chat README visual assets

This directory owns the selected production images for the public Coffee Chat
README. Rejected studies are not part of the asset set.

## Selected hero

| File                   | Size       | SHA-256                                                            |
| ---------------------- | ---------- | ------------------------------------------------------------------ |
| `coffee-chat-hero.png` | 1774 × 887 | `cb8211087ff8998119ac08a46e477c02d1c61b99e71fa1aadd63c62d78d21bfc` |

The two-cup composition signals a Coffee Chat without turning the hero into a
product diagram. It occupies the intended midpoint between realistic product
photography and flat geometric minimalism.

## Explanatory images

| File                        | Size       | SHA-256                                                            |
| --------------------------- | ---------- | ------------------------------------------------------------------ |
| `coffee-chat-judgment.png`  | 1576 × 998 | `cbed16b176522ba59e26f737f7f53856bc85e79329ecb575a8a7063172cfb165` |
| `coffee-chat-talk-work.png` | 1576 × 998 | `484484c8deda13d9c5ea426b4a4e417687584502364f618b02f306a80b67d5e8` |

The images separate generated illustration from deterministic typography. The
illustration layer provides only coffee objects, arrows, texture, and color.
[`source/compose_explanatory_images.py`](source/compose_explanatory_images.py)
adds every final label with the canonical physical Martian Grotesk font and
records the applied OpenBoa type tokens in
[`explanatory-images.audit.json`](explanatory-images.audit.json).

Regenerate both explanatory PNGs from the repository root:

```sh
python3.12 -m venv .readme-image-venv
.readme-image-venv/bin/python -m pip install \
  --require-hashes -r docs/assets/readme/source/requirements.txt
.readme-image-venv/bin/python \
  docs/assets/readme/source/compose_explanatory_images.py \
  --judgment-source docs/assets/readme/source/coffee-chat-judgment-illustration.png \
  --talk-work-source docs/assets/readme/source/coffee-chat-talk-work-illustration.png \
  --output-dir docs/assets/readme \
  --audit docs/assets/readme/explanatory-images.audit.json
```

The two `*-illustration.png` files are approved text-free ImageGen layers. The
composer does not alter their pixels beyond adding the deterministic copy.
`npm run readme:assets:verify` regenerates both images and their audit in a
temporary directory, then requires the same typography audit and decoded RGB
pixels as the committed artifacts. PNG compression bytes may differ across
operating systems while the rendered image remains identical.

## Brand basis

- Source system: `openboa-ai/openboa-brand-system`
- Reviewed release: `2026.08.12`
- Reviewed source commit: `315c64015135aa477e7e791b877b83bae8628a52`
- Dominant palette: Terracotta `#A64F3C`, Quiet Off-white `#F8F8F5`, and Blue
  Carbon `#111820`
- Product/editorial font: Martian Grotesk from the canonical physical
  `MartianGrotesk-wdth-wght.ttf` release file
- Font SHA-256:
  `f81807163c34ff754e6d915b0b59f76cca88332b67c45cfc7453ace5751ae912`
- Type tokens: `overline`, `body/lg`, and `heading/lg`; each token has one fixed
  size across both 1576 × 998 images, custom tracking applies only to stage
  labels, and full sentences retain native whole-string kerning
- Rendering environment: Pillow 12.3.0 installed from a hash-locked requirements
  file on CPython 3.12 (CI pins 3.12.7)
- Font license: OFL-1.1, stored next to the physical source file
- Production format: deterministic self-contained PNG

The hero contains no visible type. The explanatory image copy is deterministic;
ImageGen does not render it. No production image has a remote runtime
dependency, reused legacy pixel, or embedded availability claim. Runtime
availability remains owned by
[`../../product-boundaries.md`](../../product-boundaries.md).

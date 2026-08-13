# Coffee Chat README visual assets

This directory owns the selected production images for the public Coffee Chat
README. Rejected studies are not part of the asset set.

## Selected hero

| File                   | Size       | SHA-256                                                            |
| ---------------------- | ---------- | ------------------------------------------------------------------ |
| `coffee-chat-hero.png` | 1774 × 887 | `c08e8550fd9cf8423c2286cd46feeef81f41c4d40c844e534350bd00314d11b0` |

The two-cup composition signals a Coffee Chat without turning the hero into a
product diagram. It occupies the intended midpoint between realistic product
photography and flat geometric minimalism. The text-free ImageGen layer remains
preserved in `source/coffee-chat-hero-illustration.png`; the production title is
added with canonical OpenBoa typography.

## Explanatory images

| File                        | Size       | SHA-256                                                            |
| --------------------------- | ---------- | ------------------------------------------------------------------ |
| `coffee-chat-judgment.png`  | 1576 × 998 | `652c1889a2886f016a954591785b40efb951b22151f7c3568f8c77dc827d093b` |
| `coffee-chat-talk-work.png` | 1576 × 998 | `b07f50b2eafbd1bc97fcabc6441005c846996e6d2f01a2bd3cafbb938c558188` |

The images separate generated illustration from deterministic typography. The
illustration layer provides only coffee objects, arrows, texture, and color.
[`source/compose_explanatory_images.py`](source/compose_explanatory_images.py)
adds the hero title and every explanatory label with the canonical physical
Martian Grotesk font and records the applied OpenBoa type tokens in
[`explanatory-images.audit.json`](explanatory-images.audit.json).

Regenerate all three production PNGs from the repository root with the canonical
Linux renderer:

```sh
docker run --rm --platform linux/amd64 \
  --mount type=bind,src="$PWD",dst=/repo,readonly \
  --mount type=bind,src="$PWD/docs/assets/readme",dst=/out \
  --workdir /repo \
  python:3.12.7-slim-bookworm@sha256:1c44018d7eb40488f29e7c6ad4991d3200507e14dca71b94fe61011815e98155 \
  sh -euc 'PIP_ROOT_USER_ACTION=ignore python -m pip install \
    --disable-pip-version-check --no-cache-dir \
    --require-hashes -r docs/assets/readme/source/requirements.txt >/dev/null && \
    python docs/assets/readme/source/compose_explanatory_images.py \
      --hero-source docs/assets/readme/source/coffee-chat-hero-illustration.png \
      --judgment-source docs/assets/readme/source/coffee-chat-judgment-illustration.png \
      --talk-work-source docs/assets/readme/source/coffee-chat-talk-work-illustration.png \
      --output-dir /out --audit /out/explanatory-images.audit.json'
```

The three `*-illustration.png` files are approved text-free ImageGen layers. The
composer does not alter their pixels beyond adding the deterministic copy.
`npm run readme:assets:verify` is the offline PR gate: it checks each committed
PNG's format, dimensions, and SHA-256 against the reviewed audit without a
network call. `npm run readme:assets:reproduce` is the explicit maintainer
check: it regenerates all three images in the digest-pinned renderer and
requires exact PNG and audit bytes. Host font libraries and PNG encoders cannot
silently change the result.

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
- Type tokens: `display/2xl` for the hero plus `overline`, `body/lg`, and
  `heading/lg` for the explanatory images; each explanatory token has one fixed
  size across both 1576 × 998 images, tracked display and stage labels use their
  canonical tracking, and full sentences retain native whole-string kerning
- Rendering environment: Pillow 12.3.0 installed from a hash-locked wheel in the
  digest-pinned `python:3.12.7-slim-bookworm` Linux image
- Font license: OFL-1.1, stored next to the physical source file
- Production format: deterministic self-contained PNG

The hero title and explanatory copy are deterministic; ImageGen does not render
them. No production image has a remote runtime dependency, reused legacy pixel,
or embedded availability claim. Runtime availability remains owned by
[`../../product-boundaries.md`](../../product-boundaries.md).

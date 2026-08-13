#!/usr/bin/env python3
"""Compose Coffee Chat README illustrations with canonical OpenBoa type."""

from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, PngImagePlugin, __version__ as PILLOW_VERSION


EXPLANATORY_CANVAS = (1576, 998)
HERO_CANVAS = (1774, 887)
CARBON = "#111820"
FONT_SHA256 = "f81807163c34ff754e6d915b0b59f76cca88332b67c45cfc7453ace5751ae912"
EXPECTED_PILLOW_VERSION = "12.3.0"
SOURCE_COMMIT = "315c64015135aa477e7e791b877b83bae8628a52"
SCALE = EXPLANATORY_CANVAS[0] / 1200
HERO_SCALE = HERO_CANVAS[0] / 1200


@dataclass(frozen=True)
class TypeStyle:
    token: str
    size: int
    weight: int
    width: int
    tracking: float


STYLES = {
    "hero-title": TypeStyle(
        "ref.typography.styles.display.2xl", round(104 * HERO_SCALE), 550, 96, -0.025
    ),
    "overline": TypeStyle(
        "ref.typography.styles.overline", round(32 * SCALE), 650, 100, 0.08
    ),
    "body": TypeStyle(
        "ref.typography.styles.body.lg", round(15 * SCALE), 450, 100, 0.0
    ),
    "heading": TypeStyle(
        "ref.typography.styles.heading.lg", round(27 * SCALE), 550, 96, 0.0
    ),
}

EXPECTED_COPY = {
    "hero": ["COFFEE CHAT"],
    "judgment": [
        "ORIGIN",
        "ROAST",
        "BEAN",
        "The source",
        "Meaning · Priority · Next move",
        "Your reviewed judgment",
        "Same source. Different meaning. Different next move.",
    ],
    "talk-work": [
        "BEANS",
        "BREW",
        "COFFEE",
        "Reviewed judgments",
        "Select what matters now",
        "Talk · Work",
        "The same Beans ground Talk and Work.",
    ],
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def font(font_path: Path, style: TypeStyle) -> ImageFont.FreeTypeFont:
    selected = ImageFont.truetype(str(font_path), style.size)
    axes = {axis["name"].decode("ascii"): index for index, axis in enumerate(selected.get_variation_axes())}
    values = [axis["default"] for axis in selected.get_variation_axes()]
    values[axes["Weight"]] = style.weight
    values[axes["Width"]] = style.width
    selected.set_variation_by_axes(values)
    return selected


def tracked_width(
    draw: ImageDraw.ImageDraw,
    value: str,
    selected: ImageFont.FreeTypeFont,
    tracking: float,
    size: int,
) -> float:
    if not value:
        return 0
    return sum(draw.textlength(character, font=selected) for character in value) + max(
        0, len(value) - 1
    ) * tracking * size


def draw_tracked(
    draw: ImageDraw.ImageDraw,
    value: str,
    center_x: int,
    top: int,
    selected: ImageFont.FreeTypeFont,
    style: TypeStyle,
    paint: str = CARBON,
) -> tuple[int, int, int, int]:
    width = tracked_width(draw, value, selected, style.tracking, style.size)
    cursor = center_x - width / 2
    boxes = []
    for character in value:
        draw.text((round(cursor), top), character, font=selected, fill=paint, anchor="lt")
        box = draw.textbbox((round(cursor), top), character or " ", font=selected, anchor="lt")
        boxes.append(box)
        cursor += draw.textlength(character, font=selected) + style.tracking * style.size
    return (
        min(box[0] for box in boxes),
        min(box[1] for box in boxes),
        max(box[2] for box in boxes),
        max(box[3] for box in boxes),
    )


def draw_centered(
    draw: ImageDraw.ImageDraw,
    value: str,
    center_x: int,
    top: int,
    selected: ImageFont.FreeTypeFont,
    paint: str = CARBON,
) -> tuple[int, int, int, int]:
    box = draw.textbbox((0, 0), value, font=selected, anchor="lt")
    x = round(center_x - (box[2] - box[0]) / 2)
    draw.text((x, top), value, font=selected, fill=paint, anchor="lt")
    return draw.textbbox((x, top), value, font=selected, anchor="lt")


def validate_box(
    box: tuple[int, int, int, int], role: str, canvas: tuple[int, int]
) -> None:
    left, top, right, bottom = box
    if left < 48 or right > canvas[0] - 48 or top < 0 or bottom > canvas[1]:
        raise OverflowError(f"{role} outside safe area: {box}")


def compose_hero(source: Path, output: Path, font_path: Path) -> dict[str, object]:
    image = Image.open(source).convert("RGB")
    if image.size != HERO_CANVAS:
        raise ValueError(f"unexpected source size for {source}: {image.size}")
    draw = ImageDraw.Draw(image)
    style = STYLES["hero-title"]
    selected = font(font_path, style)
    line_height = round(style.size * 68 / 64)
    first_top = round((HERO_CANVAS[1] - line_height * 2) / 2)
    boxes = [
        draw_tracked(
            draw,
            "COFFEE",
            HERO_CANVAS[0] // 2,
            first_top,
            selected,
            style,
        ),
        draw_tracked(
            draw,
            "CHAT",
            HERO_CANVAS[0] // 2,
            first_top + line_height,
            selected,
            style,
        ),
    ]
    box = (
        min(item[0] for item in boxes),
        min(item[1] for item in boxes),
        max(item[2] for item in boxes),
        max(item[3] for item in boxes),
    )
    validate_box(box, "COFFEE CHAT", HERO_CANVAS)
    records = [
        {
            "text": "COFFEE CHAT",
            "role": "hero-title",
            "token": style.token,
            "font": font_path.name,
            "font_size": style.size,
            "axes": {"wght": style.weight, "wdth": style.width},
            "tracking_em": style.tracking,
            "shaping": "custom-tracked-glyphs",
            "paint": CARBON,
            "layout": "stacked-center",
            "bounds": list(box),
        }
    ]

    metadata = PngImagePlugin.PngInfo()
    metadata.add_text("Software", "Coffee Chat deterministic README composer")
    metadata.add_text("Font", font_path.name)
    metadata.add_text("Font-SHA256", FONT_SHA256)
    metadata.add_text("OpenBoa-Source-Commit", SOURCE_COMMIT)
    image.save(output, format="PNG", optimize=False, pnginfo=metadata)
    return {
        "kind": "hero",
        "source": source.name,
        "output": f"docs/assets/readme/{output.name}",
        "canvas": list(HERO_CANVAS),
        "font": font_path.name,
        "font_sha256": sha256(font_path),
        "pillow_version": PILLOW_VERSION,
        "openboa_source_commit": SOURCE_COMMIT,
        "copy": EXPECTED_COPY["hero"],
        "records": records,
        "output_sha256": sha256(output),
    }


def compose(kind: str, source: Path, output: Path, font_path: Path) -> dict[str, object]:
    image = Image.open(source).convert("RGB")
    if image.size != EXPLANATORY_CANVAS:
        raise ValueError(f"unexpected source size for {source}: {image.size}")
    draw = ImageDraw.Draw(image)
    records: list[dict[str, object]] = []

    def add(value: str, center: int, top: int, style_name: str, max_width: int | None = None) -> None:
        style = STYLES[style_name]
        selected = font(font_path, style)
        if style.tracking and max_width is None:
            box = draw_tracked(draw, value, center, top, selected, style)
        else:
            box = draw_centered(draw, value, center, top, selected)
        if max_width is not None and box[2] - box[0] > max_width:
            raise OverflowError(
                f"{style_name} copy exceeds {max_width}px at canonical size "
                f"{style.size}: {value} ({box[2] - box[0]}px)"
            )
        validate_box(box, value, EXPLANATORY_CANVAS)
        records.append(
            {
                "text": value,
                "role": style_name,
                "token": style.token,
                "font": font_path.name,
                "font_size": style.size,
                "axes": {"wght": style.weight, "wdth": style.width},
                "tracking_em": style.tracking,
                "shaping": (
                    "custom-tracked-glyphs"
                    if style_name == "overline"
                    else "native-whole-string"
                ),
                "paint": CARBON,
                "bounds": list(box),
            }
        )

    centers = (272, 788, 1300)
    if kind == "judgment":
        for value, center in zip(("ORIGIN", "ROAST", "BEAN"), centers):
            add(value, center, 615, "overline")
        for value, center in zip(
            (
                "The source",
                "Meaning · Priority · Next move",
                "Your reviewed judgment",
            ),
            centers,
        ):
            add(value, center, 697, "body", 390)
        add(
            EXPECTED_COPY[kind][-1],
            EXPLANATORY_CANVAS[0] // 2,
            850,
            "heading",
            1370,
        )
    elif kind == "talk-work":
        for value, center in zip(("BEANS", "BREW", "COFFEE"), centers):
            add(value, center, 615, "overline")
        for value, center in zip(
            (
                "Reviewed judgments",
                "Select what matters now",
                "Talk · Work",
            ),
            centers,
        ):
            add(value, center, 697, "body", 390)
        add(
            EXPECTED_COPY[kind][-1],
            EXPLANATORY_CANVAS[0] // 2,
            850,
            "heading",
            1370,
        )
    else:
        raise ValueError(f"unsupported image kind: {kind}")

    actual_copy = [record["text"] for record in records]
    expected_copy = EXPECTED_COPY[kind]
    if actual_copy != expected_copy:
        raise AssertionError(f"copy mismatch for {kind}: {actual_copy}")

    metadata = PngImagePlugin.PngInfo()
    metadata.add_text("Software", "Coffee Chat deterministic README composer")
    metadata.add_text("Font", font_path.name)
    metadata.add_text("Font-SHA256", FONT_SHA256)
    metadata.add_text("OpenBoa-Source-Commit", SOURCE_COMMIT)
    image.save(output, format="PNG", optimize=False, pnginfo=metadata)
    return {
        "kind": kind,
        "source": source.name,
        "output": f"docs/assets/readme/{output.name}",
        "canvas": list(EXPLANATORY_CANVAS),
        "font": font_path.name,
        "font_sha256": sha256(font_path),
        "pillow_version": PILLOW_VERSION,
        "openboa_source_commit": SOURCE_COMMIT,
        "copy": actual_copy,
        "records": records,
        "output_sha256": sha256(output),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--hero-source", required=True, type=Path)
    parser.add_argument("--judgment-source", required=True, type=Path)
    parser.add_argument("--talk-work-source", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--audit", required=True, type=Path)
    args = parser.parse_args()

    if PILLOW_VERSION != EXPECTED_PILLOW_VERSION:
        raise RuntimeError(
            f"Pillow {EXPECTED_PILLOW_VERSION} is required; found {PILLOW_VERSION}"
        )

    font_path = Path(__file__).with_name("MartianGrotesk-wdth-wght.ttf")
    if sha256(font_path) != FONT_SHA256:
        raise ValueError("canonical Martian Grotesk digest mismatch")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    results = [
        compose_hero(
            args.hero_source,
            args.output_dir / "coffee-chat-hero.png",
            font_path,
        ),
        compose(
            "judgment",
            args.judgment_source,
            args.output_dir / "coffee-chat-judgment.png",
            font_path,
        ),
        compose(
            "talk-work",
            args.talk_work_source,
            args.output_dir / "coffee-chat-talk-work.png",
            font_path,
        ),
    ]
    args.audit.write_text(json.dumps({"images": results}, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

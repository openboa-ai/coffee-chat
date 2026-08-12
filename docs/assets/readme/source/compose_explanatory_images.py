#!/usr/bin/env python3
"""Compose Coffee Chat README illustrations with canonical OpenBoa type."""

from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, PngImagePlugin, __version__ as PILLOW_VERSION


CANVAS = (1576, 998)
CARBON = "#111820"
FONT_SHA256 = "f81807163c34ff754e6d915b0b59f76cca88332b67c45cfc7453ace5751ae912"
EXPECTED_PILLOW_VERSION = "12.3.0"
SOURCE_COMMIT = "315c64015135aa477e7e791b877b83bae8628a52"
SCALE = CANVAS[0] / 1200


@dataclass(frozen=True)
class TypeStyle:
    token: str
    size: int
    weight: int
    width: int
    tracking: float


STYLES = {
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
    "judgment": [
        "ORIGIN",
        "What you received",
        "ROAST",
        "Review what it means to you",
        "BEAN",
        "Your judgment, on record",
        "The same source can mean something different to each person.",
    ],
    "talk-work": [
        "BEANS",
        "Your reviewed judgments",
        "BREW",
        "Select and apply what matters",
        "COFFEE",
        "Talk and Work, grounded in them",
        "Your priorities can now travel into conversation and Agent work.",
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
) -> tuple[int, int, int, int]:
    width = tracked_width(draw, value, selected, style.tracking, style.size)
    cursor = center_x - width / 2
    boxes = []
    for character in value:
        draw.text((round(cursor), top), character, font=selected, fill=CARBON, anchor="lt")
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
) -> tuple[int, int, int, int]:
    box = draw.textbbox((0, 0), value, font=selected, anchor="lt")
    x = round(center_x - (box[2] - box[0]) / 2)
    draw.text((x, top), value, font=selected, fill=CARBON, anchor="lt")
    return draw.textbbox((x, top), value, font=selected, anchor="lt")


def validate_box(box: tuple[int, int, int, int], role: str) -> None:
    left, top, right, bottom = box
    if left < 48 or right > CANVAS[0] - 48 or top < 0 or bottom > CANVAS[1]:
        raise OverflowError(f"{role} outside safe area: {box}")


def compose(kind: str, source: Path, output: Path, font_path: Path) -> dict[str, object]:
    image = Image.open(source).convert("RGB")
    if image.size != CANVAS:
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
        validate_box(box, value)
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
                "What you received",
                "Review what it means to you",
                "Your judgment, on record",
            ),
            centers,
        ):
            add(value, center, 697, "body", 390)
        add(EXPECTED_COPY[kind][-1], CANVAS[0] // 2, 850, "heading", 1370)
    elif kind == "talk-work":
        for value, center in zip(("BEANS", "BREW", "COFFEE"), centers):
            add(value, center, 615, "overline")
        for value, center in zip(
            (
                "Your reviewed judgments",
                "Select and apply what matters",
                "Talk and Work, grounded in them",
            ),
            centers,
        ):
            add(value, center, 697, "body", 390)
        add(EXPECTED_COPY[kind][-1], CANVAS[0] // 2, 850, "heading", 1370)
    else:
        raise ValueError(f"unsupported image kind: {kind}")

    actual_copy = [record["text"] for record in records]
    expected_copy = (
        [
            "ORIGIN",
            "ROAST",
            "BEAN",
            "What you received",
            "Review what it means to you",
            "Your judgment, on record",
            "The same source can mean something different to each person.",
        ]
        if kind == "judgment"
        else [
            "BEANS",
            "BREW",
            "COFFEE",
            "Your reviewed judgments",
            "Select and apply what matters",
            "Talk and Work, grounded in them",
            "Your priorities can now travel into conversation and Agent work.",
        ]
    )
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
        "canvas": list(CANVAS),
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

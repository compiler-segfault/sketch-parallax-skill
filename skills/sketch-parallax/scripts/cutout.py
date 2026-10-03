#!/usr/bin/env python3
"""Prepare transparent subjects and review previews before ink layering.

Opaque inputs use a local rembg model. Existing alpha or an explicit mask takes
priority, so manually corrected cutouts can be passed through unchanged.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps


def subject_from_source(source: Path, mask_path: Path | None, session: object | None) -> tuple[Image.Image, str]:
    original = ImageOps.exif_transpose(Image.open(source)).convert("RGBA")
    if mask_path is not None:
        mask_image = ImageOps.exif_transpose(Image.open(mask_path))
        if mask_image.size != original.size:
            raise ValueError(f"mask size {mask_image.size} differs from {source.name} {original.size}")
        if mask_image.mode == "RGBA" and mask_image.getchannel("A").getextrema()[0] < 255:
            mask = mask_image.getchannel("A")
        else:
            mask = mask_image.convert("L")
        original.putalpha(mask)
        return original, f"mask:{mask_path}"
    if original.getchannel("A").getextrema()[0] < 255:
        return original, "existing-alpha"
    if session is None:
        raise RuntimeError("opaque input needs rembg; install requirements-cutout.txt or provide an RGBA PNG / --masks")
    from rembg import remove

    predicted = remove(original.convert("RGB"), session=session).convert("RGBA")
    cutout = original.copy()
    cutout.putalpha(predicted.getchannel("A").point(lambda v: 0 if v < 3 else v))
    return cutout, "automatic-rembg"


def checkerboard(size: tuple[int, int], cell: int = 24) -> Image.Image:
    image = Image.new("RGB", size, (238, 238, 238))
    draw = ImageDraw.Draw(image)
    width, height = size
    for y in range(0, height, cell):
        for x in range(0, width, cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, min(x + cell - 1, width), min(y + cell - 1, height)), fill=(202, 202, 202))
    return image


def save_previews(cutout: Image.Image, stem: Path) -> None:
    preview = ImageOps.contain(cutout, (768, 768), Image.Resampling.LANCZOS)
    for label, background in (
        ("checker", checkerboard(preview.size)),
        ("light", Image.new("RGB", preview.size, (250, 247, 240))),
        ("dark", Image.new("RGB", preview.size, (39, 43, 53))),
    ):
        background.paste(preview, (0, 0), preview.getchannel("A"))
        background.save(stem.with_name(stem.name + f"-{label}.jpg"), quality=92)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input", nargs="+", type=Path, required=True, help="photos, drawings, or RGBA PNGs")
    ap.add_argument("--masks", nargs="+", type=Path, help="optional edited grayscale/alpha masks, one per input")
    ap.add_argument("--out-dir", type=Path, required=True)
    ap.add_argument("--model", default="isnet-general-use", help="rembg model for opaque inputs; choose for actual subject, not file type")
    args = ap.parse_args()
    if args.masks and len(args.masks) != len(args.input):
        ap.error("--masks must match --input")
    args.out_dir.mkdir(parents=True, exist_ok=True)
    needs_model = any(
        not args.masks and ImageOps.exif_transpose(Image.open(path)).convert("RGBA").getchannel("A").getextrema()[0] == 255
        for path in args.input
    )
    session = None
    if needs_model:
        try:
            from rembg import new_session
        except ImportError as exc:
            raise SystemExit("Opaque images need rembg. Use Python 3.11+ and install requirements-cutout.txt, or provide RGBA PNG / --masks.") from exc
        session = new_session(args.model)
    records = []
    for index, source in enumerate(args.input):
        mask = args.masks[index] if args.masks else None
        cutout, method = subject_from_source(source, mask, session)
        alpha = cutout.getchannel("A")
        coverage = sum(alpha.histogram()[128:]) / (alpha.width * alpha.height)
        if coverage < .005:
            raise ValueError(f"{source}: empty subject mask; choose another model or provide an edited mask")
        if alpha.getextrema()[0] == 255:
            raise ValueError(f"{source}: no transparent background was produced; choose another model or provide an edited mask")
        output = args.out_dir / f"{index+1:02d}-{source.stem}-cutout.png"
        cutout.save(output, optimize=True)
        save_previews(cutout, output.with_suffix(""))
        record = {"source": str(source.resolve()), "cutout": str(output.resolve()), "method": method,
                  "model": args.model if method == "automatic-rembg" else None,
                  "size": list(cutout.size), "coverage": round(coverage, 4)}
        records.append(record)
        print(f"{output} · {method} · coverage {coverage:.1%}")
    (args.out_dir / "cutouts.json").write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()

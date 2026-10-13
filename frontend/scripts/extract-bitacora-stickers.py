"""Separa láminas de stickers en PNG individuales con transparencia."""

from __future__ import annotations

import json
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "bitacora" / "stickers"
SHEET = Path(r"C:\Users\julia\.cursor\projects\c-Users-julia-Desktop-entre-caminos\assets")

SOURCES = [
    (
        "viaje",
        SHEET
        / "c__Users_julia_AppData_Roaming_Cursor_User_workspaceStorage_6425880da865af2754b77b99cb825f17_images_image-3976da70-584b-48ba-9425-e14ed07a9194.jpg",
    ),
    (
        "papel",
        SHEET
        / "c__Users_julia_AppData_Roaming_Cursor_User_workspaceStorage_6425880da865af2754b77b99cb825f17_images_image-616df6bf-7bd1-487f-86d1-e52967c1bf87.jpg",
    ),
]


def flood_background(rgb: np.ndarray, threshold: int = 32) -> np.ndarray:
    height, width = rgb.shape[:2]
    dark = rgb.max(axis=2) < threshold
    background = np.zeros((height, width), dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    def seed(y: int, x: int) -> None:
        if dark[y, x] and not background[y, x]:
            background[y, x] = True
            queue.append((y, x))

    for x in range(width):
        seed(0, x)
        seed(height - 1, x)
    for y in range(height):
        seed(y, 0)
        seed(y, width - 1)

    while queue:
        y, x = queue.popleft()
        if y > 0 and dark[y - 1, x] and not background[y - 1, x]:
            background[y - 1, x] = True
            queue.append((y - 1, x))
        if y + 1 < height and dark[y + 1, x] and not background[y + 1, x]:
            background[y + 1, x] = True
            queue.append((y + 1, x))
        if x > 0 and dark[y, x - 1] and not background[y, x - 1]:
            background[y, x - 1] = True
            queue.append((y, x - 1))
        if x + 1 < width and dark[y, x + 1] and not background[y, x + 1]:
            background[y, x + 1] = True
            queue.append((y, x + 1))
    return background


def label_foreground(foreground: np.ndarray) -> tuple[np.ndarray, int]:
    # Separa ilustraciones que solo se rozan, sin comerse el borde final.
    core = ndimage.binary_erosion(foreground, iterations=2)
    labels, count = ndimage.label(core)
    grown = np.zeros_like(labels)
    for label_id in range(1, count + 1):
        piece = ndimage.binary_dilation(labels == label_id, iterations=2)
        grown[piece & foreground & (grown == 0)] = label_id
    return grown, count


def soften_edges(rgb: np.ndarray, background: np.ndarray) -> np.ndarray:
    alpha = np.where(background, 0, 255).astype(np.uint8)
    height, width = background.shape
    fringe = np.zeros_like(background)
    fringe[1:] |= background[:-1]
    fringe[:-1] |= background[1:]
    fringe[:, 1:] |= background[:, :-1]
    fringe[:, :-1] |= background[:, 1:]
    luma = rgb.mean(axis=2)
    edge = fringe & ~background & (luma < 48)
    alpha[edge] = np.clip(luma[edge] * 5, 0, 255).astype(np.uint8)
    return alpha


def extract(prefix: str, path: Path) -> list[dict[str, object]]:
    image = Image.open(path).convert("RGB")
    rgb = np.asarray(image)
    background = flood_background(rgb)
    labels, count = label_foreground(~background)
    items: list[dict[str, object]] = []
    index = 1
    for label_id in range(1, count + 1):
        ys, xs = np.where(labels == label_id)
        if len(xs) < 420:
            continue
        top, bottom = int(ys.min()), int(ys.max())
        left, right = int(xs.min()), int(xs.max())
        if bottom - top < 28 or right - left < 28:
            continue
        pad = 6
        top = max(0, top - pad)
        left = max(0, left - pad)
        bottom = min(rgb.shape[0] - 1, bottom + pad)
        right = min(rgb.shape[1] - 1, right + pad)
        crop_rgb = rgb[top : bottom + 1, left : right + 1]
        crop_alpha = soften_edges(crop_rgb, background[top : bottom + 1, left : right + 1])
        if int((crop_alpha > 16).sum()) < 900:
            continue
        rgba = np.dstack([crop_rgb, crop_alpha])
        filename = f"{prefix}-{index:02d}.png"
        Image.fromarray(rgba, "RGBA").save(OUT / filename, optimize=True)
        items.append(
            {
                "id": f"{prefix}-{index:02d}",
                "file": filename,
                "w": int(right - left + 1),
                "h": int(bottom - top + 1),
                "x": left,
                "y": top,
            }
        )
        index += 1
    return items


def contact_sheet(items: list[dict[str, object]], name: str) -> None:
    thumbs: list[Image.Image] = []
    for item in items:
        image = Image.open(OUT / str(item["file"])).convert("RGBA")
        image.thumbnail((140, 140))
        plate = Image.new("RGBA", (150, 168), (244, 239, 228, 255))
        plate.paste(image, ((150 - image.width) // 2, 8), image)
        thumbs.append(plate)
    if not thumbs:
        return
    columns = 8
    rows = (len(thumbs) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * 150, rows * 168), (244, 239, 228))
    for index, thumb in enumerate(thumbs):
        sheet.paste(thumb, ((index % columns) * 150, (index // columns) * 168), thumb)
    sheet.save(OUT / name, quality=85)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for stale in OUT.glob("*.png"):
        stale.unlink()
    catalog: list[dict[str, object]] = []
    for prefix, path in SOURCES:
        if not path.exists():
            raise SystemExit(f"No está la lámina: {path}")
        items = extract(prefix, path)
        catalog.extend(items)
        print(prefix, len(items))
    (OUT / "_manifest.json").write_text(json.dumps(catalog, indent=2), encoding="utf-8")
    contact_sheet(catalog, "_contact.jpg")
    print("total", len(catalog))


if __name__ == "__main__":
    main()

"""Generate Entre Caminos logo favicons with a transparent background."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
LOGO_PATH = ROOT / "src" / "assets" / "logo.png"
PUBLIC_DIR = ROOT / "public"
ASSETS_DIR = ROOT / "src" / "assets"
TRANSPARENT = (0, 0, 0, 0)
APPLE_IVORY = (250, 247, 241, 255)


def alpha_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    alpha = img.split()[3]
    return alpha.getbbox() or (0, 0, img.width, img.height)


def make_favicon(
    cropped: Image.Image,
    size: int,
    fill_ratio: float,
    background: tuple[int, int, int, int],
) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), background)
    target = max(1, int(round(size * fill_ratio)))
    scale = target / max(cropped.width, cropped.height)
    new_w = max(1, int(round(cropped.width * scale)))
    new_h = max(1, int(round(cropped.height * scale)))
    resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
    x = (size - new_w) // 2
    y = (size - new_h) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas


def main() -> None:
    logo = Image.open(LOGO_PATH).convert("RGBA")
    cropped = logo.crop(alpha_bbox(logo))
    print(f"Logo size: {logo.size}, cropped: {cropped.size}")

    outputs: list[tuple[str, int, float, tuple[int, int, int, int]]] = [
        ("favicon-16x16.png", 16, 1.0, TRANSPARENT),
        ("favicon-32x32.png", 32, 1.0, TRANSPARENT),
        ("favicon-48x48.png", 48, 1.0, TRANSPARENT),
        ("favicon-64x64.png", 64, 1.0, TRANSPARENT),
        ("favicon-192x192.png", 192, 1.0, TRANSPARENT),
        ("favicon.png", 256, 1.0, TRANSPARENT),
        ("apple-touch-icon.png", 180, 0.92, APPLE_IVORY),
    ]

    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    png_by_size: dict[int, Image.Image] = {}
    for filename, size, fill_ratio, background in outputs:
        img = make_favicon(cropped, size, fill_ratio, background)
        png_by_size[size] = img
        public_path = PUBLIC_DIR / filename
        img.save(public_path, format="PNG", optimize=True)
        print(f"Wrote {public_path}")
        assets_path = ASSETS_DIR / filename
        if assets_path.exists() or filename.startswith("favicon-"):
            img.save(assets_path, format="PNG", optimize=True)
            print(f"Wrote {assets_path}")

    ico_path = PUBLIC_DIR / "favicon.ico"
    png_by_size[32].save(ico_path, format="ICO", sizes=[(32, 32)])
    print(f"Wrote {ico_path}")


if __name__ == "__main__":
    main()

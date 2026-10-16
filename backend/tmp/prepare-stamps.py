"""Quita el blanco exterior de las estampitas. Conserva el crema y el borde verde."""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

SOURCE = Path(r"C:\Users\julia\AppData\Roaming\Cursor\User\workspaceStorage\6425880da865af2754b77b99cb825f17\images")
OUT = Path(__file__).resolve().parent / "stamps"

FILES = {
    "exp-001-tour-guatape.png": "image-2e8177a1-b2a6-42a9-bd52-e90e7ab370f1.jpg",
    "exp-002-enigma-escape-room.png": "image-1abc4cab-5323-4764-a0e3-8f4058706f35.jpg",
    "exp-003-tour-del-cafe.png": "image-49698048-4cc2-4e75-b018-f5596294b85c.jpg",
    "exp-004-candlelight.png": "image-0cfb11c8-0a16-4ff5-be50-3c9992c6d9fe.jpg",
    "exp-005-carrera-de-las-rosas.png": "image-b36da31d-1f39-4cfd-8289-8285db390733.jpg",
    "exp-006-taller-de-pasta.png": "image-92dabc12-0719-42a9-a8eb-2b6826769eca.jpg",
    "exp-007-cadmiel-candle-bar.png": "image-746468e1-afd4-43be-aa2a-ea121f0d65e6.jpg",
    "exp-008-taller-de-flores.png": "image-403cf889-7a15-437c-8012-e063af402fbf.jpg",
    "exp-009-tour-de-las-abejas.png": "image-fbc5cf17-2ec6-431d-8769-e7a7bcbceb46.jpg",
    "exp-010-ceramica-artesanal.png": "image-1fbede87-02c0-4af2-8063-6188e2fb4acf.jpg",
    "exp-011-parapente.png": "image-27b4c7f7-db90-4271-8411-f721aa7eaf27.jpg",
    "exp-012-clase-de-salsa.png": "image-d7459788-f4fb-4776-90a2-1bb0615754a6.jpg",
    "exp-013-arte-urbano.png": "image-b655f8ad-8698-4fc4-9a5e-5e66eda5d321.jpg",
    "exp-014-taller-de-chocolate.png": "image-8c3c0c13-342f-42b3-8a34-e299450c512f.jpg",
    "exp-015-parque-arvi.png": "image-201f1131-77f3-41f7-8ed4-f1a2b4ada66e.jpg",
    "exp-016-aves-de-montana.png": "image-bea80b98-a971-4ba8-b5a1-c35a281df956.jpg",
    "exp-017-silletera.png": "image-bce125f3-de7f-4e8e-807b-6ca8347fb4c6.jpg",
    "exp-018-cabalgata.png": "image-152bb442-617f-455d-89d9-4c498c471b91.jpg",
    "exp-019-sabaneta-gourmet.png": "image-976ab84d-51cf-4fec-82e9-7a13c3e734e3.jpg",
}


def is_exterior(rgb: np.ndarray) -> np.ndarray:
    red = rgb[:, :, 0].astype(np.int16)
    green = rgb[:, :, 1].astype(np.int16)
    blue = rgb[:, :, 2].astype(np.int16)
    return (red >= 250) & (green >= 248) & (blue >= 246) & ((red - blue) <= 10) & ((green - blue) <= 8)


def flood(mask: np.ndarray) -> np.ndarray:
    labels, _ = ndimage.label(mask)
    seeds = {int(labels[0, 0]), int(labels[0, -1]), int(labels[-1, 0]), int(labels[-1, -1])}
    seeds.discard(0)
    if not seeds:
        return np.zeros(mask.shape, dtype=bool)
    return np.isin(labels, list(seeds))


def clear_neutral_islands(alpha_clear: np.ndarray, rgb: np.ndarray) -> np.ndarray:
    red = rgb[:, :, 0].astype(np.int16)
    green = rgb[:, :, 1].astype(np.int16)
    blue = rgb[:, :, 2].astype(np.int16)
    spread = np.maximum(np.maximum(red, green), blue) - np.minimum(np.minimum(red, green), blue)
    neutral = (red >= 236) & (green >= 236) & (blue >= 232) & (spread <= 14)
    current = alpha_clear.copy()
    for _ in range(48):
        neighbor = np.zeros_like(current)
        neighbor[1:, :] |= current[:-1, :]
        neighbor[:-1, :] |= current[1:, :]
        neighbor[:, 1:] |= current[:, :-1]
        neighbor[:, :-1] |= current[:, 1:]
        grown = neighbor & neutral & ~current
        if not grown.any():
            break
        current |= grown
    return current


def clean_halo(alpha_clear: np.ndarray, rgb: np.ndarray) -> np.ndarray:
    red = rgb[:, :, 0].astype(np.int16)
    green = rgb[:, :, 1].astype(np.int16)
    blue = rgb[:, :, 2].astype(np.int16)
    light = (red >= 242) & (green >= 240) & (blue >= 236) & ((red - blue) <= 16)
    current = alpha_clear.copy()
    for _ in range(2):
        neighbor = np.zeros_like(current)
        neighbor[1:, :] |= current[:-1, :]
        neighbor[:-1, :] |= current[1:, :]
        neighbor[:, 1:] |= current[:, :-1]
        neighbor[:, :-1] |= current[:, 1:]
        current |= neighbor & light & ~current
    return current


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, source_name in FILES.items():
        image = Image.open(SOURCE / source_name).convert("RGBA")
        pixels = np.array(image)
        rgb = pixels[:, :, :3]
        clear = clear_neutral_islands(clean_halo(flood(is_exterior(rgb)), rgb), rgb)
        pixels[clear, 3] = 0
        Image.fromarray(pixels, "RGBA").save(OUT / name, format="PNG", optimize=False)
        print(f"{name} {image.size[0]}x{image.size[1]} clear={int(clear.sum())} bytes={(OUT / name).stat().st_size}")


if __name__ == "__main__":
    main()

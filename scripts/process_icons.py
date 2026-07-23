"""
统一生成项目品牌图：透明底 + 紧裁 + 相同留白比例。

输出（均透明底、pad=10%）：
  icon.png         128×128  月兔图形（扩展 / 欢迎页 / 面板）
  icon-source.png  512×512  月兔图形高清源
  logo.png         512×512  月兔 + Kimi 字标（README / 品牌展示）
"""
from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

PROJECT = Path(__file__).resolve().parent.parent
SESSION = Path(
    r"C:\Users\shazhang20\.grok\sessions"
    r"\C%3A%5CUsers%5Cshazhang20%5CDocuments%5CRepositories%5CPersonal%5Ckimi%20usage"
    r"\019f8d82-c133-7651-aee6-7b2cd75efb49\images"
)

# 统一参数
PAD_RATIO = 0.10
ICON_SRC = SESSION / "1.jpg"  # 仅图形
LOGO_SRC = SESSION / "2.jpg"  # 图形 + 字标


def is_floodable(rgb: np.ndarray, max_lum: float = 36, white_thresh: int = 185) -> np.ndarray:
    """背景候选：黑 / 白 / 中性灰（保留月兔配色）。"""
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    chroma = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)

    near_white = (r >= white_thresh) & (g >= white_thresh) & (b >= white_thresh)
    near_black = lum <= max_lum
    neutral_gray = (chroma <= 16) & (lum < 250)

    cream = (r > 190) & (g > 170) & (b > 140) & (r > b + 15)
    purple = (b >= g - 5) & (b > 140) & (r > 90) & (r < 230) & (chroma > 12)

    return (near_black | near_white | neutral_gray) & (~cream) & (~purple)


def flood_background_mask(floodable: np.ndarray) -> np.ndarray:
    h, w = floodable.shape
    bg = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()

    def try_seed(y: int, x: int) -> None:
        if 0 <= y < h and 0 <= x < w and floodable[y, x] and not bg[y, x]:
            bg[y, x] = True
            q.append((y, x))

    for x in range(w):
        try_seed(0, x)
        try_seed(h - 1, x)
    for y in range(h):
        try_seed(y, 0)
        try_seed(y, w - 1)

    while q:
        y, x = q.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and floodable[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))
    return bg


def make_transparent_square(path: Path, pad_ratio: float = PAD_RATIO) -> Image.Image:
    """去底 + 紧裁 + 居中到正方形（统一风格）。"""
    im = Image.open(path).convert("RGBA")
    arr = np.array(im)
    rgb = arr[:, :, :3].astype(np.float32)

    floodable = is_floodable(rgb)
    bg = flood_background_mask(floodable)

    alpha = np.where(bg, 0, 255).astype(np.uint8)
    lum = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]
    edge = (~bg) & (lum < 45)
    soft = np.clip((lum / 45.0) * 255, 0, 255).astype(np.uint8)
    alpha = np.where(edge, soft, alpha)

    out = arr.copy()
    out[:, :, 3] = alpha
    out[alpha == 0, 0:3] = 0

    ys, xs = np.where(alpha > 12)
    if len(xs) == 0:
        raise RuntimeError(f"no content in {path}")
    minx, maxx = int(xs.min()), int(xs.max())
    miny, maxy = int(ys.min()), int(ys.max())
    cw, ch = maxx - minx + 1, maxy - miny + 1
    pad = max(4, int(max(cw, ch) * pad_ratio))
    print(f"  {path.name}: content {cw}x{ch} pad={pad}")

    side = max(cw, ch)
    out_side = side + 2 * pad
    canvas = np.zeros((out_side, out_side, 4), dtype=np.uint8)
    dx = (out_side - cw) // 2
    dy = (out_side - ch) // 2
    canvas[dy : dy + ch, dx : dx + cw] = out[miny : maxy + 1, minx : maxx + 1]
    result = Image.fromarray(canvas, "RGBA")
    print(f"  -> square {result.size}")
    return result


def save_square(im: Image.Image, size: int, path: Path) -> None:
    im.resize((size, size), Image.Resampling.LANCZOS).save(path, "PNG", optimize=True)
    print(f"Saved {path.name} ({size}x{size})")


def main() -> None:
    print(f"统一参数: 透明底, pad={PAD_RATIO:.0%}, 正方形")
    print()

    print("=== 月兔图形 ===")
    mark = make_transparent_square(ICON_SRC)
    save_square(mark, 128, PROJECT / "icon.png")
    save_square(mark, 512, PROJECT / "icon-source.png")

    print()
    print("=== 月兔 + Kimi 字标 ===")
    brand = make_transparent_square(LOGO_SRC)
    save_square(brand, 512, PROJECT / "logo.png")

    # 移除旧的非统一变体
    legacy = PROJECT / "logo-square.png"
    if legacy.exists():
        legacy.unlink()
        print(f"Removed legacy {legacy.name}")

    print()
    for name in ("icon.png", "icon-source.png", "logo.png"):
        p = PROJECT / name
        im = Image.open(p)
        a = np.array(im)
        opaque = float((a[:, :, 3] > 10).mean() * 100)
        print(
            f"  {name}: {im.size} cornerA={int(a[0,0,3])} opaque={opaque:.1f}%"
        )
    print("Done")


if __name__ == "__main__":
    main()

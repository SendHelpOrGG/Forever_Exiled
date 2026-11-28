#!/usr/bin/env python3
"""
Tab plates for the Atrium page on 8081, built from the supplied art.

The page grades every plate the same way (preview/designs/designs.css):

    .a-photo            opacity .7, over the palette's gradient wash
    .a-photo img        object-fit: cover
                        filter: grayscale(.86) saturate(.9) contrast(1.04) brightness(.95)
                        masked by a radial ellipse at 52% / 40% — solid in the middle, 30% at the rim
    .a-photo i          the palette's accent, mixed with mix-blend-mode: color at .26
    .a-photo b          a scrim that fades the bottom into the page background

So a plate is never shown as a photograph; it is graded down to a background. That grading strips 86 %
of the colour, so each plate is built to survive it: the saturation is raised here by roughly what the
stylesheet takes away, the crop puts the subject on the mask's solid core at 52% / 40 %, and the frame is
vignetted to near-black so the mask has something continuous to fade into.

CROPS are in fractions of the source image — (x, y, w, h) — so each plate states exactly which window of
its art it uses, rather than relying on a zoom factor whose meaning changes with the source's aspect.

    /path/to/python tools/make_tab_plates_art.py [--simulate]
"""

import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
TABS = ROOT / 'preview' / 'assets' / 'tabs'
SPLASH = ROOT / 'preview' / 'assets' / 'splash'

W, H = 1440, 810          # every plate in assets/splash is 1440×810
SAT_BOOST = 2.1           # the stylesheet keeps 14% of the colour; this puts some of it back
VIGNETTE = 0.85           # how far the corners fall toward the page background

# tab             source                              crop (x, y, w, h as fractions of the source)
PLATES = [
    ('watchers', TABS / 'watchers.jpg',                 (0.0568, 0.1870, 0.6818, 0.6815)),
    ('rare',     TABS / 'src' / 'rare-items.png',       (0.0000, 0.3150, 1.0000, 0.5625)),
]
OUT = {
    'watchers': SPLASH / 'tab_watchers_eye.jpg',
    'rare': SPLASH / 'tab_rare_items.jpg',
}


def plate(src, crop):
    img = Image.open(src).convert('RGB')
    x, y, w, h = crop
    box = (round(x * img.width), round(y * img.height),
           round((x + w) * img.width), round((y + h) * img.height))
    img = img.crop(box).resize((W, H), Image.LANCZOS)

    img = ImageEnhance.Color(img).enhance(SAT_BOOST)
    img = ImageEnhance.Contrast(img).enhance(1.06)

    # vignette: full brightness in an ellipse, falling to near-black at the corners, so the radial mask
    # on the page has something continuous to fade into instead of cutting a photo edge
    vig = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(vig)
    d.ellipse([-int(W * 0.16), -int(H * 0.26), int(W * 1.16), int(H * 1.26)], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(150))
    vig = vig.point(lambda v: int(255 * (1 - VIGNETTE) + v * VIGNETTE))
    return ImageChops.multiply(img, Image.merge('RGB', (vig, vig, vig)))


def simulate(img, path):
    """What the tab will look like once designs.css has graded it: the same steps, in order."""
    grey = img.convert('L')
    img = Image.blend(img, Image.merge('RGB', (grey, grey, grey)), 0.86)   # grayscale(.86)
    img = ImageEnhance.Color(img).enhance(0.9)                             # saturate(.9)
    img = ImageEnhance.Contrast(img).enhance(1.04)                         # contrast(1.04)
    img = ImageEnhance.Brightness(img).enhance(0.95)                       # brightness(.95)

    mask = Image.new('L', (W, H), 0)
    px = mask.load()
    cx, cy = W * 0.52, H * 0.40
    rx, ry = W * 0.46, H * 0.50
    for y in range(H):
        for x in range(W):
            t = (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2) ** 0.5
            if t <= 0.34:
                v = 1.0
            elif t <= 0.70:
                v = 1.0 - (t - 0.34) / 0.36 * 0.38
            else:
                v = 0.62 - min(1.0, (t - 0.70) / 0.30) * 0.32
            px[x, y] = int(max(0.0, min(1.0, v)) * 255)

    page = Image.new('RGB', (W, H), (12, 8, 16))
    img = Image.composite(img, page, mask)

    accent = Image.new('RGB', (W, H), (196, 64, 92))
    img = Image.blend(img, ImageChops.multiply(img, accent.point(lambda v: 128 + v // 2)), 0.13)

    scrim = Image.new('L', (W, H), 0)
    sd = ImageDraw.Draw(scrim)
    for y in range(H):
        f = y / H
        sd.line([(0, y), (W, y)], fill=int(255 * min(1.0, max(0.0, (f - 0.55) / 0.43)) * 0.9))
    img = Image.composite(page, img, scrim)
    Image.blend(page, img, 0.7).save(path)


def main():
    for tab, src, crop in PLATES:
        img = plate(src, crop)
        out = OUT[tab]
        img.save(out, quality=90, optimize=True)
        print(f'{out.name:24s} {img.size[0]}×{img.size[1]}  {out.stat().st_size // 1024} KB')
        if '--simulate' in sys.argv:
            simulate(img, f'/tmp/tab-sim-{tab}.png')
            print('   simulation -> /tmp/tab-sim-%s.png' % tab)


if __name__ == '__main__':
    main()

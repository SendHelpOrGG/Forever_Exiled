#!/usr/bin/env python3
"""
Watcher's Eye tab plate for the Atrium page on 8081.

The page treats every tab's picture the same way (preview/designs/designs.css):

    .a-photo            opacity .7, over the palette's gradient wash
    .a-photo img        object-fit: cover
                        filter: grayscale(.86) saturate(.9) contrast(1.04) brightness(.95)
                        masked by a radial ellipse at 52% / 40% — solid in the middle, 30% at the rim
    .a-photo i          the palette's accent, mixed with mix-blend-mode: color at .26
    .a-photo b          a scrim that fades the bottom into the page background

So the plate is not shown as a photograph; it is graded down to a background. That grading strips 86 %
of the colour, which would leave the eye a grey ball, so the plate is built to survive it: the saturation
is raised here by the same factor the stylesheet takes away, and the frame is vignetted to near-black at
the edges so the mask has something to fade into.

The eye sits at 41% / 47% of the frame, inside the mask's solid core (x 36–68%, y 23–57%), so it is
never dimmed by the ellipse.

    /path/to/python tools/make_watchers_tab.py [--simulate]
"""

import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'preview' / 'assets' / 'tabs' / 'watchers.jpg'
OUT = ROOT / 'preview' / 'assets' / 'splash' / 'tab_watchers_eye.jpg'

W, H = 1440, 810          # every plate in assets/splash is 1440×810
SAT_BOOST = 2.1           # the stylesheet keeps 14% of the colour; this puts some of it back
VIGNETTE = 0.85           # how far the corners fall toward the page background


# the eye sits at this point in the source picture — measured once, not guessed
EYE_IN_SRC = (0.4115, 0.4741)
EYE_IN_PLATE = (0.52, 0.40)   # the mask's solid core, where the page keeps the art brightest
ZOOM = 1.10


def plate():
    img = Image.open(SRC).convert('RGB')
    # zoom a little, then crop so the eye lands on the mask's core instead of drifting off it
    zw, zh = int(img.width * ZOOM), int(img.height * ZOOM)
    img = img.resize((zw, zh), Image.LANCZOS)
    x0 = int(EYE_IN_SRC[0] * zw - EYE_IN_PLATE[0] * W)
    y0 = int(EYE_IN_SRC[1] * zh - EYE_IN_PLATE[1] * H)
    x0 = max(0, min(zw - W, x0))
    y0 = max(0, min(zh - H, y0))
    img = img.crop((x0, y0, x0 + W, y0 + H))
    img = ImageEnhance.Color(img).enhance(SAT_BOOST)
    img = ImageEnhance.Contrast(img).enhance(1.06)

    # vignette: a soft ellipse of full brightness falling to near-black at the corners, so the radial
    # mask on the page has something continuous to fade into instead of cutting a photo edge
    vig = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(vig)
    d.ellipse([-int(W * 0.16), -int(H * 0.26), int(W * 1.16), int(H * 1.26)], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(150))
    vig = vig.point(lambda v: int(255 * (1 - VIGNETTE) + v * VIGNETTE))
    img = ImageChops.multiply(img, Image.merge('RGB', (vig, vig, vig)))
    return img


def simulate(path):
    """What the tab will look like once designs.css has graded it: the same steps, in order."""
    img = plate()

    img = img.convert('RGB')
    grey = img.convert('L')
    img = Image.blend(img, Image.merge('RGB', (grey, grey, grey)), 0.86)   # grayscale(.86)
    img = ImageEnhance.Color(img).enhance(0.9)                              # saturate(.9)
    img = ImageEnhance.Contrast(img).enhance(1.04)                          # contrast(1.04)
    img = ImageEnhance.Brightness(img).enhance(0.95)                        # brightness(.95)

    # the mask: solid to 34% of the ellipse, .62 at 70%, .3 at the rim
    mask = Image.new('L', (W, H), 0)
    px = mask.load()
    cx, cy = W * 0.52, H * 0.40
    rx, ry = W * 0.46, H * 0.50
    for y in range(H):
        for x in range(W):
            t = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            t = t ** 0.5
            if t <= 0.34:
                v = 1.0
            elif t <= 0.70:
                v = 1.0 - (t - 0.34) / 0.36 * 0.38
            else:
                v = 0.62 - min(1.0, (t - 0.70) / 0.30) * 0.32
            px[x, y] = int(max(0.0, min(1.0, v)) * 255)

    page = Image.new('RGB', (W, H), (12, 8, 16))
    img = Image.composite(img, page, mask)

    # the accent wash and the scrim, then the layer's own 70% opacity
    accent = Image.new('RGB', (W, H), (196, 64, 92))
    img = Image.blend(img, ImageChops.multiply(img, accent.point(lambda v: 128 + v // 2)), 0.26 * 0.5)
    scrim = Image.new('L', (W, H), 0)
    sd = ImageDraw.Draw(scrim)
    for y in range(H):
        f = y / H
        sd.line([(0, y), (W, y)], fill=int(255 * min(1.0, max(0.0, (f - 0.55) / 0.43)) * 0.9))
    img = Image.composite(page, img, scrim)
    img = Image.blend(page, img, 0.7)
    img.save(path)
    print('simulation ->', path)


def main():
    img = plate()
    img.save(OUT, quality=90, optimize=True)
    print(f'{OUT} {img.size} {OUT.stat().st_size // 1024} KB')
    if '--simulate' in sys.argv:
        simulate('/tmp/watchers-tab-sim.png')


if __name__ == '__main__':
    main()

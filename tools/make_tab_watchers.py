#!/usr/bin/env python3
"""
Watcher's Eye tab plate: the user's eye render, keyed out of its black field and set into the user's
scene painting (the hooded summoner on the right, the thing on the left, starfield between them).

The eye arrives on a near-black background with its own smoke. It is not cut with a brightness ramp —
that would punch holes in the dark crevices inside the metalwork. Instead the background is found by
flood-filling inward from the frame edge over the dark pixels only, so anything enclosed by the object
(the deep shadow between the claws) stays opaque, while the smoke, which is attached to the edge, is
feathered by its own brightness so it fades out instead of ending on a hard cut.

    /path/to/python tools/make_tab_watchers.py
"""

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'preview' / 'assets' / 'tabs' / 'src'
OUT = ROOT / 'preview' / 'assets' / 'tabs'
EYE = SRC / 'watcher-eye.png'
SCENE = SRC / 'summoner-scene.png'

W, H = 1920, 1080
DARK = 18          # at or below this luminance the frame edge counts as background
SMOKE_FULL = 72    # luminance at which the outer smoke is fully opaque
EYE_HEIGHT = 620   # how tall the eye sits in the finished frame
EYE_CENTRE = (790, 512)


def keyed_eye():
    """The eye with its black field removed and its smoke kept.

    A flood fill from the edge is not enough: the smoke forms a shell around the medallion, so the black
    between the wisps is enclosed and survives as a dark patch. Instead the object is closed
    morphologically (bright structure dilated, then eroded) which fills the deep crevices inside the
    metalwork, and that is combined with a luminance ramp so the smoke outside it fades out.
    """
    img = Image.open(EYE).convert('RGB')
    w, h = img.size
    luma = img.convert('L')

    s4 = luma.resize((w // 4, h // 4), Image.BILINEAR)
    bright = s4.point(lambda v: 255 if v > 38 else 0)
    closed = bright.filter(ImageFilter.MaxFilter(13)).filter(ImageFilter.MinFilter(13))
    closed = closed.filter(ImageFilter.GaussianBlur(2)).resize((w, h), Image.BILINEAR)

    ramp = luma.point(lambda v: 0 if v <= 12 else (255 if v >= 60 else int((v - 12) * 255 / 48)))
    alpha = ImageChops.lighter(closed, ramp)
    alpha = alpha.filter(ImageFilter.GaussianBlur(1.3))

    out = img.convert('RGBA')
    out.putalpha(alpha)
    return out.crop(alpha.getbbox())


def scene():
    return Image.open(SCENE).convert('RGB').resize((W, H), Image.LANCZOS).filter(
        ImageFilter.UnsharpMask(radius=1.6, percent=55, threshold=2))


def build():
    bg = scene()
    obj = keyed_eye()
    k = EYE_HEIGHT / obj.height
    size = (int(obj.width * k), EYE_HEIGHT)
    obj = obj.resize(size, Image.LANCZOS)
    ex = EYE_CENTRE[0] - size[0] // 2
    ey = EYE_CENTRE[1] - size[1] // 2

    # the eye is warm and the room is cold: let it throw a little of its own light on the scene first,
    # so it is standing in the room rather than pasted over it
    glow = Image.new('L', (W, H), 0)
    glow.paste(obj.split()[3], (ex, ey))
    glow = glow.filter(ImageFilter.GaussianBlur(95)).point(lambda v: int(v * 0.5))
    warm = Image.new('RGB', (W, H), (120, 30, 24))
    bg = ImageChops.screen(bg, Image.composite(warm, Image.new('RGB', (W, H), (0, 0, 0)), glow))

    frame = bg.convert('RGBA')
    frame.alpha_composite(obj, (ex, ey))
    return frame.convert('RGB')


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    img = build()
    # a vignette so the plate sits under the tab bar without hard black corners
    vig = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(vig)
    d.ellipse([-int(W * 0.22), -int(H * 0.30), int(W * 1.22), int(H * 1.30)], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(180)).point(lambda v: 255 - int((255 - v) * 0.35))
    img = ImageChops.multiply(img, Image.merge('RGB', (vig, vig, vig)))
    out = OUT / 'watchers.jpg'
    img.save(out, quality=92, optimize=True)
    print(out, img.size, out.stat().st_size // 1024, 'KB')


if __name__ == '__main__':
    main()

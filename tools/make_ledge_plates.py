#!/usr/bin/env python3
"""
Podium plates built so the item always stands on solid ground.

The framing that read best in review was the centred podium: soft dark stage behind, one sharp ledge
in front, the object standing on it. This builds exactly that out of real art, with no anchor guessing:

  * the STAGE is a painted podium room (empty — nothing stands on its plinth);
  * the BACK is that same stage, blurred and leaned down, so it reads as depth;
  * the LEDGE is a band cropped from the stage's own floor, kept sharp, laid across the bottom of the
    frame with a feathered top edge — the item stands on that edge, at a height this script controls;
  * the ITEM is GGG's real Path of Exile 1 art, 2x-3x its own size, with a contact shadow.

Nothing is drawn from imagination and nothing is invented: the stage is the only painted element, and
it carries no object at all.

    /path/to/python tools/make_ledge_plates.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageStat

ROOT = Path(__file__).resolve().parent.parent
SPLASH = ROOT / 'preview' / 'assets' / 'splash'
SRC = SPLASH / 'src'
SEARCH = ROOT / 'image-search'
STAGE = ROOT / 'preview' / 'assets' / 'plates' / 'podium'
OUT = ROOT / 'preview' / 'assets' / 'plates' / 'ledge'

W, H = 1920, 1080
LEDGE_TOP = int(H * 0.655)      # where the ledge's top edge lands
MAX_SCALE = 3.0

EYE = SRC / 'watchers_eye.png'
RING = SRC / 'two_stone_ring.webp'
ONYX = SEARCH / 'path-of-exile-unique-amulet-item-icon-ar-5.webp'
GLOVES = SEARCH / 'path-of-exile-rare-boots-gloves-helmet-i-1.webp'
EXALTED = SRC / 'exalted_orb.png'
MIRROR = SEARCH / 'path-of-exile-1-currency-orb-icons-png-m-2.png'
LIFE = SRC / 'divine_life_flask.webp'
GRANITE = SEARCH / 'path-of-exile-utility-flask-icons-granit-5.webp'
DIAMOND = SEARCH / 'path-of-exile-utility-flask-icons-granit-1.webp'

# plate            stage                [(item, scale)]                                    back grade
PLATES = [
    ('watchers-a.jpg', 'bg-watchers-2.jpg', [(EYE, 3.0)],                                    0.62),
    ('watchers-b.jpg', 'bg-watchers-1.jpg', [(EYE, 3.0)],                                    0.60),
    ('watchers-c.jpg', 'bg-watchers-2.jpg', [(EYE, 2.0)],                                    0.62),
    ('rare-a.jpg',     'bg-rare-2.jpg',     [(RING, 3.0)],                                   0.62),
    ('rare-b.jpg',     'bg-rare-1.jpg',     [(RING, 3.0), (ONYX, 3.0)],                      0.62),
    ('rare-c.jpg',     'bg-rare-2.jpg',     [(RING, 2.0), (ONYX, 2.0), (GLOVES, 1.5)],       0.62),
    ('economy-a.jpg',  'bg-economy-2.jpg',  [(EXALTED, 2.0)],                                0.62),
    ('economy-b.jpg',  'bg-economy-1.jpg',  [(MIRROR, 2.0)],                                 0.62),
    ('economy-c.jpg',  'bg-economy-2.jpg',  [(EXALTED, 1.5), (MIRROR, 1.5)],                 0.62),
    ('flasks-a.jpg',   'bg-flasks-2.jpg',   [(LIFE, 2.0)],                                   0.62),
    ('flasks-b.jpg',   'bg-flasks-1.jpg',   [(LIFE, 2.0), (GRANITE, 2.0), (DIAMOND, 2.0)],   0.62),
    ('flasks-c.jpg',   'bg-flasks-2.jpg',   [(LIFE, 2.5), (GRANITE, 2.5), (DIAMOND, 2.5)],   0.62),
]

_BASES = {}


def stage(name):
    if name not in _BASES:
        _BASES[name] = Image.open(STAGE / name).convert('RGB').resize((W, H), Image.LANCZOS)
    return _BASES[name]


def build(name, stage_name, items, grade, out):
    src = stage(stage_name)

    back = (src.filter(ImageFilter.GaussianBlur(4.5)))
    back = ImageEnhance.Brightness(back).enhance(grade)

    # the ledge: the stage's own floor, sharp, laid across the bottom with a feathered top edge
    ledge_h = H - LEDGE_TOP
    ledge = src.crop((0, LEDGE_TOP + int(ledge_h * 0.35), W, H)).resize((W, ledge_h), Image.LANCZOS)
    ledge = ImageEnhance.Brightness(ledge).enhance(min(1.0, grade + 0.22))
    feather = Image.new('L', (W, ledge_h), 255)
    d = ImageDraw.Draw(feather)
    for y in range(70):
        d.line([(0, y), (W, y)], fill=int(255 * (y / 69) ** 0.8))
    canvas = back.copy()
    canvas.paste(ledge, (0, LEDGE_TOP), feather)

    arts = [load(p, s) for p, s in items]
    gap = int(max(a.height for a in arts) * 0.5)
    total = sum(a.width for a in arts) + gap * (len(arts) - 1)
    x = int(W * 0.5) - total // 2
    for art in arts:
        y = LEDGE_TOP + int(H * 0.012) - art.height
        pad = max(4, int(art.height * 0.06))
        shadow = Image.new('L', (art.width + pad * 2, art.height + pad * 2), 0)
        shadow.paste(art.split()[3], (pad, pad))
        shadow = (shadow.filter(ImageFilter.GaussianBlur(max(4, art.height * 0.05)))
                        .point(lambda v: int(v * .5)))
        canvas.paste(Image.new('RGB', shadow.size, (0, 0, 0)),
                     (x - pad, y - pad + int(art.height * 0.03)), shadow)
        canvas.paste(art, (x, y), art)
        x += art.width + gap

    canvas.save(out, quality=92, optimize=True)
    return out


def load(path, scale):
    if scale > MAX_SCALE:
        raise SystemExit(f'{path.name}: {scale}x is past the {MAX_SCALE}x cap')
    art = Image.open(path).convert('RGBA')
    art.putalpha(art.split()[3].point(lambda v: 0 if v < 14 else v))
    if scale != 1.0:
        art = art.resize((max(1, round(art.width * scale)), max(1, round(art.height * scale))),
                         Image.LANCZOS)
    return art


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for plate, stage_name, items, grade in PLATES:
        for path, _ in items:
            if not Path(path).exists():
                raise SystemExit(f'missing real art: {path}')
        out = build(plate, stage_name, items, grade, OUT / plate)
        mean = ImageStat.Stat(Image.open(out).convert('L')).mean[0]
        print(f'{plate:16s} {stage_name:18s} mean {mean:5.1f}  {out.stat().st_size // 1024:4d} KB')


if __name__ == '__main__':
    main()

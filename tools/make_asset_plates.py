#!/usr/bin/env python3
"""
Build the per-tab review plates from real Path of Exile 1 art only.

No generated imagery. Every plate is a real PoE1 painting from `assets/splash/` with real PoE1 item
art composited on top at a size its own source supports. Nothing is painted, nothing is lit, nothing
floats: the staging that read as "not in the game" (glowing seals, plinths, embers, spotlights) is
gone, and so is every invented item — an orb that is not in the game does not appear here.

Three rules the build enforces:

  * Item art is used at 1x to 3x its own size and never more. PoE1 ships jewels and rings at 78 px,
    flasks at 78 x 156 px, armour at 156 px, currency at 300 px. 2x still reads as a smudge on a
    1920 px plate, so 78 px sources go to 3x (234 px); past that the resample starts inventing detail
    that is not in the game.
  * Each plate is cropped into the calmest window of its painting (`quiet_window`), so an item never
    lands on a face, a statue or a monster. Zoom is capped at 1.5x so the painting stays sharp.
  * The only thing added to the real art is a soft contact shadow, so an item reads as standing on
    the ground rather than pasted onto the picture. No glow, no halo, no reflection, no vignette.

    /path/to/python tools/make_asset_plates.py

Needs Pillow. Writes 1920 x 1080 JPEGs into preview/assets/plates/assets/.
"""

from pathlib import Path

from PIL import Image, ImageFilter, ImageEnhance, ImageStat

ROOT = Path(__file__).resolve().parent.parent
SPLASH = ROOT / 'preview' / 'assets' / 'splash'
SRC = SPLASH / 'src'
SEARCH = ROOT / 'image-search'
OUT = ROOT / 'preview' / 'assets' / 'plates' / 'assets'

W, H = 1920, 1080
CX, CY = int(W * 0.52), int(H * 0.56)      # inside the frame's mask, on the ground plane

# real PoE1 item art — file, and the largest size its own source supports
EYE = SRC / 'watchers_eye.png'                                       # 78 x 78  unique jewel
RING = SRC / 'two_stone_ring.webp'                                   # 78 x 78  Two-Stone Ring
ONYX = SEARCH / 'path-of-exile-unique-amulet-item-icon-ar-5.webp'    # 78 x 78  Onyx Amulet
GLOVES = SEARCH / 'path-of-exile-rare-boots-gloves-helmet-i-1.webp'  # 156 x 156 rare gloves
EXALTED = SRC / 'exalted_orb.png'                                    # 300 x 300 Exalted Orb
MIRROR = SEARCH / 'path-of-exile-1-currency-orb-icons-png-m-2.png'   # 300 x 300 Mirror of Kalandra
LIFE = SRC / 'divine_life_flask.webp'                                # 78 x 156 Divine Life Flask
GRANITE = SEARCH / 'path-of-exile-utility-flask-icons-granit-5.webp' # 78 x 156 Granite Flask
DIAMOND = SEARCH / 'path-of-exile-utility-flask-icons-granit-1.webp' # 78 x 156 Diamond Flask

GROVE = SPLASH / 'bleed_grove.jpg'          # forest shrine
GRAVEYARD = SPLASH / 'bleed_graveyard.jpg'  # graveyard at dusk
HEROINE = SPLASH / 'bleed_heroine.jpg'      # cathedral figure

MAX_SCALE = 3.0

# plate              painting     [(item, scale)]                                              grade
# plate              painting     [(item, scale)]                                      grade  x
PLATES = [
    ('watchers-a.jpg', GRAVEYARD, [(EYE, 3.0)],                                        0.45, 0.52),
    ('watchers-b.jpg', GRAVEYARD, [(EYE, 2.0)],                                        0.45, 0.36),
    ('watchers-c.jpg', GRAVEYARD, [(EYE, 3.0)],                                        0.45, 0.66),
    ('rare-a.jpg',     GRAVEYARD, [(RING, 3.0)],                                       0.45, 0.52),
    ('rare-b.jpg',     GRAVEYARD, [(RING, 3.0), (ONYX, 3.0)],                          0.45, 0.52),
    ('rare-c.jpg',     GRAVEYARD, [(RING, 2.0), (ONYX, 2.0), (GLOVES, 1.5)],           0.45, 0.52),
    ('economy-a.jpg',  GRAVEYARD, [(EXALTED, 2.0)],                                    0.45, 0.52),
    ('economy-b.jpg',  GRAVEYARD, [(EXALTED, 2.0), (MIRROR, 2.0)],                     0.45, 0.52),
    ('economy-c.jpg',  GRAVEYARD, [(MIRROR, 2.5)],                                     0.45, 0.52),
    ('flasks-a.jpg',   GRAVEYARD, [(LIFE, 2.0)],                                       0.45, 0.52),
    ('flasks-b.jpg',   GRAVEYARD, [(LIFE, 2.0), (GRANITE, 2.0), (DIAMOND, 2.0)],       0.45, 0.52),
    ('flasks-c.jpg',   GRAVEYARD, [(LIFE, 2.5), (GRANITE, 2.5), (DIAMOND, 2.5)],       0.45, 0.52),
]

_BASES = {}


def base(path):
    """The painting at plate size, loaded once."""
    if path not in _BASES:
        _BASES[path] = Image.open(path).convert('RGB').resize((W, H), Image.LANCZOS)
    return _BASES[path]


def window(src, zoom, at):
    """Crop a window centred on `at` (fractions of the painting) and scale it to the plate."""
    if zoom <= 1.0:
        return src
    w, h = round(W / zoom), round(H / zoom)
    left = min(max(round(at[0] * W - w / 2), 0), W - w)
    top = min(max(round(at[1] * H - h / 2), 0), H - h)
    return src.crop((left, top, left + w, top + h)).resize((W, H), Image.LANCZOS)


def quiet_window(path, grade):
    """The calmest window in the painting for an item to stand in.

    Scores every candidate window on the local detail around the item's landing spot (standard
    deviation) plus a nudge towards a mid-dark field, with a small penalty for zoom, because zooming
    costs sharpness. Scored on a quarter-size copy so the search costs nothing.
    """
    small = base(path).resize((W // 4, H // 4), Image.LANCZOS)
    cx, cy, box = CX // 4, CY // 4, 130
    best, best_score = (1.0, (0.5, 0.5)), None
    for zoom in (1.0, 1.2, 1.4):
        for gx in range(7):
            for gy in range(6):
                at = (0.14 + gx * 0.12, 0.12 + gy * 0.15)
                region = window(small, zoom, at).crop(
                    (cx - box, cy - box, cx + box, cy + box)).convert('L')
                stat = ImageStat.Stat(region)
                score = stat.stddev[0] + 0.6 * abs(stat.mean[0] - 55) + (zoom - 1.0) * 6
                if best_score is None or score < best_score:
                    best, best_score = (zoom, at), score
    return best


def load(path, scale):
    """Real item art, near-invisible dark margin dropped, scaled no further than MAX_SCALE."""
    if scale > MAX_SCALE:
        raise SystemExit(f'{path.name}: {scale}x is past the {MAX_SCALE}x cap')
    art = Image.open(path).convert('RGBA')
    art.putalpha(art.split()[3].point(lambda v: 0 if v < 14 else v))
    if scale != 1.0:
        art = art.resize((max(1, round(art.width * scale)), max(1, round(art.height * scale))),
                         Image.LANCZOS)
    return art


def compose(painting, grade, items, out, where=0.52):
    # A grade this low means the painting is a field — texture under the frame's own grade, the way
    # the app already prints it — so there is no scene to compose against and no window to find.
    if grade <= 0.35:
        zoom, at = 1.0, (0.5, 0.5)
    else:
        zoom, at = quiet_window(painting, grade)
    canvas = ImageEnhance.Brightness(window(base(painting), zoom, at)).enhance(grade)

    arts = [load(p, s) for p, s in items]
    gap = int(max(a.height for a in arts) * 0.55)
    total = sum(a.width for a in arts) + gap * (len(arts) - 1)
    x = int(W * where) - total // 2
    for art in arts:
        y = CY - art.height // 2
        pad = max(4, int(art.height * 0.06))
        shadow = Image.new('L', (art.width + pad * 2, art.height + pad * 2), 0)
        shadow.paste(art.split()[3], (pad, pad))
        shadow = (shadow.filter(ImageFilter.GaussianBlur(max(4, art.height * 0.05)))
                        .point(lambda v: int(v * .55)))
        canvas.paste(Image.new('RGB', shadow.size, (0, 0, 0)),
                     (x - pad, y - pad + max(2, int(art.height * 0.045))), shadow)
        canvas.paste(art, (x, y), art)
        x += art.width + gap

    canvas.save(out, quality=92, optimize=True)
    return out, zoom, at


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, painting, items, grade, where in PLATES:
        for path, _ in items:
            if not Path(path).exists():
                raise SystemExit(f'missing real art: {path}')
        out, zoom, at = compose(painting, grade, items, OUT / name, where)
        mean = ImageStat.Stat(Image.open(out).convert('L')).mean[0]
        print(f'{name:18s} {painting.name:20s} {zoom:.2f}x @ {at[0]:.2f},{at[1]:.2f}  '
              f'mean {mean:5.1f}  {out.stat().st_size // 1024:4d} KB')


if __name__ == '__main__':
    main()

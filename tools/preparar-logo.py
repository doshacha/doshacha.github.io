"""Prepara el logo de Doshacha: recorte, versiones con transparencia, iconos y OG image."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BASE = Path(__file__).resolve().parent.parent
IMG = BASE / "assets" / "img"
SRC = IMG / "logo-original.webp"

src = Image.open(SRC).convert("RGB")
w, h = src.size
gray = src.convert("L")

# --- Version tinta (negro) con transparencia: alpha = 255 - luminancia
alpha = gray.point(lambda v: 0 if v > 244 else min(255, int((255 - v) * 1.12)))
ink = Image.new("RGBA", (w, h), (17, 17, 17, 0))
ink.putalpha(alpha)
bbox = ink.getbbox()
ink = ink.crop(bbox)
alpha = ink.split()[3]

# --- Version clara (blanca) para fondos oscuros
light = Image.new("RGBA", ink.size, (255, 255, 255, 0))
light.putalpha(alpha)

print("recorte:", bbox, "->", ink.size)
ink.save(IMG / "logo.png")
light.save(IMG / "logo-claro.png")

# --- Separar la cabeza del gato del logotipo (buscando el espacio en blanco)
w2, h2 = ink.size
a = ink.split()[3]
rows = [a.crop((0, y, w2, y + 1)).getextrema()[1] for y in range(h2)]
gap_start = None
best = None
y = 0
while y < h2:
    if rows[y] == 0:
        start = y
        while y < h2 and rows[y] == 0:
            y += 1
        run = y - start
        if run > h2 * 0.02 and y < h2 - 2:
            best = (start, y, run)
    y += 1
if best:
    # el primer hueco grande antes de la mitad inferior es el separador cabeza/texto
    cut = best[0] + best[2] // 2
    print("hueco:", best, "corte:", cut)
    mark = ink.crop((0, 0, w2, cut))
    word = ink.crop((0, cut, w2, h2))
    mark.save(IMG / "marca.png")
    word.save(IMG / "logotipo-texto.png")
    print("marca:", mark.size, "texto:", word.size)

# --- Favicon / iconos: marca sobre circulo de papel
mark = Image.open(IMG / "marca.png")
for size, name in ((512, "icon-512.png"), (192, "icon-192.png"), (64, "favicon-64.png"), (32, "favicon-32.png")):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    pad = int(size * 0.02)
    d.ellipse((pad, pad, size - pad, size - pad), fill=(248, 243, 234, 255))
    target = int(size * 0.72)
    scale = target / max(mark.size)
    m = mark.resize((max(1, int(mark.width * scale)), max(1, int(mark.height * scale))), Image.LANCZOS)
    canvas.alpha_composite(m, ((size - m.width) // 2, (size - m.height) // 2))
    canvas.save(IMG / name)

# --- Imagen para compartir (OG 1200x630)
OG = (1200, 630)
og = Image.new("RGB", OG, (248, 243, 234))
d = ImageDraw.Draw(og)
d.rectangle((0, 0, OG[0], OG[1]), fill=(248, 243, 234))
# marco fino
d.rectangle((28, 28, OG[0] - 28, OG[1] - 28), outline=(17, 17, 17), width=2)

def font(name, size, bold=False):
    root = Path("C:/Windows/Fonts")
    candidates = [root / name] + ([root / f"{bold}.ttf"] if bold else [])
    for c in candidates:
        if c.exists():
            try:
                return ImageFont.truetype(str(c), size)
            except Exception:
                pass
    return ImageFont.load_default()

geo = font("georgiab.ttf", 96, bold=True)
geo_small = font("georgia.ttf", 34)
sans = font("segoeui.ttf", 26)

# marca a la izquierda
mh = 210
scale = mh / mark.height
m = mark.resize((int(mark.width * scale), mh), Image.LANCZOS)
white = Image.new("RGBA", m.size, (17, 17, 17, 255))
og.paste(white, (110, (OG[1] - mh) // 2 - 30), m)

tx = 110 + m.width + 70
d.text((tx, 170), "DOSHACHA", font=geo, fill=(17, 17, 17))
d.line((tx, 300, tx + 520, 300), fill=(180, 85, 58), width=3)
d.text((tx, 330), "Diseño · Costura · Sublimación", font=geo_small, fill=(17, 17, 17))
d.text((tx, 392), "Papelería personalizada y confección a medida", font=sans, fill=(90, 84, 76))
d.text((tx, 440), "Los Teques · El Vigía · Envíos a todo el país", font=sans, fill=(90, 84, 76))
og.save(IMG / "og-image.jpg", quality=92)
print("listo")

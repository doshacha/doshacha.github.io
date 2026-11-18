# -*- coding: utf-8 -*-
"""Genera assets/js/productos.js a partir de las tarjetas actuales del index.html."""
import json, re, html as _html

html = open("index.html", encoding="utf-8").read()

IDS = {
    "Caja rectangular 10×15×5": "caja-rectangular",
    "Caja gaveta": "caja-gaveta",
    "Caja con visor": "caja-con-visor",
    "Invitaciones impresas": "invitaciones",
    "Tarjetas raspadita": "raspadita",
    "Stickers troquelados": "stickers",
    "Tarjetas de agradecimiento": "tarjetas-agradecimiento",
    "Kit de marca": "kit-de-marca",
    "Confección a medida": "confeccion",
    "Cortinas y textil hogar": "cortinas",
    "Delantales y uniformes": "delantales",
    "Franelas, tazas y regalos": "sublimacion",
    "Detalles & souvenirs": "detalles-souvenirs",
}
RAIL = {"caja-rectangular", "invitaciones", "stickers", "raspadita", "kit-de-marca", "detalles-souvenirs"}


def limpiar(t):
    return re.sub(r"\s+", " ", _html.unescape(t or "")).strip()


def parse_article(bloque):
    def busca(patron):
        m = re.search(patron, bloque, re.S)
        return m.group(1) if m else ""

    nombre = limpiar(busca(r'<h3 class="pcard__title">(.*?)</h3>'))
    if not nombre:
        return None
    usd = busca(r'data-usd="([\d.]+)"')
    cat = busca(r'data-cat="([^"]+)"')
    return {
        "id": IDS.get(nombre, ""),
        "nombre": nombre,
        "etiqueta": limpiar(busca(r'<p class="pcard__cat">(.*?)</p>')),
        "categoria": cat,
        "descripcion": limpiar(busca(r'<p class="pcard__desc">(.*?)</p>')),
        "usd": round(float(usd), 2) if usd else None,
        "nota": limpiar(busca(r'<p class="pcard__pack">(.*?)</p>')),
        "imagen": busca(r'<img src="([^"]+)"'),
        "wa": busca(r'<a class="pcard__cta" href="([^"]+)"'),
        "ubicaciones": ["catalogo"],
    }


catalogo = html[html.index('<div class="catalog" id="catalog">'):]
catalogo = catalogo[: catalogo.index("</section>")]
productos = [p for p in (parse_article(b) for b in re.findall(r'<article class="pcard".*?</article>', catalogo, re.S)) if p]

# la pieza "Detalles & souvenirs" solo existe en el carrusel: la rescatamos
rail = html[html.index('<div class="rail" data-rail>'):]
rail = rail[: rail.index("</section>")]
for bloque in re.findall(r'<article class="pcard">.*?</article>', rail, re.S):
    p = parse_article(bloque)
    if p and p["id"] == "detalles-souvenirs":
        p["categoria"] = "eventos"
        p["etiqueta"] = "Eventos"
        productos.append(p)

for p in productos:
    if not p["id"]:
        print("AVISO sin id:", p["nombre"])
    if p["id"] in RAIL:
        p["ubicaciones"].append("rail")

orden = ["id", "nombre", "etiqueta", "categoria", "descripcion", "usd", "nota", "imagen", "wa", "ubicaciones"]
lineas = []
for p in productos:
    filas = []
    for k in orden:
        v = p[k]
        if k == "usd":
            filas.append(f'    usd: {v if v is not None else "null"}')
        elif k == "ubicaciones":
            filas.append('    ubicaciones: ["' + '", "'.join(v) + '"]')
        else:
            filas.append(f'    {k}: {json.dumps(v, ensure_ascii=False)}')
    lineas.append("  {\n" + ",\n".join(filas) + "\n  }")

contenido = (
    "/* ==========================================================================\n"
    "   Doshacha — productos\n"
    "   --------------------------------------------------------------------------\n"
    "   Esta lista pinta el catálogo y el carrusel de inicio.\n"
    "   Puedes editarla a mano o usar panel.html: sube fotos, precios y\n"
    "   descripciones, elige dónde aparece cada pieza y descarga el archivo listo.\n"
    "   ========================================================================== */\n"
    "window.DOSHACHA_PRODUCTOS = [\n" + ",\n".join(lineas) + "\n];\n"
)
open("assets/js/productos.js", "w", encoding="utf-8", newline="\n").write(contenido)
print("productos:", len(productos), "| en carrusel:", sum(1 for p in productos if "rail" in p["ubicaciones"]))
for p in productos:
    print(" -", p["id"], "|", p["categoria"], "|", p["usd"], "|", p["ubicaciones"])

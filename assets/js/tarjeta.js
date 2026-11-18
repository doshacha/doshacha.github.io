/* ==========================================================================
   Doshacha — plantilla de tarjeta de producto
   La usan la web (catálogo y carrusel) y el panel de edición (vista previa).
   ========================================================================== */
(function () {
  "use strict";

  const nf = new Intl.NumberFormat("es-VE");

  const fmtUsd = (valor) =>
    "$" + Number(valor).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // La tasa se lee en cada cálculo: tasas.js puede actualizarla desde el BCV
  // después de que se hayan creado las tarjetas.
  const fmtBs = (valor) => {
    const conf = window.DOSHACHA_PRECIOS || {};
    const tasa = Number(conf.tasaBCV) || 0;
    return "Bs " + nf.format(Math.round(Number(valor) * tasa));
  };

  const esc = (texto) =>
    String(texto == null ? "" : texto).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));

  const WA_POR_DEFECTO = "https://wa.me/584169184756?text=Hola%20Doshacha%2C%20quiero%20cotizar.";

  /**
   * @param {object} p producto
   * @param {{enlaceMedia?:boolean}} opciones
   */
  function html(p, opciones) {
    const opt = opciones || {};
    const tienePrecio = p.usd !== null && p.usd !== undefined && p.usd !== "";
    const precio = tienePrecio
      ? '<div class="pcard__price"><span class="pcard__usd">' + fmtUsd(p.usd) +
        '</span><span class="pcard__bs" data-usd="' + Number(p.usd) + '">' + fmtBs(p.usd) + "</span></div>"
      : "";
    const nota = tienePrecio && p.nota ? '<p class="pcard__pack">' + esc(p.nota) + "</p>" : "";
    const etiqueta = p.etiqueta ? '<p class="pcard__cat">' + esc(p.etiqueta) + "</p>" : "";
    const imagen = '<img src="' + esc(p.imagen) + '" alt="' + esc(p.nombre) + '" loading="lazy" width="900" height="1125">';
    const media = opt.enlaceMedia
      ? '<a class="pcard__media" href="#catalogo">' + imagen + "</a>"
      : '<div class="pcard__media">' + imagen + "</div>";
    const comprar = tienePrecio && p.id
      ? '<button class="pcard__add" type="button" data-add-cart="' + esc(p.id) + '">' +
        'Añadir al carrito <span aria-hidden="true">+</span></button>'
      : "";

    return (
      '<article class="pcard" data-cat="' + esc(p.categoria) + '">\n' +
      "  " + media + "\n" +
      '  <div class="pcard__body">\n' +
      "    " + etiqueta + "\n" +
      '    <h3 class="pcard__title">' + esc(p.nombre) + "</h3>\n" +
      '    <p class="pcard__desc">' + esc(p.descripcion) + "</p>\n" +
      "    " + precio + "\n" +
      "    " + nota + "\n" +
      "    " + comprar + "\n" +
      '    <a class="pcard__cta" href="' + esc(p.wa || WA_POR_DEFECTO) + '" target="_blank" rel="noopener">Cotizar <span aria-hidden="true">→</span></a>\n' +
      "  </div>\n" +
      "</article>"
    );
  }

  window.DoshachaTarjeta = { html: html, fmtUsd: fmtUsd, fmtBs: fmtBs, esc: esc };
})();

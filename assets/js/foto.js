/* ==========================================================================
   Doshacha — preparación de fotos
   Recorta a 4:5, reduce a 1000 px de ancho y comprime (WebP con respaldo JPEG).
   ========================================================================== */
(function () {
  "use strict";

  const ANCHO_MAX = 1000;
  const RATIO = 4 / 5;

  function imagenDesdeArchivo(file) {
    return new Promise(function (resolve, reject) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la imagen")); };
      img.src = url;
    });
  }

  // createImageBitmap es más rápido, pero en algunos navegadores/entornos se queda
  // colgado con archivos locales. Si no responde en 2,5 s se usa la vía clásica.
  function decodificar(file) {
    if (!("createImageBitmap" in window)) return imagenDesdeArchivo(file);
    const rapida = Promise.resolve()
      .then(function () { return createImageBitmap(file); })
      .catch(function () { return null; });
    const espera = new Promise(function (resolve) { setTimeout(function () { resolve(null); }, 2500); });
    return Promise.race([rapida, espera]).then(function (mapa) {
      return mapa || imagenDesdeArchivo(file);
    });
  }

  function blobADataUrl(blob) {
    return new Promise(function (resolve, reject) {
      const lector = new FileReader();
      lector.onload = function () { resolve(lector.result); };
      lector.onerror = function () { reject(new Error("No se pudo leer el archivo")); };
      lector.readAsDataURL(blob);
    });
  }

  /**
   * Calcula el recorte centrado 4:5.
   * @param {number} w ancho original
   * @param {number} h alto original
   */
  function calcularRecorte(w, h) {
    let sw = w, sh = h, sx = 0, sy = 0;
    if (w / h > RATIO) {
      sw = Math.round(h * RATIO);
      sx = Math.round((w - sw) / 2);
    } else {
      sh = Math.round(w / RATIO);
      sy = Math.round((h - sh) / 2);
    }
    const ancho = Math.min(ANCHO_MAX, sw);
    const alto = Math.round(ancho / RATIO);
    return { sx: sx, sy: sy, sw: sw, sh: sh, ancho: ancho, alto: alto };
  }

  /**
   * @param {File|Blob} file
   * @returns {Promise<{dataUrl:string, ext:string, bytes:number, ancho:number, alto:number}>}
   */
  async function preparar(file) {
    const fuente = await decodificar(file);

    const recorte = calcularRecorte(fuente.width, fuente.height);
    const canvas = document.createElement("canvas");
    canvas.width = recorte.ancho;
    canvas.height = recorte.alto;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(fuente, recorte.sx, recorte.sy, recorte.sw, recorte.sh, 0, 0, recorte.ancho, recorte.alto);
    if (fuente.close) fuente.close();

    let blob = await new Promise(function (r) { canvas.toBlob(r, "image/webp", 0.82); });
    let ext = "webp";
    if (!blob || blob.type !== "image/webp") {
      blob = await new Promise(function (r) { canvas.toBlob(r, "image/jpeg", 0.86); });
      ext = "jpg";
    }
    if (!blob) throw new Error("El navegador no pudo comprimir la imagen");

    const dataUrl = await blobADataUrl(blob);
    return {
      dataUrl: dataUrl,
      ext: ext,
      bytes: blob.size,
      ancho: recorte.ancho,
      alto: recorte.alto
    };
  }

  window.DoshachaFoto = { preparar: preparar, calcularRecorte: calcularRecorte };
})();

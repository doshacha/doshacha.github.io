/* ==========================================================================
   Doshacha — empaquetador ZIP mínimo (sin compresión, sin dependencias)
   Genera un .zip válido con archivos ya comprimidos (webp, js, txt).
   ========================================================================== */
(function () {
  "use strict";

  const tabla = (function () {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = tabla[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function fechaDos(d) {
    return {
      time: ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | ((d.getSeconds() / 2) & 31),
      date: (((d.getFullYear() - 1980) & 127) << 9) | (((d.getMonth() + 1) & 15) << 5) | (d.getDate() & 31)
    };
  }

  /**
   * @param {{name:string, data:Uint8Array}[]} archivos
   * @returns {Blob} zip
   */
  function store(archivos) {
    const enc = new TextEncoder();
    const partes = [];
    const central = [];
    let offset = 0;
    const sello = fechaDos(new Date());

    archivos.forEach(function (archivo) {
      const nombre = enc.encode(archivo.name);
      const datos = archivo.data;
      const crc = crc32(datos);

      const local = new Uint8Array(30 + nombre.length);
      const lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0, true);
      lv.setUint16(8, 0, true);
      lv.setUint16(10, sello.time, true);
      lv.setUint16(12, sello.date, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, datos.length, true);
      lv.setUint32(22, datos.length, true);
      lv.setUint16(26, nombre.length, true);
      lv.setUint16(28, 0, true);
      local.set(nombre, 30);

      partes.push(local, datos);

      const cd = new Uint8Array(46 + nombre.length);
      const cv = new DataView(cd.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, sello.time, true);
      cv.setUint16(14, sello.date, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, datos.length, true);
      cv.setUint32(24, datos.length, true);
      cv.setUint16(28, nombre.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);
      cd.set(nombre, 46);
      central.push(cd);

      offset += local.length + datos.length;
    });

    const tamCentral = central.reduce(function (n, c) { return n + c.length; }, 0);
    const fin = new Uint8Array(22);
    const fv = new DataView(fin.buffer);
    fv.setUint32(0, 0x06054b50, true);
    fv.setUint16(4, 0, true);
    fv.setUint16(6, 0, true);
    fv.setUint16(8, archivos.length, true);
    fv.setUint16(10, archivos.length, true);
    fv.setUint32(12, tamCentral, true);
    fv.setUint32(16, offset, true);
    fv.setUint16(20, 0, true);

    return new Blob(partes.concat(central, [fin]), { type: "application/zip" });
  }

  window.DoshachaZip = { store: store, crc32: crc32 };
})();

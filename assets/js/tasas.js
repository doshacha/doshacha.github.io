/* ==========================================================================
   Doshacha — tasas oficiales del BCV
   --------------------------------------------------------------------------
   La web es estática y el sitio del BCV no permite leerlo directamente desde
   el navegador (CORS). Por eso se consulta DolarAPI, que publica con CORS las
   mismas tasas oficiales del BCV (dólar y euro), se guarda una copia en el
   navegador y, si no hay conexión, se usa assets/js/precios.js como respaldo.

   Al actualizar, se avisa al resto de la página con el evento
   «doshacha:tasas» para que los precios en bolívares se recalculen.
   ========================================================================== */
(function () {
  "use strict";

  const CLAVE_CACHE = "doshacha-tasas-bcv-v1";
  const VIGENCIA = 30 * 60 * 1000; // 30 minutos
  const ESPERA_MAXIMA = 9000;      // 9 segundos por consulta
  const URL_DOLAR = "https://ve.dolarapi.com/v1/dolares/oficial";
  const URL_EURO = "https://ve.dolarapi.com/v1/euros/oficial";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const nf = new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  let consultando = false;

  function numero(valor) {
    if (valor === null || valor === undefined || valor === "") return 0;
    if (typeof valor === "number") {
      return Number.isFinite(valor) && valor > 0 ? valor : 0;
    }
    const texto = String(valor).trim();
    const limpio = texto.indexOf(",") !== -1
      ? texto.replace(/\./g, "").replace(",", ".")
      : texto;
    const n = Number(limpio);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function formatoBs(valor) {
    return "Bs " + nf.format(Number(valor));
  }

  function fechaDeHoy() {
    const d = new Date();
    const dia = String(d.getDate()).padStart(2, "0");
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    return dia + "/" + mes + "/" + d.getFullYear();
  }

  function fechaDesdeIso(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
    return m ? m[3] + "/" + m[2] + "/" + m[1] : "";
  }

  function claveFecha(fecha) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(fecha || ""));
    return m ? Number(m[3] + m[2] + m[1]) : 0;
  }

  function leerCache() {
    try {
      const crudo = localStorage.getItem(CLAVE_CACHE);
      if (!crudo) return null;
      const datos = JSON.parse(crudo);
      if (!datos || !numero(datos.tasaBCV)) return null;
      return datos;
    } catch (error) {
      return null;
    }
  }

  function guardarCache(datos) {
    try {
      localStorage.setItem(CLAVE_CACHE, JSON.stringify(datos));
    } catch (error) {
      /* Sin almacenamiento la tasa se usa igual durante esta visita. */
    }
  }

  function esReciente(cache) {
    if (!cache) return false;
    const edad = Date.now() - Number(cache.guardado || 0);
    return edad >= 0 && edad < VIGENCIA;
  }

  function configurar(datos) {
    const base = window.DOSHACHA_PRECIOS || {};
    const conf = Object.assign({}, base, {
      tasaBCV: numero(datos.tasaBCV) || numero(base.tasaBCV),
      tasaEuro: numero(datos.tasaEuro) || numero(base.tasaEuro),
      fechaTasa: datos.fechaTasa || base.fechaTasa || ""
    });

    window.DOSHACHA_PRECIOS = conf;
    return conf;
  }

  function marcarEstado(texto, tipo) {
    $$("[data-tasa-estado]").forEach((el) => {
      el.textContent = texto;
      el.classList.toggle("is-ok", tipo === "ok");
      el.classList.toggle("is-error", tipo === "error");
    });
  }

  function avisar() {
    try {
      document.dispatchEvent(new CustomEvent("doshacha:tasas", {
        detail: Object.assign({}, window.DOSHACHA_PRECIOS || {})
      }));
    } catch (error) {
      /* Navegadores muy viejos: los precios se actualizan igual. */
    }

    if (window.DoshachaCarrito && typeof window.DoshachaCarrito.refrescar === "function") {
      window.DoshachaCarrito.refrescar();
    }
  }

  function pintar(estado, tipo) {
    const conf = window.DOSHACHA_PRECIOS || {};
    const tasa = numero(conf.tasaBCV);
    const euro = numero(conf.tasaEuro);

    if (tasa > 0) {
      $$("[data-tasa]").forEach((el) => { el.textContent = formatoBs(tasa); });
    }

    if (euro > 0) {
      $$("[data-tasa-euro]").forEach((el) => { el.textContent = formatoBs(euro); });
    }

    $$("[data-tasa-euro-wrap]").forEach((el) => { el.hidden = !(euro > 0); });

    if (conf.fechaTasa) {
      $$("[data-fecha]").forEach((el) => { el.textContent = conf.fechaTasa; });
    }

    if (estado) marcarEstado(estado, tipo);
    avisar();
  }

  function aplicar(datos, estado, tipo) {
    configurar(datos || {});
    pintar(estado, tipo);
  }

  function cargando(activo) {
    $$("[data-tasa-refresh]").forEach((boton) => {
      boton.classList.toggle("is-loading", activo);
      boton.disabled = activo;
      boton.setAttribute("aria-busy", String(activo));
    });
  }

  async function pedirJson(url) {
    const control = new AbortController();
    const limite = window.setTimeout(() => control.abort(), ESPERA_MAXIMA);

    try {
      const respuesta = await fetch(url, {
        method: "GET",
        mode: "cors",
        cache: "no-store",
        headers: { "Accept": "application/json" },
        signal: control.signal
      });

      if (!respuesta.ok) throw new Error("HTTP " + respuesta.status);
      return await respuesta.json();
    } finally {
      window.clearTimeout(limite);
    }
  }

  async function actualizar(forzar) {
    if (consultando) return;

    const cache = leerCache();
    if (!forzar && esReciente(cache)) {
      aplicar(cache, "Tasa oficial guardada", "ok");
      return;
    }

    consultando = true;
    cargando(true);
    marcarEstado("Consultando el BCV…", "loading");

    try {
      const [dolar, euro] = await Promise.allSettled([
        pedirJson(URL_DOLAR),
        pedirJson(URL_EURO)
      ]);

      const valorDolar = dolar.status === "fulfilled" ? dolar.value : null;
      const valorEuro = euro.status === "fulfilled" ? euro.value : null;

      if (!valorDolar || !numero(valorDolar.promedio)) {
        throw new Error("El BCV no devolvió la tasa del dólar");
      }

      const actual = window.DOSHACHA_PRECIOS || {};
      const datos = {
        tasaBCV: numero(valorDolar.promedio),
        tasaEuro: valorEuro ? numero(valorEuro.promedio) : 0,
        fechaTasa: fechaDesdeIso(valorDolar.fechaActualizacion) || actual.fechaTasa || fechaDeHoy(),
        fechaActualizacion: valorDolar.fechaActualizacion || "",
        guardado: Date.now(),
        origen: "BCV"
      };

      if (!datos.tasaEuro) {
        datos.tasaEuro = numero(actual.tasaEuro) || (cache ? numero(cache.tasaEuro) : 0);
      }

      guardarCache(datos);
      aplicar(datos, "Tasa oficial del BCV", "ok");
    } catch (error) {
      const respaldo = cache && numero(cache.tasaBCV)
        ? cache
        : (window.DOSHACHA_PRECIOS || {});

      aplicar(
        respaldo,
        cache ? "Sin conexión · última tasa guardada" : "Sin conexión · tasa de referencia",
        "error"
      );
    } finally {
      consultando = false;
      cargando(false);
    }
  }

  function iniciar() {
    const cache = leerCache();
    const publicada = window.DOSHACHA_PRECIOS || {};
    let inicial = publicada;

    if (cache && numero(cache.tasaBCV)) {
      const fechaCache = claveFecha(cache.fechaTasa);
      const fechaPublicada = claveFecha(publicada.fechaTasa);
      if (!fechaPublicada || fechaCache >= fechaPublicada) {
        inicial = cache;
      }
    }

    aplicar(
      inicial,
      cache ? "Tasa oficial guardada" : "Tasa de referencia",
      cache ? "ok" : "cache"
    );

    $$("[data-tasa-refresh]").forEach((boton) => {
      boton.addEventListener("click", () => actualizar(true));
    });

    window.addEventListener("online", () => actualizar(false));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && !esReciente(leerCache())) {
        actualizar(false);
      }
    });

    if (!esReciente(cache) || (cache && claveFecha(inicial.fechaTasa) < claveFecha(publicada.fechaTasa))) {
      actualizar(false);
    }
  }

  window.DoshachaTasas = {
    actualizar: actualizar,
    pintar: pintar,
    actual: () => Object.assign({}, window.DOSHACHA_PRECIOS || {})
  };

  if (typeof fetch !== "function") {
    aplicar(leerCache() || window.DOSHACHA_PRECIOS || {}, "Tasa de referencia", "cache");
    return;
  }

  iniciar();
})();

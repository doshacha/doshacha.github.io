/* ==========================================================================
   Doshacha — interacciones
   ========================================================================== */
(function () {
  "use strict";

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Año del footer ---------- */
  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Catálogo y carrusel desde productos.js ---------- */
  if (window.DOSHACHA_PRODUCTOS && window.DoshachaTarjeta) {
    const lista = window.DOSHACHA_PRODUCTOS;
    const enCatalogo = lista.filter((p) => (p.ubicaciones || []).indexOf("catalogo") !== -1);
    const enRail = lista.filter((p) => (p.ubicaciones || []).indexOf("rail") !== -1);
    const tarjeta = window.DoshachaTarjeta;

    const catalogoNodo = $("#catalog");
    if (catalogoNodo && enCatalogo.length) {
      catalogoNodo.innerHTML = enCatalogo.map((p) => tarjeta.html(p)).join("");
    }

    const railNodo = $(".rail[data-rail]");
    if (railNodo && enRail.length) {
      railNodo.innerHTML = enRail.map((p) => tarjeta.html(p, { enlaceMedia: true })).join("");
    }

    // Los filtros se construyen con las categorías reales del catálogo:
    // servicios, artículos del inventario y piezas escritas a mano.
    const contenedorFiltros = $(".filters");
    if (contenedorFiltros && enCatalogo.length) {
      const categorias = [];
      const vistos = Object.create(null);

      enCatalogo.forEach((p) => {
        const slug = String(p.categoria || "otros").trim() || "otros";
        if (vistos[slug]) return;
        vistos[slug] = true;
        categorias.push({
          slug: slug,
          nombre: String(p.categoriaNombre || p.etiqueta || slug)
        });
      });

      categorias.sort((a, b) => {
        const articulos = (x) => (x.slug === "articulos" ? 1 : 0);
        return articulos(a) - articulos(b) || a.nombre.localeCompare(b.nombre, "es");
      });

      const esc = tarjeta.esc;
      contenedorFiltros.innerHTML =
        '<button class="chip is-active" data-filter="all" aria-pressed="true">Todo</button>' +
        categorias.map((c) =>
          '<button class="chip" data-filter="' + esc(c.slug) + '" aria-pressed="false">' +
          esc(c.nombre) + "</button>"
        ).join("");
    }
  }

  /* ---------- Precios: dólares y bolívares ---------- */
  // Los precios base están en USD en el HTML (data-usd). Aquí se recalculan
  // los bolívares con la tasa vigente; tasas.js avisa cuando consulta el BCV.
  const nfBs = new Intl.NumberFormat("es-VE");
  const formatearTasa = (valor) =>
    "Bs " + Number(valor).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function aplicarTasas() {
    const conf = window.DOSHACHA_PRECIOS || {};
    const tasa = Number(conf.tasaBCV) || 0;
    const euro = Number(conf.tasaEuro) || 0;

    if (tasa > 0) {
      const texto = formatearTasa(tasa);
      $$("[data-tasa]").forEach((el) => { el.textContent = texto; });
    }

    $$("[data-tasa-euro]").forEach((el) => {
      el.textContent = euro > 0 ? formatearTasa(euro) : "";
    });
    $$("[data-tasa-euro-wrap]").forEach((el) => { el.hidden = !(euro > 0); });

    if (conf.fechaTasa) {
      $$("[data-fecha]").forEach((el) => { el.textContent = conf.fechaTasa; });
    }

    if (tasa > 0) {
      $$(".pcard__bs").forEach((el) => {
        const usd = parseFloat(el.dataset.usd);
        if (!Number.isNaN(usd)) el.textContent = "Bs " + nfBs.format(Math.round(usd * tasa));
      });
    }
  }

  aplicarTasas();
  document.addEventListener("doshacha:tasas", aplicarTasas);

  /* ---------- Header al hacer scroll ---------- */
  const header = $("#header");
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Menú móvil ---------- */
  const burger = $("#burger");
  const drawer = $("#drawer");

  const setDrawer = (open) => {
    if (!drawer || !burger) return;
    drawer.classList.toggle("is-open", open);
    drawer.setAttribute("aria-hidden", String(!open));
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    document.body.classList.toggle("is-locked", open);
    document.body.style.overflow = open ? "hidden" : "";
  };

  if (burger) burger.addEventListener("click", () => setDrawer(!drawer.classList.contains("is-open")));
  if (drawer) $$("a", drawer).forEach((link) => link.addEventListener("click", () => setDrawer(false)));

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (drawer && drawer.classList.contains("is-open")) setDrawer(false);
      closeWa();
    }
  });

  /* ---------- Barra de progreso de lectura ---------- */
  const scrollBar = $("#scrollProgress");
  if (scrollBar) {
    const updateProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0) {
        const pct = Math.min(100, Math.max(0, (window.scrollY / max) * 100));
        scrollBar.style.width = pct + "%";
      }
    };
    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();
  }

  /* ---------- Efecto 3D Tilt suave en el Hero ---------- */
  const heroArt = $(".hero__art");
  const heroSec = $(".hero");
  if (heroArt && heroSec && !reduceMotion && window.matchMedia("(min-width: 900px)").matches) {
    heroSec.addEventListener("mousemove", (e) => {
      const rect = heroArt.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      if (Math.abs(dx) <= 1.4 && Math.abs(dy) <= 1.4) {
        heroArt.style.transform = `rotateX(${-dy * 4}deg) rotateY(${dx * 5}deg)`;
      }
    });
    heroSec.addEventListener("mouseleave", () => {
      heroArt.style.transform = "";
    });
  }

  /* ---------- Animación de micro-interacción al añadir al carrito ---------- */
  document.addEventListener("click", (e) => {
    const addBtn = e.target.closest("[data-add-cart]");
    if (addBtn) {
      const cartToggle = $("#cartToggle");
      const cartCount = $("#cartCount");
      if (cartToggle) {
        cartToggle.classList.remove("is-bumped");
        void cartToggle.offsetWidth;
        cartToggle.classList.add("is-bumped");
        window.setTimeout(() => cartToggle.classList.remove("is-bumped"), 450);
      }
      if (cartCount) {
        cartCount.classList.remove("is-bumped");
        void cartCount.offsetWidth;
        cartCount.classList.add("is-bumped");
        window.setTimeout(() => cartCount.classList.remove("is-bumped"), 450);
      }
    }
  });

  /* ---------- Aparición al hacer scroll ---------- */
  const revealTargets = $$(
    ".sec__head, .benefit, .feature__copy, .feature__media, .bcard, .banner-cta, " +
    ".steps li, .about__copy, .about__media, .promise, .insta__head, .insta__showcase, " +
    ".contact__info, .contact__form, .faq__item, .rail .pcard, #catalog .pcard"
  );

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealTargets.forEach((el) => el.classList.add("is-in"));
  } else {
    revealTargets.forEach((el, i) => {
      el.classList.add("reveal");
      el.style.transitionDelay = (Math.min(i % 4, 3) * 70) + "ms";
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add("is-in");
        io.unobserve(el);
        // Al terminar, devolvemos la tarjeta a su estado normal
        // (para que el :hover no quede bloqueado por las clases del reveal).
        window.setTimeout(() => {
          el.classList.remove("reveal", "is-in");
          el.style.transitionDelay = "";
        }, 1100);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    revealTargets.forEach((el) => io.observe(el));

    // Red de seguridad: si por cualquier motivo el observador no dispara,
    // el contenido se muestra igual pasado un momento.
    window.setTimeout(() => {
      revealTargets.forEach((el) => {
        if (!el.classList.contains("is-in")) {
          el.classList.add("is-in");
          el.classList.remove("reveal");
        }
      });
    }, 2800);
  }

  /* ---------- Carrusel de la sección Diseño ---------- */
  $$("[data-rail]").forEach((rail) => {
    const section = rail.closest(".sec");
    const prev = section ? $("[data-rail-prev]", section) : null;
    const next = section ? $("[data-rail-next]", section) : null;
    const step = () => {
      const card = rail.firstElementChild;
      return card ? card.getBoundingClientRect().width + 18 : rail.clientWidth * 0.8;
    };
    if (prev) prev.addEventListener("click", () => rail.scrollBy({ left: -step() * 1.6, behavior: "smooth" }));
    if (next) next.addEventListener("click", () => rail.scrollBy({ left: step() * 1.6, behavior: "smooth" }));
  });

  /* ---------- Filtros del catálogo ---------- */
  const chips = $$(".chip[data-filter]");
  const empty = $("#catalogEmpty");

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const filter = chip.dataset.filter;
      chips.forEach((c) => {
        const active = c === chip;
        c.classList.toggle("is-active", active);
        c.setAttribute("aria-pressed", String(active));
      });

      const cards = $$("#catalog .pcard");
      cards.forEach((c) => c.classList.add("is-animating"));

      window.setTimeout(() => {
        let visible = 0;
        cards.forEach((card) => {
          const show = filter === "all" || card.dataset.cat === filter;
          card.classList.toggle("is-hidden", !show);
          if (show) visible++;
        });
        if (empty) empty.hidden = visible !== 0;

        window.requestAnimationFrame(() => {
          cards.forEach((c) => c.classList.remove("is-animating"));
        });
      }, 120);
    });
  });

  /* ---------- Pestañas con formularios Tally ---------- */
  const tabs = $$(".tab[data-tally]");
  const loadPanel = (tab) => {
    const panel = document.getElementById(tab.getAttribute("aria-controls"));
    if (!panel) return;
    const iframe = $("iframe", panel);
    if (iframe && !iframe.getAttribute("src")) iframe.src = tab.dataset.tally;
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-selected", String(active));
        const panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) {
          panel.classList.toggle("is-active", active);
          panel.hidden = !active;
        }
      });
      loadPanel(tab);
    });
  });

  // Carga diferida: el formulario activo se inyecta solo cuando la sección
  // está cerca de la pantalla, para no frenar la primera carga.
  const contact = $("#contacto");
  if (contact && tabs.length) {
    const lazyTabs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const active = tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs[0];
        loadPanel(active);
        lazyTabs.disconnect();
      });
    }, { rootMargin: "600px" });
    lazyTabs.observe(contact);
  }

  /* ---------- WhatsApp flotante ---------- */
  const waBtn = $("#waBtn");
  const waMenu = $("#waMenu");

  function closeWa() {
    if (!waBtn || !waMenu) return;
    waMenu.hidden = true;
    waBtn.setAttribute("aria-expanded", "false");
  }

  if (waBtn && waMenu) {
    waBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = waMenu.hidden;
      waMenu.hidden = !willOpen;
      waBtn.setAttribute("aria-expanded", String(willOpen));
    });
    document.addEventListener("click", (e) => {
      if (!waMenu.hidden && !waMenu.contains(e.target) && e.target !== waBtn) closeWa();
    });
  }

  /* ---------- Copiar datos de pago ---------- */
  $$("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const valor = btn.dataset.copy;
      const original = btn.textContent;
      const confirmar = () => {
        btn.textContent = "¡Copiado!";
        btn.classList.add("is-done");
        window.setTimeout(() => {
          btn.textContent = original;
          btn.classList.remove("is-done");
        }, 1800);
      };

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(valor);
        } else {
          // Respaldo para file:// o navegadores viejos
          const area = document.createElement("textarea");
          area.value = valor;
          area.setAttribute("readonly", "");
          area.style.position = "fixed";
          area.style.opacity = "0";
          document.body.appendChild(area);
          area.select();
          document.execCommand("copy");
          document.body.removeChild(area);
        }
        confirmar();
      } catch (err) {
        btn.textContent = "Copia manual: " + valor;
      }
    });
  });

  /* ---------- Modal de políticas ---------- */
  const dialog = $("#policies");
  if (dialog) {
    const blocks = $$("[data-policies]", dialog);
    const title = $("#policiesTitle");
    const titles = { privacidad: "Política de privacidad", condiciones: "Condiciones de pedido" };

    const open = (key) => {
      blocks.forEach((b) => { b.hidden = b.dataset.policies !== key; });
      if (title) title.textContent = titles[key] || "Información";
      dialog.showModal();
      document.body.style.overflow = "hidden";
    };

    dialog.addEventListener("close", () => { document.body.style.overflow = ""; });
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });

    $$("[data-open-policies]").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        open(link.dataset.openPolicies);
      });
    });
    $$("[data-close-policies]").forEach((btn) => btn.addEventListener("click", () => dialog.close()));
  }
})();

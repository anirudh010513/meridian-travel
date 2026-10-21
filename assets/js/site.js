/* =============================================================================
   Site behaviour — nav, reveal, catalogue rendering, filters, formatting.
   Vanilla, no dependencies. Every renderer is defensive: if the catalogue is
   missing, the page shows an honest empty state instead of a blank hole.
   ========================================================================== */
(function () {
  const C = window.CATALOG || { destinations: [], packages: [], styles: [] };
  const inr = (n) =>
    "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

  const el = (html) => {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };

  const bySlug = (list, slug) => list.find((x) => x.slug === slug);

  // ── nav ──────────────────────────────────────────────────────────────────
  const toggle = document.querySelector(".nav-toggle");
  const navEl = document.getElementById("primary-nav");
  if (toggle && navEl) {
    toggle.addEventListener("click", () => {
      const open = navEl.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "Close" : "Menu";
    });
    navEl.addEventListener("click", (e) => {
      if (e.target.tagName === "A") {
        navEl.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "Menu";
      }
    });
  }

  const hdr = document.querySelector(".site-header");
  if (hdr) {
    const onScroll = () => hdr.classList.toggle("is-stuck", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // ── reveal on scroll ─────────────────────────────────────────────────────
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("is-visible");
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    document.querySelectorAll("[data-reveal]").forEach((n) => io.observe(n));
  } else {
    document.querySelectorAll("[data-reveal]").forEach((n) => n.classList.add("is-visible"));
  }

  // ── accordion ────────────────────────────────────────────────────────────
  document.querySelectorAll(".acc__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") === "true";
      const panel = document.getElementById(btn.getAttribute("aria-controls"));
      btn.setAttribute("aria-expanded", open ? "false" : "true");
      if (panel) panel.classList.toggle("is-open", !open);
    });
  });

  // ── card renderers ───────────────────────────────────────────────────────
  function destCard(d, wide) {
    return el(`
      <a class="dest${wide ? " dest--wide" : ""}" href="destination.html?d=${d.slug}" data-reveal>
        <img src="assets/img/${d.img}" alt="${d.name}" loading="lazy" width="600" height="800">
        <span class="dest__tag">${d.tag}</span>
        <span class="dest__body">
          <span class="dest__name">${d.name}</span>
          <span class="dest__meta">${d.country} · from ${inr(d.from)}</span>
        </span>
      </a>
    `);
  }

  function pkgCard(p) {
    const d = bySlug(C.destinations, p.dest) || { name: "Journey", img: "kerala.jpg" };
    return el(`
      <a class="pkg" href="package.html?p=${p.slug}" data-reveal>
        <div class="pkg__media"><img src="assets/img/${d.img}" alt="${d.name}" loading="lazy"></div>
        <div class="pkg__body">
          <span class="pkg__eyebrow">${p.nights} nights · ${p.style}</span>
          <h3 class="pkg__title">${p.title}</h3>
          <p class="pkg__meta">${p.summary}</p>
          <div class="pkg__foot">
            <span class="pkg__price">${inr(p.priceFrom)}<small>indicative, per person</small></span>
            <span class="link-arrow">View</span>
          </div>
        </div>
      </a>
    `);
  }

  // ── homepage grids ───────────────────────────────────────────────────────
  const feat = document.getElementById("featured-destinations");
  if (feat) {
    const picks = ["kerala", "ladakh", "rajasthan", "bali", "kashmir", "thailand"];
    feat.innerHTML = "";
    picks.forEach((s, i) => {
      const d = bySlug(C.destinations, s);
      if (d) feat.append(destCard(d, i === 0 || i === 3));
    });
  }

  const featPkg = document.getElementById("featured-packages");
  if (featPkg) {
    featPkg.innerHTML = "";
    C.packages.slice(0, 3).forEach((p) => featPkg.append(pkgCard(p)));
  }

  const styleGrid = document.getElementById("style-grid");
  if (styleGrid) {
    styleGrid.innerHTML = "";
    C.styles.forEach((s) => {
      styleGrid.append(
        el(`
        <a class="style-card" href="plan.html?style=${s.id}" data-reveal>
          <h3>${s.name}</h3>
          <p>${s.line}</p>
          <span class="tick">Start here</span>
        </a>
      `)
      );
    });
  }

  // ── destinations page ────────────────────────────────────────────────────
  const dGrid = document.getElementById("destination-grid");
  if (dGrid) {
    dGrid.innerHTML = "";
    C.destinations.forEach((d) => dGrid.append(destCard(d)));

    const filterWrap = document.getElementById("dest-filters");
    const regional = ["all", "india", "international"];
    const styleKeys = Array.from(new Set(C.destinations.flatMap((d) => d.styles)));
    let activeRegion = "all";
    let activeStyle = null;

    function apply() {
      const items = C.destinations.filter(
        (d) =>
          (activeRegion === "all" || d.region === activeRegion) &&
          (!activeStyle || d.styles.includes(activeStyle))
      );
      dGrid.innerHTML = "";
      if (!items.length) {
        dGrid.append(
          el(`<div class="empty-state" style="grid-column:1/-1"><p>No destinations match that combination yet. Tell us where you want to go and we will build it.</p></div>`)
        );
        return;
      }
      items.forEach((d) => dGrid.append(destCard(d)));
    }

    if (filterWrap) {
      const row1 = el('<div class="filters" role="group" aria-label="Region"></div>');
      regional.forEach((r) => {
        const b = el(`<button type="button" aria-pressed="${r === "all"}">${r === "all" ? "All destinations" : r === "india" ? "India" : "International"}</button>`);
        b.addEventListener("click", () => {
          activeRegion = r;
          row1.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false"));
          b.setAttribute("aria-pressed", "true");
          apply();
        });
        row1.append(b);
      });
      const row2 = el('<div class="filters" role="group" aria-label="Travel style"></div>');
      styleKeys.forEach((s) => {
        const b = el(`<button type="button" aria-pressed="false">${s}</button>`);
        b.addEventListener("click", () => {
          activeStyle = activeStyle === s ? null : s;
          row2.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false"));
          if (activeStyle) b.setAttribute("aria-pressed", "true");
          apply();
        });
        row2.append(b);
      });
      filterWrap.append(row1, row2);
    }
    apply();
  }

  // ── packages page ────────────────────────────────────────────────────────
  const pGrid = document.getElementById("package-grid");
  if (pGrid) {
    let activeStyle = "all";
    function applyP() {
      const items = C.packages.filter((p) => activeStyle === "all" || p.style === activeStyle);
      pGrid.innerHTML = "";
      if (!items.length) {
        pGrid.append(el(`<div class="empty-state" style="grid-column:1/-1"><p>Nothing published in that category yet.</p></div>`));
        return;
      }
      items.forEach((p) => pGrid.append(pkgCard(p)));
    }
    const f = document.getElementById("pkg-filters");
    if (f) {
      ["all", ...Array.from(new Set(C.packages.map((p) => p.style)))].forEach((s) => {
        const b = el(`<button type="button" aria-pressed="${s === "all"}">${s === "all" ? "All journeys" : s}</button>`);
        b.addEventListener("click", () => {
          activeStyle = s;
          f.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false"));
          b.setAttribute("aria-pressed", "true");
          applyP();
        });
        f.append(b);
      });
    }
    applyP();
  }

  // ── destination detail ───────────────────────────────────────────────────
  const dDetail = document.getElementById("destination-detail");
  if (dDetail) {
    const slug = new URLSearchParams(location.search).get("d") || "kerala";
    const d = bySlug(C.destinations, slug);
    if (!d) {
      document.getElementById("detail-shell").innerHTML =
        `<div class="wrap section"><div class="empty-state"><p>We do not have a page for that destination. <a href="destinations.html" style="text-decoration:underline">Browse all destinations</a>.</p></div></div>`;
    } else {
      document.title = d.name + " — XYZ Travels";
      const heroImg = document.getElementById("detail-img");
      if (heroImg) { heroImg.src = "assets/img/" + d.img; heroImg.alt = d.name; }
      document.getElementById("detail-name").textContent = d.name;
      document.getElementById("detail-meta").innerHTML = `
        <span>${d.country}</span><span>Best time: ${d.bestTime}</span>
        <span>${d.nights[0]}–${d.nights[1]} nights</span><span>From ${inr(d.from)} pp</span>`;
      document.getElementById("detail-blurb").textContent = d.blurb;
      document.getElementById("detail-highlights").innerHTML = d.highlights
        .map((h) => `<li>${h}</li>`)
        .join("");
      document.getElementById("detail-days").innerHTML = d.itinerary
        .map(
          ([title, body], i) => `
        <div class="itinerary__day">
          <span class="day">Day ${i + 1}</span>
          <div><h3>${title}</h3><p>${body}</p></div>
        </div>`
        )
        .join("");
      document.getElementById("detail-inclusions").innerHTML = d.inclusions.map((x) => `<li>${x}</li>`).join("");
      document.getElementById("detail-exclusions").innerHTML = d.exclusions.map((x) => `<li>${x}</li>`).join("");
      document.getElementById("detail-from").textContent = inr(d.from);
      const cta = document.getElementById("detail-cta");
      if (cta) cta.href = `plan.html?destination=${encodeURIComponent(d.name)}&style=${d.styles[0]}`;
      const related = document.getElementById("detail-related");
      if (related) {
        related.innerHTML = "";
        const rel = C.destinations.filter((x) => x.slug !== d.slug && x.region === d.region).slice(0, 4);
        rel.forEach((x) => related.append(destCard(x)));
      }
    }
  }

  // ── package detail ───────────────────────────────────────────────────────
  const pDetail = document.getElementById("package-detail");
  if (pDetail) {
    const slug = new URLSearchParams(location.search).get("p") || C.packages[0]?.slug;
    const p = bySlug(C.packages, slug);
    const d = p ? bySlug(C.destinations, p.dest) : null;
    if (!p) {
      document.getElementById("pkg-shell").innerHTML =
        `<div class="wrap section"><div class="empty-state"><p>That journey is not published. <a href="packages.html" style="text-decoration:underline">See all journeys</a>.</p></div></div>`;
    } else {
      document.title = p.title + " — XYZ Travels";
      const img = document.getElementById("pkg-img");
      if (img) { img.src = "assets/img/" + (d ? d.img : "kerala.jpg"); img.alt = p.title; }
      document.getElementById("pkg-title").textContent = p.title;
      document.getElementById("pkg-meta").innerHTML = `
        <span>${d ? d.name : "Custom"}</span><span>${p.nights} nights</span>
        <span>${p.style}</span><span>Best time: ${d ? d.bestTime : "on request"}</span>`;
      document.getElementById("pkg-summary").textContent = p.summary;
      document.getElementById("pkg-days").innerHTML = p.days
        .map(
          ([label, title, body]) => `
        <div class="itinerary__day"><span class="day">${label}</span>
        <div><h3>${title}</h3><p>${body}</p></div></div>`
        )
        .join("");
      document.getElementById("pkg-inclusions").innerHTML = p.inclusions.map((x) => `<li>${x}</li>`).join("");
      document.getElementById("pkg-exclusions").innerHTML = p.exclusions.map((x) => `<li>${x}</li>`).join("");
      document.getElementById("pkg-from").textContent = inr(p.priceFrom);
      const cta = document.getElementById("pkg-cta");
      if (cta)
        cta.href = `plan.html?destination=${encodeURIComponent(d ? d.name : "")}&style=${p.style}&notes=${encodeURIComponent(
          "Interested in: " + p.title
        )}`;
    }
  }

  // ── homepage search → planner prefill ────────────────────────────────────
  const search = document.getElementById("search-form");
  if (search) {
    search.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(search);
      const q = new URLSearchParams();
      ["destination", "origin", "startDate", "adults"].forEach((k) => {
        const v = String(fd.get(k) || "").trim();
        if (v) q.set(k, v);
      });
      location.href = "plan.html" + (q.toString() ? "?" + q.toString() : "");
    });
    const destSel = search.querySelector('[name="destination"]');
    if (destSel) {
      C.destinations.forEach((d) => destSel.append(new Option(d.name, d.name)));
    }
  }

  // expose helpers for the other modules
  window.MERIDIAN = { inr, bySlug, el, catalog: C };
})();

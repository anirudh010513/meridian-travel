/* =============================================================================
   Personalised trip planner — 6 steps, validated, real submission.
   -----------------------------------------------------------------------------
   The submit button posts to POST /api/public/enquiries, which writes a real
   lead + trip_request into the Babuba travel pipeline. If that endpoint is not
   reachable (site opened from disk, gateway down), the form says so and does
   NOT claim success. There is no client-side "pretend we saved it" path.
   ========================================================================== */
(function () {
  const form = document.getElementById("planner-form");
  if (!form) return;

  // Absolute base for the travel platform API. Empty string = same origin,
  // which is correct when the site is served BY the gateway. On GitHub Pages
  // the site is a different origin, so assets/js/api-config.js sets this.
  const API_BASE = (window.MERIDIAN_API || "").replace(/\/$/, "");

  const M = window.MERIDIAN || {};
  const C = M.catalog || { destinations: [] };
  const steps = Array.from(form.querySelectorAll(".form-step"));
  const stepList = Array.from(document.querySelectorAll(".planner__step"));
  const bar = document.getElementById("progress-bar");
  const alertBox = document.getElementById("form-alert");
  const backBtn = document.getElementById("btn-back");
  const nextBtn = document.getElementById("btn-next");
  const submitBtn = document.getElementById("btn-submit");
  const reviewBox = document.getElementById("review-box");
  const confirmBox = document.getElementById("confirm-box");
  const panel = document.getElementById("form-panel");

  let current = 0;
  const DRAFT_KEY = "meridian.enquiry.draft.v1";
  const KEY_KEY = "meridian.enquiry.key.v1";

  // One idempotency key per form session. A double click, a refresh-and-resubmit
  // or a retry after a timeout reuses it — the backend then returns the SAME
  // reference instead of creating a second lead.
  let idempotencyKey = sessionStorage.getItem(KEY_KEY);
  if (!idempotencyKey) {
    idempotencyKey =
      (window.crypto && crypto.randomUUID && crypto.randomUUID()) ||
      "k-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem(KEY_KEY, idempotencyKey);
  }

  // ── prefill from query string / saved draft ──────────────────────────────
  const params = new URLSearchParams(location.search);
  const prefill = {
    destination: params.get("destination"),
    origin: params.get("origin"),
    startDate: params.get("startDate"),
    adults: params.get("adults"),
    notes: params.get("notes"),
    style: params.get("style"),
  };
  Object.entries(prefill).forEach(([k, v]) => {
    if (!v) return;
    if (k === "style") {
      const cb = form.querySelector(`input[name="style"][value="${CSS.escape(v)}"]`);
      if (cb) cb.checked = true;
    } else {
      const field = form.elements[k];
      if (field && !field.value) field.value = v;
    }
  });

  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    if (draft) {
      Object.entries(draft).forEach(([k, v]) => {
        const field = form.elements[k];
        if (field && !field.value && typeof v === "string") field.value = v;
      });
    }
  } catch {}

  form.addEventListener("input", () => {
    const data = {};
    Array.from(form.elements).forEach((f) => {
      if (f.name && (f.type === "text" || f.type === "email" || f.type === "tel" || f.type === "date" || f.type === "number" || f.tagName === "TEXTAREA")) {
        data[f.name] = f.value;
      }
    });
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch {}
    nextBtn?.removeAttribute("data-blocked");
  });

  // ── validation ───────────────────────────────────────────────────────────
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const phoneRe = /^[+]?[\d\s()-]{7,20}$/;

  function setError(name, msg) {
    const err = form.querySelector(`[data-error-for="${name}"]`);
    const field = form.elements[name];
    if (err) {
      err.textContent = msg || "";
      err.classList.toggle("is-shown", !!msg);
    }
    if (field && field.setAttribute) field.setAttribute("aria-invalid", msg ? "true" : "false");
    return !msg;
  }

  const validators = {
    0: () => {
      const ok = [
        setError("name", (form.elements.name.value.trim().length >= 2) ? "" : "Please enter your full name."),
        setError("email", emailRe.test(form.elements.email.value.trim()) ? "" : "Please enter a valid email address."),
        setError(
          "phone",
          !form.elements.phone.value.trim() || phoneRe.test(form.elements.phone.value.trim())
            ? ""
            : "Please enter a valid phone number, or leave it blank."
        ),
      ];
      return ok.every(Boolean);
    },
    1: () => {
      const dest = form.elements.destination.value.trim();
      return setError("destination", dest ? "" : "Tell us where you would like to go. A region is enough.");
    },
    2: () => {
      const start = form.elements.startDate.value;
      const end = form.elements.endDate.value;
      const flexible = form.elements.flexible.checked;
      let ok = true;
      ok = setError("startDate", start || flexible ? "" : "Add a departure date, or tick flexible dates.") && ok;
      if (start && end && end < start) ok = setError("endDate", "Return date cannot be before departure.") && ok;
      else setError("endDate", "");
      return ok;
    },
    3: () => {
      const adults = Number(form.elements.adults.value || 0);
      const children = Number(form.elements.children.value || 0);
      let ok = true;
      ok = setError("adults", adults >= 1 && adults <= 20 ? "" : "Between 1 and 20 adults.") && ok;
      ok = setError("children", children >= 0 && children <= 10 ? "" : "Between 0 and 10 children.") && ok;
      return ok;
    },
    4: () => true,
    5: () => {
      let ok = true;
      if (!form.elements.consent.checked) {
        ok = setError("consent", "We need your agreement to use these details to reply to you.") && ok;
      } else setError("consent", "");
      return ok;
    },
  };

  // ── review ───────────────────────────────────────────────────────────────
  function collect() {
    const fd = new FormData(form);
    const styles = fd.getAll("style");
    return {
      name: String(fd.get("name") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      phone: String(fd.get("phone") || "").trim(),
      destination: String(fd.get("destination") || "").trim(),
      origin: String(fd.get("origin") || "").trim(),
      startDate: String(fd.get("startDate") || ""),
      endDate: String(fd.get("endDate") || ""),
      flexible: fd.get("flexible") === "on",
      adults: String(fd.get("adults") || "2"),
      children: String(fd.get("children") || "0"),
      budgetAmount: String(fd.get("budgetAmount") || ""),
      currency: String(fd.get("currency") || "INR"),
      budgetBand: String(fd.get("budgetBand") || "unstated"),
      accommodation: String(fd.get("accommodation") || ""),
      notes: String(fd.get("notes") || ""),
      style: styles,
      consent: fd.get("consent") === "on",
      idempotencyKey,
    };
  }

  function renderReview() {
    const d = collect();
    const rows = [
      ["Traveller", `${d.name} · ${d.email}${d.phone ? " · " + d.phone : ""}`],
      ["Destination", d.destination],
      ["Departure city", d.origin || "—"],
      ["Dates", d.flexible ? "Flexible" : `${d.startDate || "—"} → ${d.endDate || "—"}`],
      ["Travellers", `${d.adults} adult(s), ${d.children} child(ren)`],
      ["Budget", d.budgetAmount ? `${d.currency} ${Number(d.budgetAmount).toLocaleString()}` : "Not specified"],
      ["Style", d.style.length ? d.style.join(", ") : "Open"],
      ["Accommodation", d.accommodation || "No preference"],
      ["Notes", d.notes || "—"],
    ];
    reviewBox.innerHTML = rows
      .map(
        ([k, v]) => `<div class="review__row"><dt>${k}</dt><dd>${escapeHtml(String(v))}</dd></div>`
      )
      .join("");
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ── navigation ───────────────────────────────────────────────────────────
  function show(idx) {
    current = Math.max(0, Math.min(steps.length - 1, idx));
    steps.forEach((s, i) => s.classList.toggle("is-active", i === current));
    stepList.forEach((s, i) => {
      s.dataset.state = i < current ? "done" : i === current ? "current" : "todo";
    });
    if (bar) bar.style.width = ((current + 1) / steps.length) * 100 + "%";
    backBtn.hidden = current === 0;
    nextBtn.hidden = current === steps.length - 1;
    submitBtn.hidden = current !== steps.length - 1;
    if (current === steps.length - 1) renderReview();
    hideAlert();
    const h = steps[current].querySelector("h2");
    if (h) h.setAttribute("tabindex", "-1"), h.focus({ preventScroll: true });
    window.scrollTo({ top: panel.getBoundingClientRect().top + window.scrollY - 90, behavior: "smooth" });
  }

  function showAlert(msg, kind) {
    alertBox.className = "notice alert-box is-shown" + (kind === "error" ? " notice--error" : kind === "ok" ? " notice--ok" : "");
    alertBox.innerHTML = msg;
  }
  function hideAlert() {
    alertBox.className = "notice alert-box";
    alertBox.innerHTML = "";
  }

  nextBtn.addEventListener("click", () => {
    const v = validators[current];
    if (v && !v()) {
      const firstBad = form.querySelector('[aria-invalid="true"]');
      if (firstBad) firstBad.focus();
      return;
    }
    show(current + 1);
  });

  backBtn.addEventListener("click", () => show(current - 1));

  form.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
      if (current < steps.length - 1) nextBtn.click();
    }
  });

  // ── submit ───────────────────────────────────────────────────────────────
  submitBtn.addEventListener("click", async () => {
    if (!validators[5]()) return;
    const data = collect();
    submitBtn.disabled = true;
    const original = submitBtn.textContent;
    submitBtn.textContent = "Sending…";
    hideAlert();

    try {
      const res = await fetch(API_BASE + "/api/public/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok || !body.success) {
        if (res.status === 400 && body.fields) {
          const msgs = Object.values(body.fields).join(" ");
          showAlert(`<strong>Please check a few details.</strong><br>${escapeHtml(msgs)}`, "error");
        } else if (res.status === 429) {
          showAlert(
            `<strong>Too many submissions.</strong><br>${escapeHtml(body.error || "Please wait a few minutes and try again.")}`,
            "error"
          );
        } else {
          showAlert(
            `<strong>We could not save your enquiry.</strong><br>${escapeHtml(
              body.error || "The enquiry service did not respond."
            )} Nothing was recorded on our side.`,
            "error"
          );
        }
        submitBtn.disabled = false;
        submitBtn.textContent = original;
        return;
      }

      // success — the backend confirmed a committed row
      const reference = body.reference || body.tripRequestId || "";
      panel.innerHTML = `
        <div class="confirm">
          <div class="confirm__mark" aria-hidden="true">✓</div>
          <h2>Enquiry received</h2>
          <p class="lede" style="margin-inline:auto">Your reference is</p>
          <div class="ref">${escapeHtml(reference || "—")}</div>
          ${
            body.deduplicated
              ? `<div class="notice" style="text-align:left;max-width:520px;margin:1.25rem auto">
                   <strong>Already received.</strong> This submission matched one we had just taken, so no duplicate was created.
                 </div>`
              : ""
          }
          <p style="max-width:52ch;margin:1.25rem auto 0;color:rgba(17,26,23,.7);font-size:.92rem">
            The enquiry is now in the qualification queue. A consultant reviews it before any quotation is
            issued — you will not be sent an automated price. Keep this reference to check progress.
          </p>
          <div style="display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap;margin-top:1.75rem">
            <a class="btn" href="portal.html?ref=${encodeURIComponent(reference)}&email=${encodeURIComponent(data.email)}">Track this enquiry</a>
            <a class="btn btn--ghost" href="destinations.html">Keep exploring</a>
          </div>
        </div>`;
      localStorage.removeItem(DRAFT_KEY);
      sessionStorage.removeItem(KEY_KEY);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      showAlert(
        `<strong>No connection to the enquiry service.</strong><br>Your details were not sent. This is usually because the site was opened directly from a file, or the gateway is not running. Nothing was recorded.`,
        "error"
      );
      submitBtn.disabled = false;
      submitBtn.textContent = original;
    }
  });

  // ── mode banner (honest: demo vs live) ───────────────────────────────────
  const modeTag = document.getElementById("mode-tag");
  fetch(API_BASE + "/api/public/site")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("offline"))))
    .then((s) => {
      if (modeTag) {
        modeTag.dataset.state = "live";
        modeTag.innerHTML = `Connected to the travel platform · <strong>${s.mode === "live" ? "live" : "demo"}</strong> mode`;
      }
    })
    .catch(() => {
      if (modeTag) {
        modeTag.dataset.state = "offline";
        modeTag.innerHTML = `<strong>Offline preview</strong> — submissions cannot be saved from this copy of the site`;
      }
    });

  show(0);
})();

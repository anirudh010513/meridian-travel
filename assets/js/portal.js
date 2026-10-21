/* =============================================================================
   Trip status portal.
   -----------------------------------------------------------------------------
   Reads GET /api/public/enquiries/:ref?email= — the enquiry's OWN record only,
   matched on reference AND email. It cannot read another customer's data and
   it has no route to the admin console.

   Everything the platform does not yet serve to customers (proposal PDFs,
   invoices, payments, vouchers) is rendered as an explicit unavailable state.
   That is the honest state today — not a bug being hidden.
   ========================================================================== */
(function () {
  const form = document.getElementById("portal-form");
  if (!form) return;

  const result = document.getElementById("portal-result");
  const alertBox = document.getElementById("portal-alert");
  const btn = document.getElementById("portal-btn");
  const params = new URLSearchParams(location.search);

  if (params.get("ref")) form.elements.ref.value = params.get("ref").toUpperCase();
  if (params.get("email")) form.elements.email.value = params.get("email");

  const inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function alert(msg, kind) {
    alertBox.className = "notice alert-box is-shown" + (kind === "error" ? " notice--error" : " notice--ok");
    alertBox.innerHTML = msg;
  }

  const STATUS_COPY = {
    qualify: "In qualification",
    quote_draft: "Quotation being costed",
    proposal_sent: "Proposal sent",
    accepted: "Accepted — booking pending",
    booking_hold: "On hold",
    confirmed: "Confirmed",
    visa_cycle: "Visa stage",
    payments: "Payments",
    on_tour: "On tour",
    post_trip: "After your trip",
    closed: "Closed",
    lost: "Closed — not proceeding",
  };

  function render(data) {
    const e = data.enquiry;
    const quotes = data.quotes || [];
    const dest = Array.isArray(e.destination) ? e.destination.join(", ") : e.destination;
    const isEarly = ["qualify", "quote_draft"].includes(e.status);

    result.hidden = false;
    result.innerHTML = `
      <div class="aside-card" style="position:static;margin-bottom:1.5rem">
        <span class="badge ${isEarly ? "badge--wait" : "badge--ok"}">${esc(STATUS_COPY[e.status] || e.status)}</span>
        <h2 style="margin:.75rem 0 .25rem">${esc(dest || "Your trip")}</h2>
        <p class="muted" style="margin:0">Reference ${esc(e.reference)} · raised ${esc((e.createdAt || "").slice(0, 10))}</p>
        <dl style="margin:1.25rem 0 0">
          <div class="status-row"><dt>Departure city</dt><dd>${esc(e.origin || "—")}</dd></div>
          <div class="status-row"><dt>Dates</dt><dd>${esc(e.startDate || "flexible")}${e.endDate ? " → " + esc(e.endDate) : ""}</dd></div>
          <div class="status-row"><dt>Travellers</dt><dd>${esc(e.adults)} adult(s), ${esc(e.children)} child(ren)</dd></div>
          <div class="status-row"><dt>Budget band</dt><dd>${esc(e.budgetBand || "unstated")}</dd></div>
          <div class="status-row"><dt>Handled by</dt><dd>${esc(e.agent || "inquiry-desk")}</dd></div>
        </dl>
      </div>

      <h3 style="font-size:var(--step-1);margin-bottom:.75rem">Quotations</h3>
      ${
        quotes.length
          ? `<div class="aside-card" style="position:static">
               ${quotes
                 .map(
                   (q) => `<div class="status-row"><dt>${esc(q.id)} <span class="badge">${esc(q.status)}</span></dt>
                   <dd>${inr((q.sellTotalPaise || 0) / 100)}</dd></div>`
                 )
                 .join("")}
               <p class="muted" style="margin:.9rem 0 0">A quotation is not a confirmed booking. Nothing is committed to a supplier until you approve it in writing and the booking is confirmed.</p>
             </div>`
          : `<div class="empty-state"><p>No quotation has been issued yet. Your consultant reviews the enquiry first, then costs it. You will be contacted with a versioned proposal — not an automatic price.</p></div>`
      }

      <h3 style="font-size:var(--step-1);margin:2rem 0 .75rem">Bookings, documents &amp; payments</h3>
      <div class="aside-card" style="position:static;background:var(--sand);border-color:transparent">
        <p style="margin:0 0 .6rem;font-size:.9rem"><strong>Not available in this portal yet.</strong></p>
        <p class="muted" style="margin:0">${esc(data.unavailable?.bookings || "")}</p>
        <p class="muted" style="margin:.5rem 0 0">${esc(data.unavailable?.proposalPdf || "")}</p>
        <p class="muted" style="margin:.5rem 0 0">${esc(data.unavailable?.payments || "")}</p>
        <p class="muted" style="margin:.5rem 0 0">${esc(data.unavailable?.documents || "")}</p>
      </div>
    `;
  }

  async function lookup(e) {
    if (e) e.preventDefault();
    const ref = String(form.elements.ref.value || "").trim().toUpperCase();
    const email = String(form.elements.email.value || "").trim();
    alertBox.className = "notice alert-box";
    if (!ref || !email) {
      alert("Enter both the reference and the email you used.", "error");
      return;
    }
    btn.disabled = true;
    btn.textContent = "Checking…";
    try {
      const res = await fetch(`${(window.MERIDIAN_API || "").replace(/\/$/, "")}/api/public/enquiries/${encodeURIComponent(ref)}?email=${encodeURIComponent(email)}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) {
        result.hidden = true;
        alert(
          res.status === 404
            ? `<strong>No enquiry found.</strong><br>Check the reference and email. Both must match the submission.`
            : `<strong>Could not check status.</strong><br>${esc(body.error || "The status service did not respond.")}`,
          "error"
        );
        return;
      }
      render(body);
      const url = new URL(location.href);
      url.searchParams.set("ref", ref);
      url.searchParams.set("email", email);
      history.replaceState({}, "", url);
    } catch (err) {
      result.hidden = true;
      alert(
        `<strong>No connection to the platform.</strong><br>This copy of the site is not talking to the gateway, so no status can be read.`,
        "error"
      );
    } finally {
      btn.disabled = false;
      btn.textContent = "Check status";
    }
  }

  form.addEventListener("submit", lookup);
  if (params.get("ref") && params.get("email")) lookup();
})();

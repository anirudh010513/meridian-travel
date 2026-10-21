/* =============================================================================
   Shared chrome — header + footer are injected so 11 pages stay consistent.
   Relative paths only: the site is served from a sub-path (/site/) and must
   also open correctly straight from disk for local review.
   ========================================================================== */
(function () {
  const page = document.body.dataset.page || "";

  const nav = [
    ["destinations.html", "Destinations", "destinations"],
    ["packages.html", "Journeys", "packages"],
    ["index.html#ways", "Ways to travel", "ways"],
    ["about.html", "About", "about"],
    ["contact.html", "Contact", "contact"],
    ["portal.html", "Your trip", "portal"],
  ];

  const header = document.createElement("header");
  header.className = "site-header";
  header.innerHTML = `
    <div class="wrap site-header__bar">
      <a class="brand" href="index.html" aria-label="XYZ Travels home">
        <span class="brand__mark">XYZ Travels<span>.</span></span>
        <span class="brand__sub">Travel Co.</span>
      </a>
      <nav class="nav" id="primary-nav" aria-label="Primary">
        ${nav
          .map(
            ([href, label, key]) =>
              `<a href="${href}"${page === key ? ' aria-current="page"' : ""}>${label}</a>`
          )
          .join("")}
        <a class="nav__cta" href="plan.html">Plan a trip</a>
      </nav>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="primary-nav">Menu</button>
    </div>
  `;
  document.body.prepend(header);

  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML = `
    <div class="wrap">
      <div class="footer-grid">
        <div>
          <div class="footer-brand">XYZ Travels</div>
          <p class="footer-note">A travel studio built around one idea: a human approves every commitment before it happens.</p>
          <p class="footer-note" style="margin-top:1rem;opacity:.7">Placeholder brand. Company name, registration, address and contact details are to be confirmed with the client.</p>
        </div>
        <div>
          <h3>Explore</h3>
          <a href="destinations.html">Destinations</a>
          <a href="packages.html">Journeys</a>
          <a href="index.html#ways">Ways to travel</a>
          <a href="plan.html">Plan a trip</a>
        </div>
        <div>
          <h3>Company</h3>
          <a href="about.html">About us</a>
          <a href="contact.html">Contact</a>
          <a href="faq.html">Questions</a>
          <a href="portal.html">Your trip</a>
        </div>
        <div>
          <h3>Contact</h3>
          <span style="display:block;font-size:.88rem;padding-block:.28rem">hello@example.com</span>
          <span style="display:block;font-size:.88rem;padding-block:.28rem">+91 00000 00000</span>
          <span style="display:block;font-size:.88rem;padding-block:.28rem;opacity:.7">Details pending client confirmation</span>
          <a href="privacy.html" style="margin-top:.6rem">Privacy &amp; consent</a>
        </div>
      </div>
      <div class="footer-bottom">
        <span>&copy; <span id="year">2026</span> XYZ Travels — provisional brand for demonstration.</span>
        <span>Prices shown are indicative. Nothing on this site is a confirmed quotation or a booking.</span>
      </div>
    </div>
  `;
  document.body.append(footer);

  const y = document.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());
})();

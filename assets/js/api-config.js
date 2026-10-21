/* =============================================================================
   Travel platform API base — one place to change.
   -----------------------------------------------------------------------------
   The planner (assets/js/planner.js) and the enquiry portal (portal.js) call:
     POST /api/public/enquiries
     GET  /api/public/enquiries/:ref?email=
     GET  /api/public/site

   Empty string  = same origin. Correct when the site is served BY the gateway
                   (e.g. http://127.0.0.1:18793/...), because the API is there.
   Absolute URL  = required when the site is served from a different origin such
                   as GitHub Pages, otherwise those calls hit the static host and
                   return its 404 page instead of reaching the platform.

   >>> PRODUCTION: replace PLATFORM_BASE with the public https gateway URL
   >>> (a tunnel or a real domain). An http:// 127.0.0.1 address only works on
   >>> the machine running the gateway — Chrome permits it because localhost is
   >>> treated as a secure context. A customer's browser will not reach it.
   ========================================================================== */
(function () {
  var PLATFORM_BASE = "http://127.0.0.1:18793";

  var servedByGateway =
    location.port === "18793" ||
    /^\/(admin|api)\//.test(location.pathname);

  window.MERIDIAN_API = servedByGateway ? "" : PLATFORM_BASE;

  // Surface the decision in the console — silent misconfiguration is what made
  // the forms look connected while every submission was going to the 404 page.
  if (window.console && console.info) {
    console.info(
      "[meridian] API base: " +
        (window.MERIDIAN_API || "(same origin)")
    );
  }
})();

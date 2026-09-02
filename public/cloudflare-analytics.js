// Keep the existing Pages RUM dataset used by the weekly report after moving to Workers.
if (["www.seung-woo.me", "seung-woo.me"].includes(window.location.hostname)) {
  const beacon = document.createElement("script");
  beacon.id = "cloudflare-rum-beacon";
  beacon.defer = true;
  beacon.src = "https://static.cloudflareinsights.com/beacon.min.js";
  beacon.setAttribute("data-cf-beacon", JSON.stringify({ token: "7638c47570614969b00e3429d1419f48" }));
  document.body.appendChild(beacon);
}

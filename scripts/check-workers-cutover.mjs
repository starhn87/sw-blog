import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

export async function checkWorkersCutover(account, token, fetcher = fetch) {
  assert.ok(account && token, "Cloudflare account and deployment token are required");
  const api = async (path) => {
    const response = await fetcher(`https://api.cloudflare.com/client/v4/accounts/${account}${path}`, {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000),
    });
    assert.equal(response.status, 200, `Cloudflare preflight request failed: ${path}`);
    const data = await response.json();
    assert.equal(data.success, true, `Cloudflare preflight response failed: ${path}`);
    return data.result;
  };
  const [pages, domains, settings] = await Promise.all([
    api("/pages/projects/sw-blog"), api("/workers/domains"), api("/workers/scripts/sw-blog/settings"),
  ]);
  assert.equal(pages.source.config.production_deployments_enabled, false, "Disable Pages production builds before Workers cutover");
  assert.equal(pages.source.config.preview_deployment_setting, "none", "Disable legacy Pages preview builds before Workers cutover");
  for (const hostname of ["www.seung-woo.me", "seung-woo.me"]) {
    assert.ok(!pages.domains.includes(hostname), "Detach production hostnames from Pages before enabling automation");
    assert.ok(domains.some(domain => domain.hostname === hostname && domain.service === "sw-blog"), "Production hostname must belong to sw-blog Worker");
  }
  for (const name of ["ANTHROPIC_API_KEY", "ADMIN_PASSWORD", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"]) {
    assert.ok(settings.bindings.some(binding => binding.name === name && binding.type === "secret_text"), `Missing runtime secret: ${name}`);
  }
  console.log("Pages builds disabled; production domains and runtime secrets belong to the Workers deployment.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await checkWorkersCutover(process.env.CLOUDFLARE_ACCOUNT_ID, process.env.CLOUDFLARE_API_TOKEN);
}

import assert from "node:assert/strict";
import test from "node:test";
import { declaredFavicons, publicFaviconAddress } from "../src/provider-favicon.ts";
import { providerWebsiteHost } from "../../shared/provider-website.ts";

test("provider endpoints resolve to website hosts without endpoint paths, keys, or local addresses", () => {
  assert.equal(providerWebsiteHost("https://api.numes.ai/api/v1?token=placeholder"), "numes.ai");
  assert.equal(providerWebsiteHost("https://api-v2.example.co.uk:9443/v1"), "example.co.uk");
  assert.equal(providerWebsiteHost("https://tenant.example.org/v1"), "tenant.example.org");
  assert.equal(providerWebsiteHost("https://api.ai/v1"), "api.ai");
  for (const url of [
    "http://localhost:1234/v1", "http://127.0.0.1/v1", "http://[::1]/v1", "http://workstation.local/v1",
    "https://name:secret@api.example.org/v1", "file:///example.org",
  ]) assert.equal(providerWebsiteHost(url), undefined);
});

test("homepage icons precede touch icons and resolve relative or CDN links", () => {
  const page = new URL("https://www.example.com/home/");
  const html = `<head>
    <link rel="apple-touch-icon" href="/touch.png">
    <!-- <link rel="icon" href="/comment.png"> -->
    <script>const fake = '<link rel="icon" href="/script.png">';</script>
    <link href="//assets.example.com/mark.svg?mode=light&amp;size=32#fragment" rel="shortcut icon">
    <link REL='icon' HREF=relative.png>
    <link rel="icon" href="https://127.0.0.1/private.svg">
    <link rel="icon" href="https://name:pass@example.net/private.svg">
  </head><body><link rel="icon" href="/body.png"></body>`;
  assert.deepEqual(declaredFavicons(html, page), [
    "https://assets.example.com/mark.svg?mode=light&size=32",
    "https://www.example.com/home/relative.png",
    "https://www.example.com/touch.png",
  ]);
});

test("favicon requests can connect only to public DNS answers", () => {
  for (const address of ["127.0.0.1", "10.20.30.40", "169.254.169.254", "100.64.5.2", "172.16.1.1", "192.168.1.1", "224.0.0.1", "255.255.255.255"])
    assert.equal(publicFaviconAddress(address, 4), false);
  for (const address of ["::1", "::ffff:127.0.0.1", "fd00::1", "fe80::1", "2001:db8::1", "2002::1"])
    assert.equal(publicFaviconAddress(address, 6), false);
  assert.equal(publicFaviconAddress("104.18.1.1", 4), true);
  assert.equal(publicFaviconAddress("2606:4700::1", 6), true);
});

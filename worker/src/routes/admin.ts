// FB6 workshop moderasyon sayfası: GET /admin/workshop. Statik sayfa; içinde sır yok. Yönetici anahtarı sayfaya elle girilir,
// sadece bu sekmenin sessionStorage'ında durur ve /v1/workshop/pending|review|moderate'e Bearer olarak gider (aynı origin).
// Paket içeriği kullanıcı yüklemesi: HTML olarak asla yorumlanmaz (her şey textContent), görseller data: URL'si.
// Renkler ui-kit paleti; köşe yok, gradyan yok.
const PAGE = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>workshop moderasyon</title>
<style>
:root{--ink:#2B1E2F;--main:#F2A65A;--cream:#FFF1D6;--light:#FFD29A;--paper:#FFFFFF}
body{margin:0;background:var(--main);color:var(--ink);font:14px/1.45 system-ui,sans-serif}
main{max-width:980px;margin:20px auto;padding:0 16px}
.win{background:var(--cream);border:2px solid var(--ink);box-shadow:4px 4px 0 var(--ink);margin-bottom:16px}
.bar{background:var(--light);border-bottom:2px solid var(--ink);padding:6px 10px;font-weight:700;display:flex;justify-content:space-between;gap:8px}
.pad{padding:12px}
button,input{font:inherit;color:var(--ink);border:2px solid var(--ink);background:var(--paper);padding:5px 10px}
button{cursor:pointer;background:var(--light)} button.ok{background:var(--main)} button:disabled{opacity:.5}
pre{white-space:pre-wrap;word-break:break-word;background:var(--paper);border:2px solid var(--ink);padding:8px;max-height:260px;overflow:auto;font-size:12px}
img{image-rendering:pixelated;border:2px solid var(--ink);background:var(--paper);max-width:192px}
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.dim{opacity:.7}
</style></head><body><main>
<div class="win"><div class="bar"><span>workshop moderasyon</span><span id="count"></span></div>
<div class="pad row"><input id="token" type="password" placeholder="yönetici anahtarı" autocomplete="off" size="40"><button id="load">bekleyenleri getir</button><span id="msg" class="dim"></span></div></div>
<div id="list"></div>
<template id="tpl"><div class="win"><div class="bar"><span class="name"></span><span class="meta dim"></span></div><div class="pad">
<p class="desc"></p><div class="files"></div>
<div class="row"><button class="ok approve">onayla</button><button class="ok premium">onayla (pro)</button><button class="reject">reddet</button></div>
</div></div></template>
<script>
const $ = (s) => document.querySelector(s);
const tok = () => sessionStorage.getItem("ws_admin") || "";
$("#token").value = tok();
const api = async (path, init = {}) => {
  const r = await fetch(path, { ...init, headers: { ...(init.headers || {}), authorization: "Bearer " + tok(), "content-type": "application/json" } });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || String(r.status));
  return r.json();
};
function fileView(f) {
  const box = document.createElement("div");
  const h = document.createElement("p"); h.textContent = f.path + " · " + f.size + " B"; h.className = "dim"; box.append(h);
  if (typeof f.base64 === "string" && f.path.toLowerCase().endsWith(".png") && f.base64.startsWith("iVBORw0KGgo")) {
    const img = document.createElement("img"); img.alt = f.path; img.src = "data:image/png;base64," + f.base64; box.append(img);
  } else if (typeof f.text === "string") {
    const pre = document.createElement("pre"); pre.textContent = f.text; box.append(pre);
  }
  return box;
}
async function load() {
  sessionStorage.setItem("ws_admin", $("#token").value.trim());
  $("#msg").textContent = "yükleniyor"; $("#list").replaceChildren();
  try {
    const { items } = await api("/v1/workshop/pending");
    $("#count").textContent = items.length + " bekliyor"; $("#msg").textContent = items.length ? "" : "kuyruk boş";
    for (const it of items) {
      const node = $("#tpl").content.firstElementChild.cloneNode(true);
      node.querySelector(".name").textContent = it.name.tr + " / " + it.name.en + " (" + it.id + ")";
      node.querySelector(".meta").textContent = "@" + it.author + " · " + it.kinds.join(", ") + " · " + it.bytes + " B · " + it.createdAt.slice(0, 10);
      node.querySelector(".desc").textContent = (it.description.tr || "") + " / " + (it.description.en || "");
      api("/v1/workshop/review/" + encodeURIComponent(it.id)).then(({ pack }) => node.querySelector(".files").replaceChildren(...pack.files.map(fileView))).catch(() => {});
      const act = (status, premium) => async () => {
        node.querySelectorAll("button").forEach((b) => (b.disabled = true));
        try { await api("/v1/workshop/moderate", { method: "POST", body: JSON.stringify({ id: it.id, status, premium }) }); node.remove(); }
        catch (e) { $("#msg").textContent = "olmadı: " + e.message; node.querySelectorAll("button").forEach((b) => (b.disabled = false)); }
      };
      node.querySelector(".approve").onclick = act("approved", false);
      node.querySelector(".premium").onclick = act("approved", true);
      node.querySelector(".reject").onclick = act("rejected", false);
      $("#list").append(node);
    }
  } catch (e) { $("#msg").textContent = "olmadı: " + e.message; }
}
$("#load").onclick = load;
</script></main></body></html>`;

export function handleAdminWorkshop(): Response {
  return new Response(PAGE, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      // tek sayfa: kendi satır içi betiği, sadece aynı origin'e istek, gömülemez
      "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
}

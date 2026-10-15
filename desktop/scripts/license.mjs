// Dunno Pro lisans araçları (SPEC 15). Özel anahtar ASLA repoya girmez: sadece ortam değişkeninden okunur.
//   node scripts/license.mjs keygen          -> açık anahtar (DUNNO_LICENSE_PUBKEY, derlemeye) + özel anahtar PEM (gizli sakla)
//   DUNNO_LICENSE_PRIVATE_KEY="$(cat pro.pem)" node scripts/license.mjs issue   -> yeni lisans anahtarı (DUNNO1....)
//   ... issue --packs halloween,cyberpunk        -> Pro + paketler;  issue --tier packs --packs halloween -> sadece paket
// Lisans içeriği: rastgele kimlik + tür + tarih. Kişisel veri (ad, e-posta) yok.
import { createPrivateKey, generateKeyPairSync, randomBytes, sign } from "node:crypto";

const b64url = (b) => Buffer.from(b).toString("base64url");

/** tier "pro" (abonelik) ya da "packs" (SPEC 18: sadece tek seferlik kozmetik paketler; packs dolu olmalı) */
export function issue(privatePem, now = new Date(), id = `lic_${randomBytes(8).toString("hex")}`, { tier = "pro", packs = [] } = {}) {
  const payload = { v: 1, id, tier, issued: now.toISOString().slice(0, 10), ...(packs.length ? { packs } : {}) };
  const body = JSON.stringify(payload);
  const sig = sign(null, Buffer.from(body), createPrivateKey(privatePem));
  return `DUNNO1.${b64url(body)}.${b64url(sig)}`;
}

export function keygen() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const raw = Buffer.from(publicKey.export({ format: "jwk" }).x, "base64url");
  return { pubkey: raw.toString("base64"), privatePem: privateKey.export({ format: "pem", type: "pkcs8" }).toString() };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = process.argv[2];
  if (cmd === "keygen") {
    const k = keygen();
    console.log(`DUNNO_LICENSE_PUBKEY=${k.pubkey}\n\n# özel anahtar: repoya koyma, güvenli yerde sakla\n${k.privatePem}`);
  } else if (cmd === "issue") {
    const pem = process.env.DUNNO_LICENSE_PRIVATE_KEY;
    if (!pem) {
      console.error("DUNNO_LICENSE_PRIVATE_KEY yok");
      process.exit(1);
    }
    const arg = (name) => {
      const i = process.argv.indexOf(`--${name}`);
      return i > 0 ? process.argv[i + 1] : undefined;
    };
    const packs = (arg("packs") ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    console.log(issue(pem, new Date(), undefined, { tier: arg("tier") ?? "pro", packs }));
  } else {
    console.error("kullanım: node scripts/license.mjs keygen | issue");
    process.exit(1);
  }
}

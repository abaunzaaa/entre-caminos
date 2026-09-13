const path = require("path");
const { createHash } = require("crypto");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim() || "";
const key = process.env.CLOUDINARY_API_KEY?.trim() || "";
const secret = process.env.CLOUDINARY_API_SECRET?.trim() || "";

async function tryUpload(withFolder) {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "entre-caminos/experiences";
  const params = withFolder ? `folder=${folder}&timestamp=${timestamp}` : `timestamp=${timestamp}`;
  const signature = createHash("sha1").update(`${params}${secret}`).digest("hex");
  const form = new FormData();
  form.append("file", new Blob([png], { type: "image/png" }), "probe.png");
  form.append("api_key", key);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  if (withFolder) {
    form.append("folder", folder);
  }
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: "POST",
    body: form,
  });
  const text = await response.text();
  let error = "";
  try {
    const json = JSON.parse(text);
    error = json.error?.message || json.message || "";
  } catch {
    error = text.slice(0, 120);
  }
  return {
    withFolder,
    status: response.status,
    ok: response.ok,
    error: String(error).slice(0, 160),
  };
}

(async () => {
  console.log(
    JSON.stringify({
      cloudLen: cloud.length,
      keyLen: key.length,
      secretLen: secret.length,
      keyLooksNumeric: /^\d+$/.test(key),
      cloudLooksOk: /^[a-z0-9_-]+$/i.test(cloud),
    }),
  );
  if (!cloud || !key || !secret) {
    process.exitCode = 1;
    return;
  }
  const a = await tryUpload(false);
  const b = await tryUpload(true);
  console.log(JSON.stringify({ withoutFolder: a, withFolder: b }));
  process.exitCode = a.ok || b.ok ? 0 : 1;
})().catch((e) => {
  console.log(JSON.stringify({ fatal: e instanceof Error ? e.message : "error" }));
  process.exitCode = 1;
});

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function cleanText(value) {
  return String(value || "").replace(/\\u003C/g, "<").replace(/\\u003E/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
    .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
function findNickname(html) {
  // TikTok's embedded hydration data is the preferred source.
  const markers = [
    "__UNIVERSAL_DATA_FOR_REHYDRATION__",
    "SIGI_STATE"
  ];
  for (const marker of markers) {
    const at = html.indexOf(marker);
    if (at < 0) continue;
    const start = html.indexOf("{", at);
    if (start < 0) continue;
    let depth = 0, inString = false, escaped = false, end = -1;
    for (let i = start; i < html.length; i++) {
      const c = html[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (c === "\\") escaped = true;
        else if (c === '"') inString = false;
      } else {
        if (c === '"') inString = true;
        else if (c === "{") depth++;
        else if (c === "}" && --depth === 0) { end = i + 1; break; }
      }
    }
    if (end > start) {
      try {
        const data = JSON.parse(html.slice(start, end));
        const stack = [data];
        while (stack.length) {
          const item = stack.pop();
          if (!item || typeof item !== "object") continue;
          if (typeof item.nickname === "string" && item.nickname.trim()) return cleanText(item.nickname);
          for (const value of Object.values(item)) if (value && typeof value === "object") stack.push(value);
        }
      } catch (_) {}
    }
  }
  const meta = html.match(/<meta[^>]+(?:property|name)=["']og:title["'][^>]+content=["']([^"']+)/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:title["']/i);
  if (meta) {
    const title = cleanText(meta[1]);
    const match = title.match(/^(.+?)\s*\(@[^)]+\)/);
    if (match) return match[1].trim();
  }
  return null;
}
function normalize(value) {
  return String(value).normalize("NFKD").toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}
function matchClanRule(nickname) {
  const n = normalize(nickname);
  if (n.includes("arvex")) return "ARVEX + nama";
  if (n.includes("ftav")) return "nama + ft'AV";
  return null;
}
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "POST") return res.status(405).json({ error: "Gunakan metode POST." });
  const url = req.body && req.body.url;
  let parsed;
  try { parsed = new URL(url); } catch (_) { return res.status(400).json({ error: "Link TikTok tidak valid." }); }
  if (!["tiktok.com", "www.tiktok.com", "m.tiktok.com"].includes(parsed.hostname.toLowerCase()) ||
      !/^\/@[A-Za-z0-9._]+\/?$/.test(parsed.pathname)) {
    return res.status(400).json({ error: "Masukkan link profil TikTok, contoh https://www.tiktok.com/@username." });
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    let response;
    try {
      response = await fetch(`https://www.tiktok.com${parsed.pathname}`, {
        headers: { "User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.9" },
        redirect: "follow", signal: controller.signal
      });
    } finally { clearTimeout(timer); }
    if (!response.ok) return res.status(502).json({ error: "TikTok tidak mengizinkan profil dibaca saat ini. Coba lagi nanti." });
    const html = await response.text();
    const nickname = findNickname(html);
    if (!nickname) return res.status(422).json({ error: "Nickname tidak dapat dibaca. Pastikan akun publik dan coba lagi." });
    const matchedRule = matchClanRule(nickname);
    if (!matchedRule) return res.status(200).json({ verified: false, nickname, message: `Nickname publik terdeteksi: "${nickname}". Belum cocok dengan format ARVEX atau ft'AV.` });
    return res.status(200).json({ verified: true, nickname, matchedRule });
  } catch (error) {
    return res.status(502).json({ error: "Gagal mengambil data TikTok. Profil mungkin privat atau TikTok sedang membatasi akses." });
  }
};

// DolphSleep Worker: siteyi (assets) sunar + /api/ai ile Gemini'ye güvenli köprü.
// Gemini anahtarı kodda DEĞİL: Cloudflare → dolphsleep → Settings → Variables and Secrets → GEMINI_KEY (Secret).
const FIREBASE_API_KEY = "AIzaSyAJ5yvy_dVwnHUO8XbhxWUQvUqd4FUMuO8"; // herkese açık web anahtarı (zaten sayfada var)
const MODELLER = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash"];
const MAX = 8000;

const ORTAK = " Olayları, kişileri, yerleri ve sırayı DEĞİŞTİRME; notta olmayan olay UYDURMA. Hiçbir şeyi sansürleme veya yumuşatma, bu kullanıcının kendi özel günlüğü. Türkçe yaz. Rüyaya 1-4 kelimelik kısa, akılda kalıcı bir başlık koy (ör. 'Delta Force', 'Oteldeki Asansör'). Sadece JSON döndür: {\"baslik\":\"...\",\"metin\":\"...\"}";
const GOREVLER = {
  hikaye: (v) => ({
    sistem: "Sen bir rüya anlatıcısısın. Kullanıcının adı: " + (v.ad || "Kullanıcı") + ". Kullanıcı rüyasını aceleyle, dağınık, birinci ağızdan yazdı. Görevin onu ÜÇÜNCÜ TEKİL ŞAHISLA, kullanıcının adını kullanarak, akıcı ve sürükleyici bir rüya hikâyesine dönüştürmek. Örnek ton: '" + (v.ad || "Rafet") + " denizde yüzerken uzakta birini gördü. Önce tedirgin oldu, sonra merak ağır bastı ve...'. Kurallar: Rüyadaki HER olayı, kişiyi ve ayrıntıyı sırasıyla koru, hiçbirini atlama ve kısaltma; uzun rüya uzun kalsın. Kullanıcının hissettiklerini (korku, heyecan, huzur, utanç...) ve rüyanın atmosferini öne çıkar; duygu notta açıkça yoksa olayların doğal sonucu olarak hafifçe sezdirebilirsin ama yeni olay ekleme. Mekân değişimlerini ve rüyanın tuhaf geçişlerini 'birden kendini ... buldu' gibi doğal geçişlerle anlat. Sahnelere göre paragraflara böl. Rüyanın gerçek olmadığını, 'rüyasında' kelimesini her cümlede tekrar etme; sadece gerekirse başta bir kez." + ORTAK,
    kullanici: "Rüyam:\n" + v.metin,
  }),
  ozet: (v) => ({
    sistem: "Sen bir rüya günlüğü yazarısın. Kullanıcının adı: " + (v.ad || "Kullanıcı") + ". Rüyayı üçüncü tekil şahısla, kullanıcının adını kullanarak 3-5 cümlelik kısa ve akıcı bir özet olarak yaz (ör. '" + (v.ad || "Rafet") + " otelin lobisine indiğinde...'). En önemli olayları ve hissettiklerini koru; bağlaç ve akış ekleyebilirsin." + ORTAK,
    kullanici: "Rüyam:\n" + v.metin,
  }),
  imla: (v) => ({
    sistem: "Sen bir rüya günlüğü editörüsün. Sadece yazım, noktalama ve büyük-küçük harf hatalarını düzelt, gerekirse paragraflara böl. Birinci tekil şahıs (ben) kalsın, cümle yapısına ve kelimelere mümkün olduğunca dokunma." + ORTAK,
    kullanici: "Rüya notum:\n" + v.metin,
  }),
  gun: (v) => ({
    sistem: "Sen sıcak, samimi ve kısa konuşan bir gün koçusun (psikolog değilsin, teşhis koyma). Kullanıcının adı: " + (v.ad || "Kullanıcı") + ". Sana gün içinde saat saat verdiği duygu puanları (1=berbat, 10=muhteşem), seçtiği duygular (öfke, kaygı, mutluluk vb.), notları ve gün sonunda 'bugün neler yaptın' cevabı gelecek. Ona 'sen' diye hitap ederek 4-7 cümlelik bir gün analizi yaz: günün genel havası, iniş çıkışlar ve notlardan anlaşılan olası sebepleri, iyi giden bir şeyi takdir et, yarın için tek bir küçük ve uygulanabilir öneri ver. Uydurma yapma. Eğer notlarda kendine zarar verme veya ciddi bir kriz işareti varsa, nazikçe güvendiği biriyle konuşmasını ve acil durumda 112'yi aramasını öner. Türkçe yaz. 2-5 kelimelik bir gün başlığı koy (ör. 'Yorucu ama verimli'). Sadece JSON döndür: {\"baslik\":\"...\",\"metin\":\"...\"}",
    kullanici: "Gün: " + (v.gun || "") + "\nDuygu kayıtları:\n" + (v.anlar || "(yok)") + "\n\nBugün neler yaptım:\n" + (v.metin || "(yazmadı)"),
  }),
};

function json(o, s) { return new Response(JSON.stringify(o), { status: s || 200, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } }); }

async function girisDogrula(req) {
  const t = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!t) return null;
  const r = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + FIREBASE_API_KEY, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: t }),
  });
  if (!r.ok) return null;
  const j = await r.json().catch(() => null);
  return j && j.users && j.users[0] ? j.users[0].localId : null;
}

async function gemini(env, model, g) {
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: g.sistem }] },
      contents: [{ role: "user", parts: [{ text: g.kullanici }] }],
      generationConfig: { temperature: 0.6, responseMimeType: "application/json" },
      safetySettings: ["HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH", "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_DANGEROUS_CONTENT"]
        .map((c) => ({ category: c, threshold: "BLOCK_ONLY_HIGH" })),
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error((j.error && j.error.message) || ("HTTP " + r.status)); e.durum = r.status; throw e; }
  const c = j.candidates && j.candidates[0];
  const yazi = c && c.content && c.content.parts ? c.content.parts.map((p) => p.text || "").join("") : "";
  if (!yazi) { const e = new Error("engellendi"); e.durum = 422; throw e; }
  let o; try { o = JSON.parse(yazi.replace(/^```(json)?|```$/g, "").trim()); } catch (_) { o = { baslik: "", metin: yazi }; }
  return { baslik: String(o.baslik || "").slice(0, 80), metin: String(o.metin || "").trim() };
}

async function ai(req, env, ctx) {
  if (!env.GEMINI_KEY) return json({ hata: "anahtar-yok" }, 503);
  const uid = await girisDogrula(req);
  if (!uid) return json({ hata: "giris" }, 401);
  let v; try { v = await req.json(); } catch (_) { return json({ hata: "istek" }, 400); }
  if (v && v.gorev === "duzenle") v.gorev = "hikaye";
  const f = GOREVLER[v && v.gorev];
  if (!f) return json({ hata: "gorev" }, 400);
  ["metin", "anlar", "ad", "gun"].forEach((k) => { if (v[k] != null) v[k] = String(v[k]).slice(0, MAX); });
  if (v.gorev !== "gun" && !(v.metin || "").trim()) return json({ hata: "bos" }, 400);
  const g = f(v);
  const isId = /^[a-z0-9]{6,40}$/.test(String(v.is || "")) ? String(v.is) : null;
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const is = (async () => {
    let son, sonuc = null;
    for (const m of MODELLER) {
      try { sonuc = await gemini(env, m, g); break; }
      catch (e) { son = e; if (e.durum === 422 || e.durum === 400) break; } // engellendiyse diğer modeli deneme
    }
    const cevap = sonuc ? { ok: true, j: sonuc } : { ok: false, j: { hata: son && son.durum === 422 ? "engellendi" : son && son.durum === 429 ? "kota" : "ai", detay: String(son && son.message || "") }, s: son && son.durum === 422 ? 422 : 502 };
    // uygulama kapansa bile sonuç kullanıcının kendi alanına yazılır, uygulama açılınca alıp siler
    if (isId) await isYaz(uid, isId, token, v.gorev, cevap).catch(() => {});
    return cevap;
  })();
  if (ctx && ctx.waitUntil) ctx.waitUntil(is);
  const c = await is;
  return c.ok ? json(c.j) : json(c.j, c.s);
}

async function isYaz(uid, id, token, gorev, c) {
  const alan = { durum: { stringValue: c.ok ? "hazir" : "hata" }, gorev: { stringValue: String(gorev) }, t: { integerValue: String(Date.now()) } };
  if (c.ok) { alan.baslik = { stringValue: c.j.baslik || "" }; alan.metin = { stringValue: c.j.metin || "" }; }
  else alan.hata = { stringValue: c.j.hata || "ai" };
  await fetch("https://firestore.googleapis.com/v1/projects/dolphsleep-c5b8b/databases/(default)/documents/dolphsleep/" + uid + "/isler/" + id, {
    method: "PATCH", headers: { "content-type": "application/json", authorization: "Bearer " + token }, body: JSON.stringify({ fields: alan }),
  });
}

export default {
  async fetch(req, env, ctx) {
    const u = new URL(req.url);
    if (u.pathname === "/api/ai") {
      if (req.method !== "POST") return json({ hata: "yontem" }, 405);
      try { return await ai(req, env, ctx); } catch (e) { return json({ hata: "sunucu", detay: String(e && e.message || e) }, 500); }
    }
    return env.ASSETS.fetch(req);
  },
};

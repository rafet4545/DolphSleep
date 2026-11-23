// DolphSleep Worker: siteyi (assets) sunar + /api/ai ile Gemini'ye güvenli köprü.
// Gemini anahtarı kodda DEĞİL: Cloudflare → dolphsleep → Settings → Variables and Secrets → GEMINI_KEY (Secret).
const FIREBASE_API_KEY = "AIzaSyAJ5yvy_dVwnHUO8XbhxWUQvUqd4FUMuO8"; // herkese açık web anahtarı (zaten sayfada var)
const MODELLER = ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-2.5-flash"]; // önce hızlı model
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
  bdt: (v) => ({
    sistem: "Sen Beck'in Bilişsel Davranışçı Terapi (BDT) modelinde deneyimli, profesyonel bir BDT uygulayıcısı gibi çalışan bir asistansın; teşhis koymaz, terapinin yerini tutmazsın. Kullanıcı bir düşünce kaydı (thought record) dolduruyor. Ona 'sen' diye hitap et, net, saygılı ve profesyonel ol. Pohpohlama, boş onay ve 'çok haklısın' türü yağ çekme yapma; ama düşünce gerçekten kanıtlarla destekleniyorsa bunu da dürüstçe söyle ve o zaman soruna problem çözme açısından yaklaş. Görevlerin: 1) Otomatik düşüncedeki bilişsel çarpıtmaları Beck/Burns sınıflamasıyla adlandır (felaketleştirme, zihin okuma, falcılık, ya hep ya hiç düşüncesi, aşırı genelleme, etiketleme, -meli/-malı ifadeleri, kişiselleştirme, duygusal çıkarım, olumluyu yok sayma, büyütme/küçültme, zihinsel filtre); en fazla 3 tane, her biri için kullanıcının cümlesinden somut kanıt göstererek tek cümle gerekçe. Çarpıtma yoksa uydurma, boş liste döndür. 2) Kanıtları tartarak, kullanıcının ağzından, gerçekçi ve kanıta dayalı (pembe tablo olmayan) 1-2 cümlelik alternatif düşünce yaz. 3) Düşünceyi gerçek hayatta test etmek için küçük, somut, ölçülebilir bir davranışsal deney öner (ne yapacak, ne bekliyor, sonucu nasıl değerlendirecek). 4) 1-2 cümlelik net bir not: varsa göz ardı ettiği bir nokta veya bir sonraki adım. Kendine zarar verme, intihar veya ciddi kriz işareti varsa nota mutlaka bir uzmana ya da güvendiği birine başvurmasını ve acil durumda 112'yi aramasını ekle. Türkçe yaz. Sadece JSON döndür: {\"hatalar\":[{\"ad\":\"...\",\"aciklama\":\"...\"}],\"dengeli\":\"...\",\"deney\":\"...\",\"not\":\"...\"}",
    kullanici: "Durum: " + (v.durum || "") + "\nOtomatik düşünce: " + (v.dusunce || "") + "\nDuygular (şiddet 0-100): " + (v.duygular || "") + "\nDüşünceyi destekleyen kanıtlar: " + (v.lehine || "(yazmadı)") + "\nDüşünceyi desteklemeyen kanıtlar: " + (v.aleyhine || "(yazmadı)"),
  }),
  nine: (v) => ({
    sistem: "Yaşlı bir kadın sana rüyasını sesli anlattı; konuşması yazıya çevrildi, bu yüzden metinde yanlış duyulmuş kelimeler olabilir, anlamı tahmin et. Sen onun rüyasını sıcak, saygılı ve sade bir dille yorumlayan birisin. Ona 'sen' diye, sevgiyle hitap et ama 'canım, tatlım' gibi aşırı sıfatlar kullanma. Kurallar: Kısa yaz, 3-4 cümle. Zor kelime, yabancı kelime ve psikoloji terimi kullanma. Dürüst ol: rüya neyi anlatıyor gibi görünüyorsa (özlem, kaygı, huzur, geçmişe dair düşünceler) onu yumuşak ama olduğu gibi söyle; boş teselli etme. Fal bakma, gelecekten haber verme, uğur/uğursuzluk söyleme. Rüyada ölmüş yakınlar varsa bunu özlem ve sevgiyle ilişkilendir, korkutma. Sağlıkla ilgili bir kaygı geçiyorsa nazikçe bir yakınıyla ya da doktoruyla konuşmasını öner. Sesli okunacak, bu yüzden emoji, madde işareti ve parantez kullanma; düz, akıcı cümleler kur. Türkçe yaz. Rüyaya 2-4 kelimelik sade bir başlık koy (ör. 'Eski evdeki sofra'). Sadece JSON döndür: {\"baslik\":\"...\",\"metin\":\"...\"}",
    kullanici: "Anlattığım rüya:\n" + (v.metin || ""),
  }),
  yorum: (v) => ({
    sistem: "Sen klinik psikoloji ve uyku bilimi bilgisine sahip, rüya çalışmalarında deneyimli bir rüya analistisin. Falcı değilsin: gelecek söylemezsin, halk sembol sözlüğü kullanmazsın ('yılan düşman demektir' gibi), teşhis koymazsın. Kullanıcının adı: " + (v.ad || "Kullanıcı") + ", ona 'sen' diye hitap et. Yorumu şu bilimsel çerçevelere dayandır ve hangisini kullandığını doğal bir dille belirt: süreklilik hipotezi (rüyalar uyanık yaşamdaki kaygı, ilişki ve meşguliyetlerin devamıdır; Hall ve Domhoff), duygusal işleme ve bellek pekiştirme (REM uykusu günün duygularını işler), tehdit simülasyonu kuramı (kovalanma, düşme, sınav gibi rüyalar tehdit provasıdır; Revonsuo); uygunsa ölçülü olarak Jung'cu bakış (sembolü kişinin kendi bağlamında okuma). Yapı: 1) Rüyanın temel teması ve baskın duygusu. 2) Öne çıkan 2-3 öğe için bu rüyaya ve kişinin bağlamına özel olası anlam. 3) Önceki gününe ait kayıtlar verildiyse somut bağlantılar (ör. o gün kaygı puanı yüksekse); bağlantı yoksa zorlama, 'verilen kayıtlarla açık bir bağ görünmüyor' de. 4) Kişinin kendine sorabileceği 1-2 yansıtıcı soru. Kurallar: Kesin konuşma, 'olası', 'işaret ediyor olabilir' de; rüyaların kesin bir anlamı olduğu bilimsel olarak kanıtlanmış değildir, bunu gerekirse bir kez kısaca hatırlat. Pohpohlama ve boş teselli yapma, net ve profesyonel yaz. Rüyada olmayanı uydurma. Hiçbir şeyi sansürleme; cinsel veya karanlık içerikleri de yargılamadan, olgun bir dille ele al. Tekrarlayan kâbus, travma izleri veya kendine zarar verme/ciddi kriz işareti varsa bir uzmana başvurmasını, acil durumda 112'yi aramasını öner. 3-5 kısa paragraf. Türkçe yaz. 2-5 kelimelik bir başlık koy (ör. 'Kontrolü kaybetme kaygısı'). Sadece JSON döndür: {\"baslik\":\"...\",\"metin\":\"...\"}",
    kullanici: "Rüyam:\n" + (v.metin || "") + "\n\n" + (v.durum || "") + (v.anlar ? "\n\nRüyadan önceki günüm (duygu kayıtları, notlar):\n" + v.anlar : ""),
  }),
  gun: (v) => ({
    sistem: "Sen kullanıcının kendi günlüğü için tarafsız, net ve dürüst bir gün analisti olarak yazıyorsun (psikolog değilsin, teşhis koyma). Kullanıcının adı: " + (v.ad || "Kullanıcı") + ", ona 'sen' diye hitap et. Sana gün içinde saat saat verdiği duygu puanları (1=berbat, 10=muhteşem), seçtiği duygular, notları, varsa düşünce kayıtları ve gün sonunda 'bugün neler yaptın' cevabı gelecek. 4-7 cümlelik açık bir not yaz: günün genel seyri (puanlara dayanarak), dikkat çeken iniş çıkışlar ve notlardan anlaşılan olası sebepleri. Kurallar: Yağ çekme, pohpohlama ve boş övgü yapma; 'harika iş çıkardın', 'çok haklısın' gibi kalıplar kullanma. Övgüyü sadece gerçekten hak eden somut bir şey varsa tek cümleyle yap. Kullanıcının kendi hatası, ertelemesi, tutarsızlığı veya kendine zarar veren bir alışkanlığı görünüyorsa bunu kibar ama açıkça söyle; başkalarını suçladığı bir durumda onun payı da varsa onu da belirt. Sadece verilen bilgiye dayan, uydurma. Sonunda yarın için tek, somut ve uygulanabilir bir öneri yaz. Notlarda kendine zarar verme veya ciddi kriz işareti varsa güvendiği biriyle ya da bir uzmanla konuşmasını ve acil durumda 112'yi aramasını öner. Türkçe yaz. 2-5 kelimelik tarafsız bir gün başlığı koy (ör. 'Dağınık ama üretken'). Sadece JSON döndür: {\"baslik\":\"...\",\"metin\":\"...\"}",
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
  return Object.assign({}, o, { baslik: String(o.baslik || "").slice(0, 80), metin: String(o.metin || "").trim() });
}

/* ---------- canlı yazım (akış) ---------- */
const AKIS_GOREV = { hikaye: 1, ozet: 1, imla: 1, yorum: 1, nine: 1 };
const AKIS_BICIM = " Çıktı biçimi: İlk satıra 'BAŞLIK: ' ve ardından başlığı yaz, sonra bir boş satır bırak ve metni yaz. Markdown, yıldız işareti veya JSON kullanma; başka açıklama ekleme.";
function akisGorev(g) { return { sistem: g.sistem.replace(/ Sadece JSON döndür:.*$/, "") + AKIS_BICIM, kullanici: g.kullanici }; }
function ayristir(tum) {
  const m = tum.match(/^\s*BA[ŞS]LIK\s*:\s*(.+?)\s*\n/i);
  return m ? { baslik: m[1].trim().replace(/^["'*]+|["'*]+$/g, "").slice(0, 80), metin: tum.slice(m[0].length).trim() } : { baslik: "", metin: tum.trim() };
}
async function geminiAkis(env, model, g, parca, sinyal) {
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":streamGenerateContent?alt=sse", {
    method: "POST", signal: sinyal,
    headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: g.sistem }] },
      contents: [{ role: "user", parts: [{ text: g.kullanici }] }],
      generationConfig: { temperature: 0.6 },
      safetySettings: ["HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH", "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_DANGEROUS_CONTENT"].map((c) => ({ category: c, threshold: "BLOCK_ONLY_HIGH" })),
    }),
  });
  if (!r.ok) { const j = await r.json().catch(() => ({})); const e = new Error((j.error && j.error.message) || ("HTTP " + r.status)); e.durum = r.status; throw e; }
  const rd = r.body.getReader(), dec = new TextDecoder();
  let buf = "", tum = "";
  for (;;) {
    const { done, value } = await rd.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const satir = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!satir.startsWith("data:")) continue;
      let j; try { j = JSON.parse(satir.slice(5).trim()); } catch (_) { continue; }
      const c = j.candidates && j.candidates[0];
      const p = c && c.content && c.content.parts ? c.content.parts.filter((x) => !x.thought).map((x) => x.text || "").join("") : "";
      if (p) { tum += p; await parca(p); }
    }
  }
  if (!tum.trim()) { const e = new Error("engellendi"); e.durum = 422; throw e; }
  return tum;
}
function akisCevap(env, ctx, g, v, uid, isId, token) {
  const { readable, writable } = new TransformStream();
  const w = writable.getWriter(), enc = new TextEncoder();
  let istemci = true;
  const yaz = async (s) => { if (!istemci) return; try { await w.write(enc.encode(s)); } catch (_) { istemci = false; } };
  const g2 = akisGorev(g);
  const is = (async () => {
    let son, tum = null;
    for (const m of MODELLER) {
      let yazildi = false;
      const ctrl = new AbortController(), zaman = setTimeout(() => ctrl.abort(), 40000);
      try { tum = await geminiAkis(env, m, g2, async (s) => { yazildi = true; await yaz(s); }, ctrl.signal); clearTimeout(zaman); break; }
      catch (e) { clearTimeout(zaman); son = e; if (yazildi || e.durum === 422 || e.durum === 400) break; }
    }
    const cevap = tum ? { ok: true, j: ayristir(tum) } : { ok: false, j: { hata: son && son.durum === 422 ? "engellendi" : son && son.durum === 429 ? "kota" : "ai" } };
    if (!tum) await yaz("\n\u0000HATA:" + cevap.j.hata);
    try { await w.close(); } catch (_) {}
    // uygulama kapansa bile sonuç kullanıcının kendi alanına yazılır
    if (isId) await isYaz(uid, isId, token, v.gorev, cevap, isAnahtar(v)).catch(() => {});
  })();
  if (ctx && ctx.waitUntil) ctx.waitUntil(is);
  return new Response(readable, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}

async function ai(req, env, ctx) {
  if (!env.GEMINI_KEY) return json({ hata: "anahtar-yok" }, 503);
  const uid = await girisDogrula(req);
  if (!uid) return json({ hata: "giris" }, 401);
  let v; try { v = await req.json(); } catch (_) { return json({ hata: "istek" }, 400); }
  if (v && v.gorev === "duzenle") v.gorev = "hikaye";
  const f = GOREVLER[v && v.gorev];
  if (!f) return json({ hata: "gorev" }, 400);
  ["metin", "anlar", "ad", "gun", "durum", "dusunce", "duygular", "lehine", "aleyhine"].forEach((k) => { if (v[k] != null) v[k] = String(v[k]).slice(0, MAX); });
  if (AKIS_GOREV[v.gorev] && !(v.metin || "").trim()) return json({ hata: "bos" }, 400);
  if (v.gorev === "bdt" && !(v.dusunce || "").trim()) return json({ hata: "bos" }, 400);
  const g = f(v);
  const isId = /^[a-z0-9]{6,40}$/.test(String(v.is || "")) ? String(v.is) : null;
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (v.akis && AKIS_GOREV[v.gorev]) return akisCevap(env, ctx, g, v, uid, isId, token);
  const is = (async () => {
    let son, sonuc = null;
    for (const m of MODELLER) {
      try { sonuc = await gemini(env, m, g); break; }
      catch (e) { son = e; if (e.durum === 422 || e.durum === 400) break; } // engellendiyse diğer modeli deneme
    }
    const cevap = sonuc ? { ok: true, j: sonuc } : { ok: false, j: { hata: son && son.durum === 422 ? "engellendi" : son && son.durum === 429 ? "kota" : "ai", detay: String(son && son.message || "") }, s: son && son.durum === 422 ? 422 : 502 };
    // uygulama kapansa bile sonuç kullanıcının kendi alanına yazılır, uygulama açılınca alıp siler
    if (isId) await isYaz(uid, isId, token, v.gorev, cevap, isAnahtar(v)).catch(() => {});
    return cevap;
  })();
  if (ctx && ctx.waitUntil) ctx.waitUntil(is);
  const c = await is;
  return c.ok ? json(c.j) : json(c.j, c.s);
}

function b64(buf) { let s = ""; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); }
function isAnahtar(v) {   // 32 baytlık tek seferlik anahtar (base64), yoksa null
  try { const s = atob(String(v.isAnahtar || "")); if (s.length !== 32) return null; const u = new Uint8Array(32); for (let i = 0; i < 32; i++) u[i] = s.charCodeAt(i); return u; } catch (_) { return null; }
}
async function isYaz(uid, id, token, gorev, c, anahtar) {
  const alan = { durum: { stringValue: c.ok ? "hazir" : "hata" }, gorev: { stringValue: String(gorev) }, t: { integerValue: String(Date.now()) } };
  if (c.ok && anahtar) {   // şifreli kullanıcı: sonuç bulutta tek seferlik anahtarla kilitli durur
    const k = await crypto.subtle.importKey("raw", anahtar, "AES-GCM", false, ["encrypt"]);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, new TextEncoder().encode(JSON.stringify({ baslik: c.j.baslik || "", metin: c.j.metin || "" })));
    alan.iv = { stringValue: b64(iv) }; alan.ct = { stringValue: b64(ct) };
  } else if (c.ok) { alan.baslik = { stringValue: c.j.baslik || "" }; alan.metin = { stringValue: c.j.metin || "" }; }
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

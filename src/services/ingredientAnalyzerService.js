import db from '../data/ingredientsDb.json';

const STATUSES = ['Güvenli', 'Dikkatli Kullanılmalı', 'Yüksek Risk'];

export const SAMPLE_INGREDIENTS =
  'Aqua, Niacinamide, Glycerin, Salicylic Acid, Centella Asiatica Extract, Sodium Hyaluronate, Isopropyl Myristate, Phenoxyethanol, Parfum';

export const hasApiKey = () => !!(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '').trim();

/* -------------------- Hızlı Yerel Sözlük İndeksi -------------------- */

const normalizeKey = (str) =>
  String(str ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const DB_MAP = new Map();
for (const entry of db.ingredients) {
  DB_MAP.set(normalizeKey(entry.name), entry);
  if (Array.isArray(entry.aliases)) {
    for (const alias of entry.aliases) {
      DB_MAP.set(normalizeKey(alias), entry);
    }
  }
}

const parseIngredients = (text) =>
  text
    .replace(/^\s*(ingredients|içindekiler|içerik)\s*:/i, '')
    .split(/[,;\n]+/)
    .map((s) => s.replace(/\.$/, '').trim())
    .filter(Boolean);

const findInDb = (rawName) => {
  const full = normalizeKey(rawName);
  if (DB_MAP.has(full)) return DB_MAP.get(full);

  // Yüzde ifadelerini temizle (örn: "Salicylic Acid 2%")
  const noPercent = full.replace(/\s*\d+(\.\d+)?\s*%/g, '').trim();
  if (DB_MAP.has(noPercent)) return DB_MAP.get(noPercent);

  // Parantez içini çıkar (örn: "Butyrospermum Parkii (Shea) Butter" -> "Butyrospermum Parkii Butter")
  const withoutParens = noPercent.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (DB_MAP.has(withoutParens)) return DB_MAP.get(withoutParens);

  // Parantez içindeki alternatife bak (örn: "Aqua (Water)" -> "water")
  const parenMatch = noPercent.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const inside = normalizeKey(parenMatch[1]);
    if (DB_MAP.has(inside)) return DB_MAP.get(inside);
  }

  return null;
};

const buildWarning = (e) => {
  const w = [];
  if (e.comedogenic >= 4) w.push('Gözenek tıkama riski yüksek.');
  else if (e.comedogenic === 3) w.push('Komedojenik olabilir.');
  if (!e.fungalSafe) w.push('Mantar aknesi (Malassezia) riski.');
  if (e.safety >= 6) w.push('Hassas ciltlerde tahriş / alerji riski.');
  else if (e.safety >= 4) w.push('Hassas ciltlerde dikkatli kullanılmalı.');
  return w.length ? w.join(' ') : null;
};

const toItemFromDb = (originalName, hit) => {
  const base = {
    name: originalName,
    role: hit.role,
    comedogenic: hit.comedogenic,
    safety: hit.safety,
    fungalSafe: hit.fungalSafe,
  };
  return { ...base, warning: buildWarning(base) };
};

const computeStatus = (items) => {
  const maxSafety = Math.max(0, ...items.map((i) => i.safety));
  const maxCom = Math.max(0, ...items.map((i) => i.comedogenic));
  const fungalBad = items.some((i) => !i.fungalSafe);
  if (maxSafety >= 7 || maxCom >= 5) return STATUSES[2];
  if (maxSafety >= 4 || maxCom >= 3 || fungalBad) return STATUSES[1];
  return STATUSES[0];
};

const buildMarketingTrap = (items) => {
  if (items.length < 6) {
    return 'Liste kısa olduğu için baştaki (baz/etkin) ve sondaki (eser miktar) içerikleri karşılaştırmak anlamlı değil. Etiketlerde içerikler çoktan aza sıralanır; ilk maddeler formülün asıl gövdesidir.';
  }
  const top = items.slice(0, 5).map((i) => i.name).join(', ');
  const tail = items.slice(-3).map((i) => i.name).join(', ');
  const tailKnown = items.slice(-3).filter((i) => i.role !== 'Sözlükte bulunamadı');
  const tailNote = tailKnown.length
    ? ` Sondaki "${tailKnown.map((i) => i.name).join(', ')}" gibi içerikler eser miktardadır; ambalajda öne çıkarılsa bile etkisi sınırlı olabilir.`
    : ' Sondaki içerikler eser miktardadır; ambalajdaki iddialar bu maddelere dayanıyorsa etkisi sınırlı olabilir.';
  return `Etiketlerde içerikler çoktan aza sıralanır. Gerçek baz ve etkin aktifler: ${top}. Eser miktar / pazarlama içerikleri: ${tail}.${tailNote}`;
};

/* ------------------------- Çevrimdışı Analiz ------------------------- */

const analyzeOffline = (text) => {
  const names = parseIngredients(text);
  const items = names.map((name) => {
    const hit = findInDb(name);
    if (!hit) {
      return {
        name,
        role: 'Sözlükte bulunamadı',
        comedogenic: 0,
        safety: 1,
        fungalSafe: true,
        warning: null,
      };
    }
    return toItemFromDb(name, hit);
  });

  const overallStatus = computeStatus(items);
  const flagged = items.filter((i) => i.warning).map((i) => i.name);
  const known = items.filter((i) => i.role !== 'Sözlükte bulunamadı').length;
  const summary = `${items.length} içerikten ${known} tanesi yerel sözlükte bulundu. ${
    flagged.length
      ? `Dikkat edilmesi gerekenler: ${flagged.slice(0, 5).join(', ')}.`
      : 'Sözlükte riskli bir içerik tespit edilmedi.'
  }`;

  return { overallStatus, summary, marketingTrap: buildMarketingTrap(items), items, isOffline: true };
};

/* ----------------------- Gemini + Hibrit Analiz ----------------------- */

const FULL_IMAGE_PROMPT = `Sen bir kozmetik içerik (INCI) analiz uzmanısın. Verilen ürün etiketindeki tüm içerikleri sırasıyla analiz et.
SADECE saf JSON döndür; markdown, kod bloğu veya ek açıklama ekleme. Şu JSON formatında, Türkçe yanıt ver:
{
  "overallStatus": "Güvenli" | "Dikkatli Kullanılmalı" | "Yüksek Risk",
  "summary": "2 cümlelik net Türkçe özet",
  "marketingTrap": "İçerikler çoktan aza sıralanır. İlk 5 maddeyi (Gerçek Baz ve Etkin Aktifler) son sıradaki maddelerle (Eser Miktar / Pazarlama İçerikleri) karşılaştıran Türkçe yorum",
  "items": [{ "name": string, "role": "kısa rol", "comedogenic": 0-5 tam sayı, "safety": 1-10 tam sayı (10 en riskli), "fungalSafe": boolean, "warning": "kısa uyarı veya null" }]
}
Listedeki sırayı koru.`;

const clamp = (v, min, max, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};

const normalizeItem = (i, fallbackName = '?') => ({
  name: String(i?.name ?? fallbackName),
  role: String(i?.role ?? 'Kozmetik Bileşen'),
  comedogenic: clamp(i?.comedogenic, 0, 5, 0),
  safety: clamp(i?.safety, 1, 10, 1),
  fungalSafe: i?.fungalSafe !== false,
  warning: i?.warning ? String(i.warning) : null,
});

const MODELS = [
  'models/gemini-3-flash-preview',
];

const callGeminiJson = async (parts) => {
  const apiKey = (process.env.EXPO_PUBLIC_GEMINI_API_KEY || '').trim();
  const requestBody = JSON.stringify({
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature: 0.2 },
  });

  for (const model of MODELS) {
    console.log('Denenen model:', model);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
        }
      );
      if (!response.ok) {
        console.log('Hata:', model, response.status);
        continue;
      }
      const data = await response.json();
      const out = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
      const cleaned = out.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.log('Hata:', model, e?.message);
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error('Tüm Gemini modelleri başarısız oldu');
};

const analyzeHybridText = async (cleanText) => {
  const names = parseIngredients(cleanText);
  if (names.length === 0) throw new Error('Boş içerik listesi');

  const mergedItems = new Array(names.length);
  const unknowns = [];

  names.forEach((name, idx) => {
    const hit = findInDb(name);
    if (hit) {
      mergedItems[idx] = toItemFromDb(name, hit);
    } else {
      unknowns.push({ idx, name });
    }
  });

  console.log(
    `Hibrit Analiz: ${names.length} maddeden ${names.length - unknowns.length} tanesi yerel sözlükten anında alındı, ${unknowns.length} tanesi Gemini'ye soruluyor.`
  );

  const unknownNamesList = unknowns.map((u) => u.name);

  const hybridPrompt = `Sen bir kozmetik içerik (INCI) analiz uzmanısın.
Aşağıda bir ürünün TAM içerik listesi (çoktan aza doğru) verilmiştir.
SADECE saf JSON döndür; markdown veya ek açıklama yazma.

TAM LİSTE (Özet ve Pazarlama Tuzağı yorumu için tüm sırayı dikkate al):
${names.join(', ')}

${
  unknownNamesList.length > 0
    ? `DETAYLI PUANLANACAK BİLİNMEYEN MADDELER (SADECE bu listedekileri "unknownItems" dizisine ekle, diğerlerini yazma):
${unknownNamesList.join(', ')}`
    : 'Bilinmeyen madde yok; "unknownItems" dizisini boş [] döndür.'
}

İstenen JSON formatı (Türkçe):
{
  "overallStatus": "Güvenli" | "Dikkatli Kullanılmalı" | "Yüksek Risk",
  "summary": "2 cümlelik net Türkçe özet",
  "marketingTrap": "İçerikler çoktan aza sıralanır. İlk 5 madde (Gerçek Baz ve Etkin Aktifler) ile son sıradaki maddeleri (Eser Miktar / Pazarlama İçerikleri) karşılaştıran keskin Türkçe yorum",
  "unknownItems": [{ "name": "orijinal madde adı", "role": "kısa rol", "comedogenic": 0-5, "safety": 1-10 (10 en riskli), "fungalSafe": boolean, "warning": "kısa uyarı veya null" }]
}`;

  const raw = await callGeminiJson([{ text: hybridPrompt }]);
  const aiItems = Array.isArray(raw?.unknownItems) ? raw.unknownItems : [];

  // Gelen AI sonuçlarını isimle haritala
  const aiMap = new Map();
  aiItems.forEach((item) => {
    if (item?.name) aiMap.set(normalizeKey(item.name), item);
  });

  // Bilinmeyen maddeleri etiket sırasındaki orijinal yuvalarına yerleştir
  unknowns.forEach((u, i) => {
    const matched = aiMap.get(normalizeKey(u.name)) || aiItems[i];
    mergedItems[u.idx] = matched
      ? normalizeItem({ ...matched, name: u.name }, u.name)
      : {
          name: u.name,
          role: 'Kozmetik Bileşen',
          comedogenic: 0,
          safety: 1,
          fungalSafe: true,
          warning: null,
        };
  });

  return {
    overallStatus: STATUSES.includes(raw?.overallStatus) ? raw.overallStatus : computeStatus(mergedItems),
    summary: String(raw?.summary ?? ''),
    marketingTrap: String(raw?.marketingTrap ?? buildMarketingTrap(mergedItems)),
    items: mergedItems,
    isOffline: false,
  };
};

const analyzeImageWithGemini = async ({ base64, text }) => {
  const parts = [{ text: FULL_IMAGE_PROMPT }];
  parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64 } });
  if (text) parts.push({ text: `Ek metin:\n${text}` });

  const raw = await callGeminiJson(parts);
  const items = (Array.isArray(raw?.items) ? raw.items : []).map((i) => normalizeItem(i));
  if (items.length === 0) throw new Error('Boş sonuç');

  return {
    overallStatus: STATUSES.includes(raw?.overallStatus) ? raw.overallStatus : computeStatus(items),
    summary: String(raw?.summary ?? ''),
    marketingTrap: String(raw?.marketingTrap ?? buildMarketingTrap(items)),
    items,
    isOffline: false,
  };
};

/**
 * İçerik analizi. { base64?, text? } alır.
 * Metin varsa Hibrit (Yerel Sözlük + Gemini), görsel varsa Gemini Vision çalışır.
 * Anahtar yoksa ya da ağ/API hatası olursa metin varsa çevrimdışı analize düşer.
 */
export const analyzeIngredients = async ({ base64, text } = {}) => {
  const cleanText = (text ?? '').trim();
  if (!base64 && !cleanText) {
    const err = new Error('EMPTY_INPUT');
    err.code = 'EMPTY_INPUT';
    throw err;
  }

  if (hasApiKey()) {
    try {
      if (base64) {
        return await analyzeImageWithGemini({ base64, text: cleanText });
      }
      return await analyzeHybridText(cleanText);
    } catch (e) {
      console.warn('Gemini analizi başarısız, çevrimdışı moda geçiliyor:', e?.message);
    }
  }

  if (cleanText) return analyzeOffline(cleanText);

  const err = new Error('IMAGE_OFFLINE');
  err.code = 'IMAGE_OFFLINE';
  throw err;
};
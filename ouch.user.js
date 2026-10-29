// ==UserScript==
// @name         Нырки КП
// @namespace    http://tampermonkey.net/
// @version      3.7.3
// @description  Исключительно для Крылатого племени. Копирование и последующее распространене карается запретом на кислород. Скрипт реализует лог добычи ресурсов для роли «нырок» — небольшой фарм-панели со счётчиками и подсветкой игровой истории.
// @author       Первая версия и идея принадлежат OGRTSV; исправления, доработка, улучшения и текущая поддержка осуществляются игроком Горицвет [1705753]
// @match        https://catwar.net/cw3*
// @match        https://catwar.su/cw3*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const _S = "nynyny.v22";
  const _K = "27a520812d8c35bca1bc2b5f3b9fcaefbe81e064c8f02c155bcb658d51636fef";
  const _PK = "cw_ny_pk_v22";
  const _CK = "cw_ny_draft_v22";
  const STORAGE_KEY = "cw_shaman_resources_v6";
  const POS_KEY = "cw_shaman_panel_pos_v6";
  const HEIGHT_KEY = "cw_shaman_table_h_v7";
  const UI_KEY = "cw_ny_ui_v35";
  const FARM_KEY = "cw_ny_catch_db_v1";
  const TRIBE_CACHE_KEY = "cw_ny_tribe_cache_v1";
  const TRIBE_CACHE_MS = 5 * 60 * 1000;
  const LOG_MAX = 500;
  const ID_LOG_MAX = 200;
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  const BUILTIN_TRIBE = "30a0dd4e62f0fe4edc275fce73be51e50d2667f9a0ed8fec9882da04b4099c03";
  let allowedTribe = BUILTIN_TRIBE;
  let scriptAlive = false;
  let bootStarted = false;
  let lastReadTribe = "";

  const BUILTIN_ZONES = [
    { "id": "healer", "name": "Пещера знахаря" },
    { "id": "cold", "name": "Холодная пещера" },
    { "id": "shrine", "name": "Древнее святилище" }
  ];

  const BUILTIN_CATEGORIES = [
    {
      "key": "мох",
      "label": "Целебные ресы",
      "zone": "healer",
      "score": 4,
      "items": [
        { "name": "мох", "typeId": "75", "label": "Мох", "group": "" },
        { "name": "крепкую ветку", "typeId": "565", "label": "Крепкая ветка", "group": "" },
        { "name": "плотную водоросль", "typeId": "3993", "label": "Плотная водоросль", "group": "" },
        { "name": "целебную водоросль", "typeId": "21", "label": "Целебная водоросль", "group": "" }
      ],
      "folder": true,
      "img": "https://www.dropbox.com/scl/fi/815o12449l4ugcrvw90sl/332324.png?rlkey=xf1d5c3pytyrtwrcqk2umeelm&st=gzmp3u0l&dl=1",
      "groups": []
    },
    {
      "key": "наполненный водой мох",
      "label": "Наполненный водой мох",
      "zone": "cold",
      "score": 1,
      "items": [
        { "name": "наполненный водой мох", "typeId": "76", "label": "Наполненный водой мох" }
      ],
      "groups": []
    },
    {
      "key": "ракушки",
      "label": "Ракушки",
      "zone": "shrine",
      "score": 10,
      "items": [
        { "name": "старинный коготь", "typeId": "12648", "label": "Старинный коготь (+20)", "group": "Крылатое племя" },
        { "name": "старинную кость", "typeId": "12649", "label": "Старинная кость (+30)", "group": "Крылатое племя" },
        { "name": "осколки аметиста", "typeId": "12651", "label": "Осколки аметиста (сон)", "group": "Крылатое племя" },
        { "name": "осколок кварца", "typeId": "12652", "label": "Осколок кварца (+15)", "group": "Крылатое племя" },
        { "name": "сверкающий опал", "typeId": "12653", "label": "Сверкающий опал (+28)", "group": "Крылатое племя" },
        { "name": "большую ракушку", "typeId": "3994", "label": "Большая ракушка (+20)", "group": "Элизиум" },
        { "name": "большую ракушку", "typeId": "3995", "label": "Большая ракушка (+30)", "group": "Элизиум" },
        { "name": "небольшую ракушку", "typeId": "3997", "label": "Небольшая ракушка (сон)", "group": "Элизиум" },
        { "name": "лист морской водоросли", "typeId": "4004", "label": "Лист морской водоросли (+28)", "group": "Морские ресурсы" },
        { "name": "лист морской водоросли", "typeId": "4005", "label": "Лист морской водоросли (+15)", "group": "Морские ресурсы" },
        { "name": "лист морской водоросли", "typeId": "4006", "label": "Лист морской водоросли (сон)", "group": "Морские ресурсы" },
        { "name": "алый коралл", "typeId": "4001", "label": "Алый коралл (+20)", "group": "Морские ресурсы" },
        { "name": "алый коралл", "typeId": "4002", "label": "Алый коралл (+30)", "group": "Морские ресурсы" },
        { "name": "небольшую ракушку", "typeId": "3999", "label": "Небольшая ракушка (+28)", "group": "Элизиум" },
        { "name": "небольшую ракушку", "typeId": "3998", "label": "Небольшая ракушка (+15)", "group": "Элизиум" },
        { "name": "кувшинку", "typeId": "7143", "label": "Кувшинка (+28)", "group": "Нейтральные нырки" },
        { "name": "кувшинку", "typeId": "7142", "label": "Кувшинка (+15)", "group": "Нейтральные нырки" },
        { "name": "кувшинку", "typeId": "7141", "label": "Кувшинка (сон)", "group": "Нейтральные нырки" },
        { "name": "жемчужную ракушку", "typeId": "7138", "label": "Жемчужная ракушка (+20)", "group": "Нейтральные нырки" },
        { "name": "шепчущую ракушку", "typeId": "7139", "label": "Шепчущая ракушка (+30)", "group": "Нейтральные нырки" }
      ],
      "img": "https://www.dropbox.com/scl/fi/qq46vme1bz8pdb3eo9ci5/221312.png?rlkey=dn0mgpvn4dd68ew7ozkbyirv8&st=7ocqdjhr&dl=1",
      "groups": ["Крылатое племя", "Морские ресурсы", "Нейтральные нырки", "Элизиум"],
      "folder": true
    },
    {
      "key": "Ж",
      "label": "Опасная дичь",
      "zone": "healer",
      "score": 1,
      "items": [
        { "name": "живого танцующего крабика", "typeId": "12631", "label": "Игорь", "group": "" },
        { "name": "маленькую жуть", "typeId": "12629", "label": "Маленькая жуть", "group": "" },
        { "name": "маленький кошма", "typeId": "12633", "label": "Кирилл", "group": "" },
        { "name": "дутую ящерку", "typeId": "12637", "label": "Дутая ящерка", "group": "" },
        { "name": "свирепого змея глубин", "typeId": "12639", "label": "Свирепый змей глубин", "group": "" }
      ],
      "folder": true,
      "groups": []
    },
    {
      "key": "сверкающего аксолотля",
      "label": "Дичь",
      "zone": "cold",
      "score": 1,
      "items": [
        { "name": "сверкающего аксолотля", "typeId": "12642", "label": "Никита" },
        { "name": "лупоглазую ящерку", "typeId": "12641", "label": "Лупоглазая ящерка" },
        { "name": "лягушку-пищалку", "typeId": "12643", "label": "Лена" },
        { "name": "чудо-рыбу", "typeId": "12644", "label": "Савелий" },
        { "name": "полосатую ящерку-длинношейку", "typeId": "12645", "label": "Люся" },
        { "name": "причудливую ящерку-длинношейку", "typeId": "12646", "label": "Причудливая ящерка-длинношейка" },
        { "name": "жучка-пузанчика", "typeId": "12647", "label": "Жучок-пузанчик" }
      ],
      "folder": true,
      "groups": []
    },
    {
      "key": "Камень",
      "label": "Камень",
      "zone": "shrine",
      "score": 2,
      "folder": true,
      "drop": true,
      "items": [
        { "name": "небольшой камень", "typeId": "1034", "label": "Небольшой камень" },
        { "name": "крошечный камушек", "typeId": "417", "label": "Крошечный камушек" },
        { "name": "камень", "typeId": "418", "label": "Камень" }
      ],
      "groups": []
    }
  ];

  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function cssEscape(s) {
    if (window.CSS && CSS.escape) return CSS.escape(s);
    return String(s).replace(/["\\]/g, "\\$&").replace(/[\n\r]/g, " ");
  }
  function thingImg(typeId) { return "https://catwar.net/cw3/things/" + (typeId || "0") + ".png"; }
  function catCustomImg(c) { return String((c && (c.img || c.folderImg)) || "").trim(); }

  function emptyState() {
    return { items: {}, order: [], typeMap: {}, lastHist: "", putLog: [], pickLog: [], lookLog: [] };
  }

  function loadState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!raw || typeof raw !== "object") return emptyState();
      return Object.assign(emptyState(), raw, {
        items: raw.items || {},
        order: Array.isArray(raw.order) ? raw.order : [],
        typeMap: raw.typeMap || {},
        putLog: Array.isArray(raw.putLog) ? raw.putLog : [],
        pickLog: Array.isArray(raw.pickLog) ? raw.pickLog : [],
        lookLog: Array.isArray(raw.lookLog) ? raw.lookLog : []
      });
    } catch (e) { return emptyState(); }
  }

  let state = loadState();
  let zones = [];
  let resources = [];
  let scores = {};
  const typeToKey = {};

  function pruneState() {
    if (Array.isArray(state.putLog) && state.putLog.length > LOG_MAX) state.putLog = state.putLog.slice(-LOG_MAX);
    if (Array.isArray(state.pickLog) && state.pickLog.length > LOG_MAX) state.pickLog = state.pickLog.slice(-LOG_MAX);
    if (Array.isArray(state.lookLog) && state.lookLog.length > LOG_MAX) state.lookLog = state.lookLog.slice(-LOG_MAX);
  }

  const saveState = (() => {
    let lastPrune = 0;
    return () => {
      const now = Date.now();
      if (now - lastPrune > 60000) { pruneState(); lastPrune = now; }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
    };
  })();

  function rebuildTypeIndex() {
    for (const k of Object.keys(typeToKey)) delete typeToKey[k];
    for (const r of resources) {
      for (const id of r.typeIds || []) typeToKey[String(id)] = r.key;
    }
    const map = state && state.typeMap ? state.typeMap : {};
    for (const [id, key] of Object.entries(map)) {
      if (!typeToKey[id]) typeToKey[id] = key;
    }
  }

  function compileConfig(categories, zoneList) {
    zones = (zoneList || []).map((z) => ({
      id: z.id, name: z.name, test: new RegExp(escapeRe(z.name), "i")
    }));
    resources = (categories || []).map((c) => {
      const items = Array.isArray(c.items) ? c.items : [];
      const names = items.map((i) => String(i.name || "").trim()).filter(Boolean);
      const typeIds = items.map((i) => String(i.typeId || "").trim()).filter(Boolean);
      const key = c.key || names[0] || c.label;
      const parts = items.map((i, idx) => {
        const name = String(i.name || "").trim();
        const typeId = String(i.typeId || "").trim();
        const label = String(i.label || name || "").trim() || ("предмет " + (idx + 1));
        const group = String(i.group || "").trim();
        return { name, typeId, label, group, img: thingImg(typeId || typeIds[0] || "0") };
      });
      const isFolder = c.folder === true || (c.folder !== false && parts.length > 1);
      const customImg = catCustomImg(c);
      return {
        key,
        label: c.label || key,
        zone: c.zone,
        score: Number(c.score) || 0,
        img: customImg || thingImg(typeIds[0] || "0"),
        typeIds, aliases: names.filter((n) => n.toLowerCase() !== String(key).toLowerCase()),
        parts, isFolder, drop: !!c.drop
      };
    }).filter((r) => r.key);
    scores = {};
    for (const r of resources) scores[r.key] = r.score;
    rebuildTypeIndex();
  }

  compileConfig(clone(BUILTIN_CATEGORIES), clone(BUILTIN_ZONES));

  function pruneFarm(db) {
    const now = Date.now();
    db.caught = db.caught || {};
    db.delivered = db.delivered || {};
    for (const [id, rec] of Object.entries(db.caught)) {
      if (!rec || now - (rec.at || 0) > WEEK_MS) delete db.caught[id];
    }
    for (const [id, rec] of Object.entries(db.delivered)) {
      if (!rec || now - (rec.at || 0) > WEEK_MS) delete db.delivered[id];
    }
  }
  function loadFarm() {
    try {
      const raw = JSON.parse(localStorage.getItem(FARM_KEY) || "null");
      if (!raw || typeof raw !== "object") return { caught: {}, delivered: {} };
      pruneFarm(raw);
      return { caught: raw.caught || {}, delivered: raw.delivered || {} };
    } catch (e) { return { caught: {}, delivered: {} }; }
  }
  function saveFarm() { try { localStorage.setItem(FARM_KEY, JSON.stringify(farm)); } catch (e) {} }
  function farmMarkCaught(id, key) {
    pruneFarm(farm);
    id = String(id);
    if (!farm.caught[id]) farm.caught[id] = { key: key || "", at: Date.now() };
    saveFarm();
  }
  function farmWasDelivered(id) {
    pruneFarm(farm);
    return !!(farm.delivered && farm.delivered[String(id)]);
  }
  function farmMarkDelivered(id, key) {
    pruneFarm(farm);
    id = String(id);
    farm.delivered[id] = { key: key || "", at: Date.now() };
    if (!farm.caught[id]) farm.caught[id] = { key: key || "", at: Date.now() };
    saveFarm();
  }
  let farm = loadFarm();

  const STONE_RE = /(?:небольшо(?:й|го|му|го)\s+)?кам(?:ень|ня|ни|нем|ушек|ушка|ушки)/i;
  const FIND_RE = /(?:Обнаружил|Обнаружила)\s+([^.]*)/i;
  const PUT_RE = /(?:Положил|Положила)\s+на\s+землю\s+([^.]*)/i;
  const PICK_RE = /(?:Поднял|Подняла)\s+с\s+земли\s+([^.]*)/i;
  const GO_RE = /(?:Пошёл|Пошла|Перешёл|Перешла|Пришёл|Пришла)\s+в\s+локацию\s+([^.]*)/i;
  const LOOK_RE = /(?:Осмотрел|Осмотрела)\s+([^.]*)/i;
  const WOOL_RE = /(?:Заметил|Заметила)\s+клочок\s+шерсти|Мой\s+нос\s+учуял/i;
  const CAUGHT_ME_RE = /(?:добыт[аоы]?|достал(?:а|и)?|добыл(?:а|и)?)\s+действием\s+(?:мною|мной|я)(?![А-Яа-яЁё])/i;
  const CAUGHT_ANY_RE = /(?:добыт[аоы]?|достал(?:а|и)?|добыл(?:а|и)?)\s+действием/i;
  const CAUGHT_OTHER_RE = /(?:добыт[аоы]?|достал(?:а|и)?|добыл(?:а|и)?)\s+действием\s+(?!(?:мною|мной|я)(?![А-Яа-яЁё]))/i;

  function emptyUi() { return { isOpen: true, zones: {}, folders: {}, groups: {} }; }
  function loadUi() {
    try {
      const raw = JSON.parse(localStorage.getItem(UI_KEY) || "null");
      if (!raw || typeof raw !== "object") return emptyUi();
      return Object.assign(emptyUi(), raw, {
        isOpen: raw.isOpen !== false,
        zones: raw.zones || {}, folders: raw.folders || {}, groups: raw.groups || {}
      });
    } catch (e) { return emptyUi(); }
  }
  function saveUi() { try { localStorage.setItem(UI_KEY, JSON.stringify(ui)); } catch (e) {} }
  function groupKey(parent, gid) { return String(parent || "") + "\t" + String(gid || ""); }
  let ui = loadUi();

  function resetState() {
    state = emptyState();
    saveState();
    pendingFinds.length = 0;
    pendingNews.length = 0;
    pendingPuts.length = 0;
    pendingPicks.length = 0;
    pendingLooks.length = 0;
    lastRemoved.length = 0;
    lastAdded.length = 0;
    groundPending.length = 0;
    recentCovers.length = 0;
    batchCoverZones.length = 0;
    histZone = null;
    lastSelected = { id: null, key: null, typeId: null, t: 0 };
    lastMouth = getMouthItems();
    const hist = document.querySelector("#ist");
    if (hist) {
      state.lastHist = hist.textContent || "";
      saveState();
      paintHistory(hist);
    }
    updateTable();
  }

  function rememberType(typeId, key) {
    if (!typeId || !key) return;
    typeToKey[String(typeId)] = key;
    state.typeMap[String(typeId)] = key;
    saveState();
  }

  function namesOf(r) { return [r.key].concat(r.aliases || []); }

  function prettyLabel(s) {
    s = String(s || "").trim();
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function subKeyOf(part, idx) {
    if (part && part.typeId) return "t:" + part.typeId;
    if (part && part.name) return "n:" + String(part.name).toLowerCase();
    return "i:" + idx;
  }

  function nameFromType(key, typeId) {
    if (!typeId) return "";
    const r = resources.find((x) => x.key === key);
    if (!r) return "";
    const p = (r.parts || []).find((x) => x.typeId && String(x.typeId) === String(typeId));
    return p ? p.name : "";
  }

  function partsNamed(r, name) {
    const n = String(name || "").toLowerCase().trim();
    if (!n) return [];
    return (r && r.parts || []).filter((p) => p.name && p.name.toLowerCase() === n);
  }

  function nameIsAmbiguous(r, name) { return partsNamed(r, name).length > 1; }

  function recSubKey(rec, r) {
    const parts = (r && r.parts) || [];
    if (rec.typeId) {
      const i = parts.findIndex((p) => p.typeId && String(p.typeId) === String(rec.typeId));
      if (i >= 0) return subKeyOf(parts[i], i);
    }
    if (rec.name) {
      const recN = String(rec.name).toLowerCase();
      const exactIdx = [];
      parts.forEach((p, i) => { if (p.name && p.name.toLowerCase() === recN) exactIdx.push(i); });
      if (exactIdx.length === 1) return subKeyOf(parts[exactIdx[0]], exactIdx[0]);
      if (exactIdx.length > 1) return rec.typeId ? "t:" + rec.typeId : "";
      let best = -1, bestLen = 0;
      parts.forEach((p, i) => {
        if (!p.name) return;
        const pn = p.name.toLowerCase();
        if (recN.includes(pn) && pn.length > bestLen) { best = i; bestLen = pn.length; }
      });
      if (best >= 0 && !nameIsAmbiguous(r, parts[best].name)) return subKeyOf(parts[best], best);
    }
    if (parts.length === 1) return subKeyOf(parts[0], 0);
    return rec.typeId ? "t:" + rec.typeId : "";
  }

  function matchResourceHit(text) {
    if (!text) return null;
    const lower = String(text).toLowerCase();
    let best = null, bestName = "", bestLen = 0;
    for (const r of resources) {
      for (const name of namesOf(r)) {
        if (lower.includes(name.toLowerCase()) && name.length > bestLen) {
          best = r; bestName = name; bestLen = name.length;
        }
      }
    }
    return best ? { res: best, name: bestName } : null;
  }
  function matchResource(text) { const hit = matchResourceHit(text); return hit ? hit.res : null; }

  function zoneByLocationName(name) {
    if (!name) return null;
    for (const z of zones) if (z.test.test(name)) return z.id;
    return null;
  }
  function locationName() {
    const el = document.querySelector("#location");
    return el ? String(el.textContent || "").trim() : "";
  }

  let liveLocName = "";
  let prevLocName = "";
  let batchZoneOverride = null;
  const batchCoverZones = [];
  const recentCovers = [];

  function rememberLocation() {
    const name = locationName();
    if (!name) return name;
    if (name !== liveLocName) {
      if (liveLocName) prevLocName = liveLocName;
      liveLocName = name;
    } else if (!liveLocName) liveLocName = name;
    return name;
  }

  function currentZone() {
    if (batchZoneOverride) return batchZoneOverride;
    const name = rememberLocation();
    if (name) return zoneByLocationName(name);
    if (liveLocName) return zoneByLocationName(liveLocName);
    return histZone;
  }

  function requestCover(zone) {
    if (!zone) return;
    if (!batchCoverZones.includes(zone)) batchCoverZones.push(zone);
    recentCovers.push({ zone, t: Date.now() });
    coverGround(zone);
  }

  function retryCovers() {
    const now = Date.now();
    for (let i = recentCovers.length - 1; i >= 0; i--) {
      if (now - recentCovers[i].t > 20000) recentCovers.splice(i, 1);
    }
    const seen = {};
    for (const c of recentCovers) {
      if (seen[c.zone]) continue;
      seen[c.zone] = true;
      coverGround(c.zone);
    }
  }

  function hasStone(text) { return STONE_RE.test(text || ""); }

  function normTribe(s) {
    return String(s || "").toLowerCase().replace(/[«»„""'']/g, "").replace(/\s+/g, " ").trim();
  }
  function looksLocked(s) { return /^[a-f0-9]{64}$/i.test(String(s || "").trim()); }

  async function digest(s) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  async function tribeToken(name) { return digest(normTribe(name) + "\u0001" + _S); }
  async function tribesMatch(found, allowed) {
    const need = String(allowed || "").trim();
    if (!need || !looksLocked(need)) return false;
    if (!String(found || "").trim()) return false;
    const got = await tribeToken(found);
    return got === need.toLowerCase();
  }

  function parseTribeFromHtml(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const pick = (s) => String(s || "").replace(/\s+/g, " ").trim();

    const icon = doc.querySelector("#clan_icon, img[title='Племя']");
    if (icon) {
      const row = icon.closest("tr");
      const bold = row && row.querySelector("td b, b");
      const fromIcon = pick(bold && bold.textContent);
      if (fromIcon) return fromIcon;
    }
    const rawIcon = String(html).match(/id=["']clan_icon["'][\s\S]{0,600}?<b>([^<]{2,80})<\/b>/i);
    if (rawIcon && rawIcon[1]) return pick(rawIcon[1]);

    for (const tr of doc.querySelectorAll("tr")) {
      const cells = [...tr.querySelectorAll("td, th")];
      if (cells.length < 2) continue;
      const label = pick(cells[0].textContent);
      const titled = cells[0].querySelector("[title]");
      const title = titled && titled.getAttribute("title");
      if (/^племя$/i.test(String(title || ""))) {
        const v = pick(cells[cells.length - 1].textContent);
        if (v) return v;
      }
      if (/^(племя|фракция|клан|принадлежность)\s*:?$/i.test(label)) {
        const v = pick(cells[cells.length - 1].textContent);
        if (v) return v;
      }
    }

    const text = pick((doc.body && doc.body.textContent) || "");
    const labeled = [
      /Племя\s*[:\-–]\s*([^\n]+)/i,
      /Фракция\s*[:\-–]\s*([^\n]+)/i,
      /Клан\s*[:\-–]\s*([^\n]+)/i,
      /Принадлежность\s*[:\-–]\s*([^\n]+)/i,
      /состоит в племени\s+([^\n.]+)/i,
      /член(?:ом)? (?:племени|фракции|клана)\s+([^\n.]+)/i,
      /жив[её]т в\s+([^\n.]*племен[ияюе][^\n.]*)/i
    ];
    for (const re of labeled) {
      const m = text.match(re);
      if (m && m[1]) return pick(m[1]);
    }

    for (const a of doc.querySelectorAll("a")) {
      const parentTxt = pick((a.parentElement && a.parentElement.textContent) || "");
      const name = pick(a.textContent);
      if (name && /плем/i.test(name) && /плем|фракц|клан|принадлеж/i.test(parentTxt)) return name;
    }
    return "";
  }

  async function readPlayerTribe() {
    try {
      const cached = JSON.parse(sessionStorage.getItem(TRIBE_CACHE_KEY) || "null");
      if (cached && cached.name && Date.now() - cached.t < TRIBE_CACHE_MS) {
        lastReadTribe = cached.name;
        return cached.name;
      }
    } catch (e) {}

    const urls = ["/", location.origin + "/"];
    for (const url of urls) {
      try {
        const res = await fetch(url, { credentials: "include", cache: "no-store" });
        if (!res.ok) continue;
        const name = parseTribeFromHtml(await res.text());
        if (name) {
          lastReadTribe = name;
          try { sessionStorage.setItem(TRIBE_CACHE_KEY, JSON.stringify({ name, t: Date.now() })); } catch (e) {}
          return name;
        }
      } catch (e) {}
    }
    return "";
  }

  function typeIdFromBlob(s) {
    const m = String(s || "").match(/things\/(\d+)/i);
    return m ? m[1] : "";
  }
  function typeIdFromEl(el) {
    if (!el) return "";
    const bits = [];
    el.querySelectorAll("img").forEach((img) => {
      bits.push(img.getAttribute("src") || "", img.src || "", img.getAttribute("style") || "");
    });
    bits.push(el.getAttribute("style") || "", el.innerHTML || "");
    for (const b of bits) { const id = typeIdFromBlob(b); if (id) return id; }
    return "";
  }

  function getMouthItems() {
    return Array.from(document.querySelectorAll("#itemList .itemInMouth")).map((el) => {
      return { id: String(el.id || ""), typeId: typeIdFromEl(el) || null };
    }).filter((x) => x.id);
  }

  function refineAllMouth() {
    let ch = false;
    for (const item of getMouthItems()) {
      if (state.items[item.id] && refineItem(item.id, item.typeId)) ch = true;
    }
    return ch;
  }

  function keyOfMouthItem(item) {
    if (!item) return null;
    if (state.items[item.id]) return state.items[item.id].key;
    if (item.typeId && typeToKey[item.typeId]) return typeToKey[item.typeId];
    return null;
  }

  function refineItem(id, typeId, name) {
    const rec = state.items[id];
    if (!rec) return false;
    let ch = false;
    if (typeId && String(rec.typeId || "") !== String(typeId)) {
      rec.typeId = String(typeId); rememberType(typeId, rec.key); ch = true;
    }
    const inferred = nameFromType(rec.key, rec.typeId) || name || rec.name || "";
    if (inferred && rec.name !== inferred) { rec.name = inferred; ch = true; }
    if (ch) saveState();
    return ch;
  }

  function registerFound(id, key, typeId, name) {
    id = String(id);
    if (!id || !key) return false;
    if (state.items[id]) return refineItem(id, typeId, name);
    const inferred = nameFromType(key, typeId) || name || "";
    state.items[id] = { key, typeId: typeId ? String(typeId) : null, name: inferred, status: "found", foundAt: Date.now() };
    if (!state.order.includes(id)) state.order.push(id);
    rememberType(typeId, key);
    saveState();
    farmMarkCaught(id, key);
    return true;
  }

  function markDelivered(id) {
    const rec = state.items[id];
    if (!rec || rec.status === "delivered") return false;
    rec.status = "delivered";
    rec.deliveredAt = Date.now();
    saveState();
    farmMarkDelivered(id, rec.key);
    return true;
  }

  function unDeliver(id) {
    const rec = state.items[id];
    if (!rec || rec.status !== "delivered") return false;
    rec.status = "found";
    delete rec.deliveredAt;
    saveState();
    return true;
  }

  const pendingFinds = [];
  const pendingNews = [];
  const pendingPuts = [];
  const pendingPicks = [];
  const lastRemoved = [];
  const lastAdded = [];
  const groundPending = [];
  const pendingLooks = [];
  let lastMouth = [];
  let lastSelected = { id: null, key: null, typeId: null, t: 0 };
  let histZone = null;
  let replayMode = false;

  function expireQueues() {
    const now = Date.now();
    const keep = (q, ms) => { for (let i = q.length - 1; i >= 0; i--) if (now - q[i].t > ms) q.splice(i, 1); };
    keep(pendingFinds, 15000);
    keep(pendingNews, 15000);
    keep(pendingPuts, 20000);
    keep(pendingPicks, 20000);
    keep(lastRemoved, 20000);
    keep(lastAdded, 20000);
    keep(groundPending, 120000);
    keep(pendingLooks, 300000);
  }

  function readThdeyId() {
    const th = document.querySelector("#thdey");
    if (!th) return null;
    const m = String(th.textContent || "").match(/Уникальный ID:\s*([0-9]+)/i);
    return m ? m[1] : null;
  }

  function noteSelected(id, typeId) {
    if (!id) return;
    id = String(id);
    const item = { id, typeId: typeId || null };
    const mouth = getMouthItems().find((x) => x.id === id);
    if (mouth) item.typeId = mouth.typeId || item.typeId;
    lastSelected = { id, typeId: item.typeId, key: keyOfMouthItem(item), t: Date.now() };
  }

  function snapshotSelected() {
    const active = document.querySelector("#itemList .itemInMouth.active_thing");
    const id = readThdeyId() || (active && active.id);
    if (id) noteSelected(id);
    return lastSelected.id ? lastSelected : null;
  }

  function handleLookLine(name) {
    const hit = matchResourceHit(name);
    snapshotSelected();
    if (!lastSelected.id) return;
    const key = (hit && hit.res && hit.res.key) || lastSelected.key;
    if (!key) return;
    const sub = (hit && hit.name) || "";
    const existing = pendingLooks.find((x) => x.id === lastSelected.id && !x.seenLook);
    if (existing) {
      existing.seenLook = true;
      existing.key = key;
      if (sub) existing.name = sub;
      existing.t = Date.now();
    } else {
      pendingLooks.push({ id: lastSelected.id, key, name: sub, typeId: lastSelected.typeId, t: Date.now(), seenLook: true });
    }
    if (!state.lookLog) state.lookLog = [];
    state.lookLog.push({ id: String(lastSelected.id), key, t: Date.now() });
    saveState();
  }

  function handleWoolLine(line) {
    const mine = CAUGHT_ME_RE.test(line);
    const other = CAUGHT_OTHER_RE.test(line);
    if (!mine && !other) return;
    expireQueues();
    let idx = -1;
    for (let i = pendingLooks.length - 1; i >= 0; i--) {
      if (pendingLooks[i].id) { idx = i; break; }
    }
    if (idx < 0 && lastSelected.id && Date.now() - lastSelected.t < 60000) {
      const mouth = getMouthItems().find((x) => x.id === lastSelected.id);
      if (mouth) {
        pendingLooks.push({
          id: lastSelected.id, key: lastSelected.key, typeId: lastSelected.typeId,
          t: Date.now(), seenLook: true
        });
        idx = pendingLooks.length - 1;
      }
    }
    if (idx < 0) return;
    const look = pendingLooks.splice(idx, 1)[0];
    if (!mine || !look.id || !look.key) return;
    if (registerFound(look.id, look.key, look.typeId, look.name)) {
      updateTable();
      const hist = document.querySelector("#ist");
      if (hist) paintHistory(hist);
    }
  }

  function tryBindFinds() {
    expireQueues();
    let changed = false;

    const takeNews = (pred) => {
      const i = pendingNews.findIndex(pred);
      if (i < 0) return null;
      return pendingNews.splice(i, 1)[0];
    };

    for (let i = 0; i < pendingFinds.length; ) {
      const find = pendingFinds[i];
      const res = resources.find((x) => x.key === find.key);
      const amb = res && nameIsAmbiguous(res, find.name);
      let news = takeNews((n) => {
        if (state.items[n.id]) return false;
        const tid = n.typeId || "";
        const sameCat = keyOfMouthItem(n) === find.key || (tid && typeToKey[tid] === find.key);
        if (!sameCat) return false;
        if (!amb) return true;
        if (!tid) return false;
        return (res.parts || []).some((p) => p.typeId && String(p.typeId) === String(tid));
      });

      if (!news && !amb && pendingFinds.length === 1 && pendingNews.length === 1) {
        const only = pendingNews[0];
        if (!state.items[only.id] && !keyOfMouthItem(only) && Math.abs(only.t - find.t) < 4000) {
          news = pendingNews.shift();
        }
      }

      if (!news) { i++; continue; }
      const tid = news.typeId || typeIdFromEl(document.getElementById(news.id));
      if (registerFound(news.id, find.key, tid, find.name)) changed = true;
      pendingFinds.splice(i, 1);
    }

    if (changed) {
      updateTable();
      const hist = document.querySelector("#ist");
      if (hist) paintHistory(hist);
    }
  }

  function scheduleBindRetries() {
    [80, 300, 800, 1600].forEach((ms) => {
      setTimeout(() => {
        syncMouth();
        if (refineAllMouth()) updateTable();
        tryBindFinds();
        flushPendingPuts();
        flushPendingPicks();
        retryCovers();
      }, ms);
    });
  }

  function notePick(id, key) {
    if (!id) return;
    if (!state.pickLog) state.pickLog = [];
    state.pickLog.push({ id: String(id), key: key || "", t: Date.now() });
    saveState();
  }

  function takeAdded(key) {
    expireQueues();
    for (let i = lastAdded.length - 1; i >= 0; i--) {
      const it = lastAdded[i];
      const k = it.key || (it.typeId && typeToKey[it.typeId]);
      if (k === key) { lastAdded.splice(i, 1); it.key = key; return it; }
    }
    return null;
  }

  function handlePickResource(key) {
    const added = takeAdded(key);
    if (added) { notePick(added.id, key); return; }
    pendingPicks.push({ key, t: Date.now() });
  }

  function flushPendingPicks() {
    expireQueues();
    for (let i = 0; i < pendingPicks.length; ) {
      const p = pendingPicks[i];
      const added = takeAdded(p.key);
      if (!added) { i++; continue; }
      pendingPicks.splice(i, 1);
      notePick(added.id, p.key);
    }
  }

  function onItemAdded(item) {
    const known = state.items[item.id];
    const key = known ? known.key : (keyOfMouthItem(item) || (item.typeId && typeToKey[item.typeId]) || null);
    lastAdded.push({ id: item.id, typeId: item.typeId, key, t: Date.now() });
    flushPendingPicks();
    if (known) {
      const g = groundPending.findIndex((x) => x.id === item.id);
      if (g >= 0) groundPending.splice(g, 1);
      if (refineItem(item.id, item.typeId)) updateTable();
      if (known.status === "delivered") {
        unDeliver(item.id);
        updateTable();
        const hist = document.querySelector("#ist");
        if (hist) paintHistory(hist);
      }
      return;
    }
    pendingNews.push({ id: item.id, typeId: item.typeId, t: Date.now() });
    tryBindFinds();
    refreshMouthChips();
  }

  function onItemRemoved(item) {
    lastRemoved.push({ id: item.id, typeId: item.typeId, key: keyOfMouthItem(item), t: Date.now() });
    flushPendingPuts();
    refreshMouthChips();
  }

  function syncMouth() {
    const now = getMouthItems();
    const prevMap = new Map(lastMouth.map((i) => [i.id, i]));
    const nowMap = new Map(now.map((i) => [i.id, i]));
    for (const item of now) if (!prevMap.has(item.id)) onItemAdded(item);
    for (const item of lastMouth) if (!nowMap.has(item.id)) onItemRemoved(item);
    lastMouth = now;
  }

  function takeRemoved(key) {
    expireQueues();
    for (let i = lastRemoved.length - 1; i >= 0; i--) {
      const it = lastRemoved[i];
      const k = it.key || (it.typeId && typeToKey[it.typeId]);
      if (k === key && state.items[it.id] && state.items[it.id].key === key) {
        lastRemoved.splice(i, 1); it.key = key; return it;
      }
    }
    const mouthIds = new Set(getMouthItems().map((x) => x.id));
    for (let i = state.order.length - 1; i >= 0; i--) {
      const id = state.order[i];
      const rec = state.items[id];
      if (!rec || rec.key !== key) continue;
      if (rec.status === "delivered") continue;
      if (mouthIds.has(id)) continue;
      if (groundPending.some((g) => g.id === String(id))) continue;
      return { id, key, typeId: rec.typeId, t: Date.now() };
    }
    return null;
  }

  function coverGround(zone) {
    if (!zone) return;
    let changed = false;
    for (let i = groundPending.length - 1; i >= 0; i--) {
      const g = groundPending[i];
      const rec = state.items[g.id];
      if (!rec) { groundPending.splice(i, 1); continue; }
      const res = resources.find((r) => r.key === rec.key);
      if (!res || res.zone !== zone) continue;
      if (markDelivered(g.id)) changed = true;
      groundPending.splice(i, 1);
    }
    if (changed) {
      updateTable();
      const hist = document.querySelector("#ist");
      if (hist) paintHistory(hist);
    }
  }

  function putKnownItem(id, key, zone, lineHasStone) {
    const rec = state.items[id];
    if (!rec || rec.key !== key) return;
    const res = resources.find((r) => r.key === rec.key);
    if (!res) return;
    if (!state.putLog) state.putLog = [];
    state.putLog.push({ id: String(id), key: rec.key, t: Date.now() });
    saveState();
    if (res.drop) {
      let changed = false;
      if (zone && zone === res.zone) changed = markDelivered(id);
      if (lineHasStone) requestCover(zone);
      else if (changed) {
        updateTable();
        const hist = document.querySelector("#ist");
        if (hist) paintHistory(hist);
      }
      return;
    }
    if (zone && zone === res.zone) {
      if (!groundPending.some((g) => g.id === String(id))) {
        groundPending.push({ id: String(id), key: rec.key, t: Date.now() });
      }
      if (lineHasStone) requestCover(zone);
    }
  }

  function handlePutResource(key, zone, lineHasStone) {
    const removed = takeRemoved(key);
    if (removed) { putKnownItem(removed.id, key, zone, lineHasStone); return; }
    pendingPuts.push({ key, zone, lineHasStone, t: Date.now() });
  }

  function flushPendingPuts() {
    expireQueues();
    for (let i = 0; i < pendingPuts.length; ) {
      const p = pendingPuts[i];
      const removed = takeRemoved(p.key);
      if (!removed) { i++; continue; }
      pendingPuts.splice(i, 1);
      if (state.items[removed.id]) putKnownItem(removed.id, p.key, p.zone, p.lineHasStone);
    }
  }

  function splitEvents(text) {
    return String(text || "")
      .replace(/\u00a0/g, " ")
      .replace(/([.!?])(?:\s+|(?=[А-ЯЁ]))/g, "$1\u0001")
      .split(/\n+|\u0001/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function processEvent(line) {
    const go = line.match(GO_RE);
    if (go) { histZone = zoneByLocationName(go[1] || line); return; }
    const zone = replayMode ? histZone : currentZone();
    const found = line.match(FIND_RE);
    if (!scriptAlive) return;
    if (found) {
      if (replayMode) return;
      const hit = matchResourceHit(found[1] || line);
      if (hit) {
        pendingFinds.push({ key: hit.res.key, name: hit.name, t: Date.now(), snippet: line });
        tryBindFinds();
        scheduleBindRetries();
      }
      return;
    }
    if (replayMode) return;
    const looked = line.match(LOOK_RE);
    if (looked) { handleLookLine(looked[1] || line); return; }
    if (WOOL_RE.test(line) || CAUGHT_ME_RE.test(line) || CAUGHT_ANY_RE.test(line)) {
      handleWoolLine(line); return;
    }
    const pick = line.match(PICK_RE);
    if (pick) {
      const res = matchResource(pick[1] || line);
      if (res) handlePickResource(res.key);
      return;
    }
    const put = line.match(PUT_RE);
    if (put) {
      const payload = put[1] || line;
      const res = matchResource(payload);
      const stone = hasStone(payload);
      if (res) handlePutResource(res.key, zone, stone);
      if (stone) requestCover(zone);
    }
  }

  function newestExtra(prev, next) {
    const t = String(next || "");
    const p = String(prev || "");
    if (!t) return { kind: "none", extra: "" };
    if (/^\s*История очищена\.?\s*$/i.test(t)) return { kind: "clear", extra: "" };
    if (t === p) return { kind: "none", extra: "" };
    if (!p) return { kind: "fresh", extra: t };
    if (t.startsWith(p)) return { kind: "append", extra: t.slice(p.length) };
    if (t.endsWith(p)) return { kind: "append", extra: t.slice(0, t.length - p.length) };

    const a = splitEvents(p);
    const b = splitEvents(t);
    const same = (x, y) => x.join("\n") === y.join("\n");

    if (b.length >= a.length && same(b.slice(0, a.length), a)) return { kind: "append", extra: b.slice(a.length).join(" ") };
    if (b.length >= a.length && same(b.slice(b.length - a.length), a)) return { kind: "append", extra: b.slice(0, b.length - a.length).join(" ") };
    for (let i = 1; i < a.length; i++) {
      const tail = a.slice(i);
      if (b.length >= tail.length && same(b.slice(0, tail.length), tail)) return { kind: "append", extra: b.slice(tail.length).join(" ") };
      if (b.length >= tail.length && same(b.slice(b.length - tail.length), tail)) return { kind: "append", extra: b.slice(0, b.length - tail.length).join(" ") };
    }
    if (t.length < p.length && p.includes(t)) return { kind: "trim", extra: "" };
    return { kind: "fresh", extra: t };
  }

  function extraEvents(prev, next) {
    const count = {};
    for (const e of splitEvents(prev)) count[e] = (count[e] || 0) + 1;
    const extra = [];
    for (const e of splitEvents(next)) {
      if (count[e]) count[e]--; else extra.push(e);
    }
    return extra;
  }

  function consumeHistory(text, mode) {
    replayMode = mode === "replay";
    rememberLocation();
    const events = splitEvents(text);
    const goAt = events.findIndex((e) => GO_RE.test(e));
    batchCoverZones.length = 0;
    if (!replayMode) syncMouth();
    for (let i = 0; i < events.length; i++) {
      if (!replayMode && goAt >= 0 && i < goAt) {
        batchZoneOverride = zoneByLocationName(prevLocName) || zoneByLocationName(liveLocName) || histZone;
      } else {
        batchZoneOverride = null;
      }
      processEvent(events[i]);
    }
    batchZoneOverride = null;
    if (!replayMode) {
      syncMouth();
      if (refineAllMouth()) updateTable();
      flushPendingPuts();
      const covers = batchCoverZones.slice();
      batchCoverZones.length = 0;
      for (const z of covers) coverGround(z);
    }
    replayMode = false;
  }

  function adoptUnboundMouth(histText) {
    const mouth = getMouthItems();
    const unbound = mouth.filter((i) => !state.items[i.id]);
    if (!unbound.length) return;

    const finds = [];
    for (const line of splitEvents(histText)) {
      const m = line.match(FIND_RE);
      if (!m) continue;
      const res = matchResource(m[1] || line);
      if (res) finds.push(res.key);
    }

    const used = {};
    for (const id of state.order) {
      const rec = state.items[id];
      if (rec) used[rec.key] = (used[rec.key] || 0) + 1;
    }

    const leftover = [];
    const leftoverCount = {};
    for (const key of finds) leftoverCount[key] = (leftoverCount[key] || 0) + 1;
    for (const key of Object.keys(leftoverCount)) {
      const free = Math.max(0, leftoverCount[key] - (used[key] || 0));
      for (let i = 0; i < free; i++) leftover.push(key);
    }

    for (const item of unbound) {
      const byType = item.typeId && typeToKey[item.typeId];
      let key = null;
      if (byType) {
        const idx = leftover.lastIndexOf(byType);
        if (idx >= 0) { leftover.splice(idx, 1); key = byType; }
      }
      if (!key && leftover.length === 1) key = leftover.pop();
      if (key) registerFound(item.id, key, item.typeId);
    }
  }

  let ignoreMutations = false;

  function idsForKey(key) {
    return state.order.filter((id) => state.items[id] && state.items[id].key === key);
  }

  function paintHistory(hist) {
    if (!hist) return;
    const text = hist.textContent || "";
    if (/^\s*История очищена\.?\s*$/i.test(text)) return;

    const findCursor = {}, putCursor = {}, pickCursor = {}, lookCursor = {};
    const visibleFinds = {}, visiblePuts = {}, visiblePicks = {}, visibleLooks = {};
    for (const r of resources) {
      const names = namesOf(r).map((n) => escapeRe(n)).join("|");
      if (!names) continue;
      const fRe = new RegExp("(?:Обнаружил|Обнаружила)\\s+(?:" + names + ")", "gi");
      const pRe = new RegExp("(?:Положил|Положила)\\s+на\\s+землю\\s+(?:" + names + ")", "gi");
      const kRe = new RegExp("(?:Поднял|Подняла)\\s+с\\s+земли\\s+(?:" + names + ")", "gi");
      const lRe = new RegExp("(?:Осмотрел|Осмотрела)\\s+(?:" + names + ")", "gi");
      visibleFinds[r.key] = (text.match(fRe) || []).length;
      visiblePuts[r.key] = (text.match(pRe) || []).length;
      visiblePicks[r.key] = (text.match(kRe) || []).length;
      visibleLooks[r.key] = (text.match(lRe) || []).length;
      findCursor[r.key] = 0; putCursor[r.key] = 0; pickCursor[r.key] = 0; lookCursor[r.key] = 0;
    }

    const chunks = String(text)
      .replace(/([.!?])(\s+)/g, "$1\u0001$2")
      .split(/(\n+|\u0001)/);

    const wrap = (sentence) => {
      let s = sentence.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      const paintTag = (kind, body, id) => {
        const cls = kind === "put" ? "cw-ny-put" : kind === "pick" ? "cw-ny-pick" : "cw-ny-found";
        id = id && String(id);
        if (!id) return `<span class="${cls} cw-ny-tag" data-cw-id="">${body}</span>`;
        return `<span class="${cls} cw-ny-tag" data-cw-id="${escAttr(id)}">${body}</span>`;
      };
      const logsOf = (log, key) => (log || []).filter((p) => p && p.key === key);

      s = s.replace(/((?:Обнаружил|Обнаружила)\s+)([^\n.]+)/gi, (m, verb, name) => {
        const res = matchResource(name);
        if (!res) return m;
        const ids = idsForKey(res.key);
        const vis = visibleFinds[res.key] || 0;
        const idx = ids.length - vis + findCursor[res.key];
        findCursor[res.key]++;
        let id = (idx >= 0 && idx < ids.length) ? ids[idx] : undefined;
        if (!id && ids.length > 0) id = ids[ids.length - 1];
        return paintTag("find", m, id);
      });

      s = s.replace(/((?:Осмотрел|Осмотрела)\s+)([^\n.]+)/gi, (m, verb, name) => {
        const res = matchResource(name);
        if (!res) return m;
        const looks = logsOf(state.lookLog, res.key);
        const vis = visibleLooks[res.key] || 0;
        const idx = looks.length - vis + lookCursor[res.key];
        lookCursor[res.key]++;
        let id = (idx >= 0 && idx < looks.length) ? looks[idx] && looks[idx].id : undefined;
        if (!id && looks.length > 0) id = looks[looks.length - 1].id;
        return paintTag("find", m, id);
      });

      s = s.replace(/((?:Заметил|Заметила)\s+клочок\s+шерсти[^\n.]*|Мой\s+нос\s+учуял[^\n.]*)/gi, (m) => {
        const ok = CAUGHT_ME_RE.test(m);
        return '<span class="' + (ok ? "cw-ny-found" : "cw-ny-put") + '">' + m + "</span>";
      });

      s = s.replace(/((?:Положил|Положила)\s+на\s+землю\s+)([^\n.]+)/gi, (m, verb, name) => {
        const res = matchResource(name);
        if (!res) return paintTag("put", m, "");
        const puts = logsOf(state.putLog, res.key);
        const vis = visiblePuts[res.key] || 0;
        const idx = puts.length - vis + putCursor[res.key];
        putCursor[res.key]++;
        let id = (idx >= 0 && idx < puts.length) ? puts[idx] && puts[idx].id : undefined;
        if (!id && puts.length > 0) id = puts[puts.length - 1].id;
        return paintTag("put", m, id);
      });

      s = s.replace(/((?:Поднял|Подняла)\s+с\s+земли\s+)([^\n.]+)/gi, (m, verb, name) => {
        const res = matchResource(name);
        if (!res) return m;
        const picks = logsOf(state.pickLog, res.key);
        const vis = visiblePicks[res.key] || 0;
        const idx = picks.length - vis + pickCursor[res.key];
        pickCursor[res.key]++;
        let id = (idx >= 0 && idx < picks.length) ? picks[idx] && picks[idx].id : undefined;
        if (!id && picks.length > 0) id = picks[picks.length - 1].id;
        return paintTag("pick", m, id);
      });

      return s;
    };

    const html = chunks.map((chunk, i) => {
      if (i % 2 === 1) return chunk.replace(/\u0001/g, "").replace(/\n/g, "<br>");
      return wrap(chunk);
    }).join("");

    ignoreMutations = true;
    hist.innerHTML = html;
    queueMicrotask(() => { ignoreMutations = false; });
  }

  // --- ДОБАВЛЕНА КНОПКА-ТРИГГЕР ---
  const trigger = document.createElement("div");
  trigger.id = "nyTrigger";
  trigger.innerHTML = "🐚";
  trigger.title = "Лог нырков";
  mount(trigger);

  const panel = document.createElement("div");
  panel.id = "resourcePanel";
  panel.innerHTML = `
  <style>
    #nyTrigger {
      position: fixed; bottom: 20px; left: 20px; z-index: 999999;
      width: 44px; height: 44px; border-radius: 50%;
      background: linear-gradient(135deg, #1e5799 0%,#2989d8 50%,#207cca 51%,#7db9e8 100%);
      color: white; font-size: 22px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; user-select: none;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.3);
      transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    #nyTrigger:hover {
      transform: scale(1.1) rotate(-5deg);
      box-shadow: 0 6px 20px rgba(40, 160, 255, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.4);
    }
    #nyTrigger:active {
      transform: scale(0.95);
    }

    #resourcePanel {
      position: fixed; top: 100px; left: 50px;
      width: 462px; font-size: 14.5px; user-select: none;
      font-family: "Trebuchet MS", "Segoe UI", sans-serif;
      color: #d9f4ff;
      z-index: 999998;
      padding: 8px 8px 4px;
      border-radius: 14px;
      border: 1px solid rgba(90, 200, 230, .38);
      background:
        radial-gradient(120px 70px at 12% 0%, rgba(255, 130, 110, .16), transparent 70%),
        radial-gradient(140px 80px at 92% 100%, rgba(40, 180, 150, .14), transparent 70%),
        linear-gradient(180deg, rgba(10, 48, 78, .78) 0%, rgba(5, 24, 48, .84) 48%, rgba(2, 12, 30, .90) 100%);
      box-shadow:
        0 10px 32px rgba(0, 16, 36, .55),
        inset 0 1px 0 rgba(180, 240, 255, .18),
        inset 0 -18px 28px rgba(0, 30, 60, .25);
      backdrop-filter: blur(7px);
      transition: opacity 0.25s ease, transform 0.25s ease;
      transform-origin: bottom left;
    }
    #resourcePanel.ny-hidden {
      opacity: 0; pointer-events: none; transform: scale(0.95) translateY(10px);
    }
    #resourcePanel::before {
      content: ""; pointer-events: none; position: absolute; inset: 0; border-radius: 14px;
      background: repeating-linear-gradient(180deg, transparent 0 18px, rgba(80, 180, 220, .035) 18px 19px);
      opacity: .7;
    }
    #resourcePanel > * { position: relative; }
    #resourcePanel table { width: 100%; border-collapse: separate; border-spacing: 0; text-align: center; }
    #resourcePanel td, #resourcePanel th {
      padding: 5px 4px; vertical-align: middle; text-align: center;
      border-bottom: 1px solid rgba(80, 160, 200, .16);
    }
    #nyTableWrap {
      height: 352px; overflow: auto; border-radius: 8px;
      border: 1px solid rgba(70, 170, 210, .28);
      background: rgba(2, 16, 36, .28);
    }
    #resourcePanel thead th {
      position: sticky; top: 0; z-index: 3;
      background: linear-gradient(180deg, rgba(12, 56, 88, .96), rgba(8, 36, 64, .96));
      color: #b9e8ff;
      font-size: 12px; letter-spacing: .04em; text-transform: uppercase;
      border-bottom: 1px solid rgba(120, 210, 240, .35);
      box-shadow: 0 2px 8px rgba(0, 10, 24, .35);
    }
    #resourcePanel .ny-pic img {
      width: 58px; height: 58px; object-fit: contain;
      background: rgba(0, 12, 28, .45);
      border-radius: 8px;
      border: 1px solid rgba(90, 190, 220, .28);
    }
    #resourcePanel tr.ny-solo td:first-child { background: linear-gradient(90deg, rgba(20, 70, 110, .22), transparent); }
    #resourcePanel tr.ny-folder td { background: linear-gradient(90deg, rgba(18, 80, 120, .38), rgba(8, 30, 56, .2)); }
    #resourcePanel tr.ny-folder td:first-child { font-weight: 700; }
    #resourcePanel .ny-fold-pic { position: relative; display: inline-block; cursor: pointer; }
    #resourcePanel .ny-fold-pic img {
      width: 58px; height: 58px; object-fit: contain;
      background: rgba(0, 12, 28, .45); border-radius: 8px;
      box-shadow: 0 0 0 1px rgba(255, 150, 120, .25), 0 0 12px rgba(40, 160, 200, .2);
    }
    #resourcePanel .ny-fold-pic:hover img { box-shadow: 0 0 0 2px #7ad7ff; }
    #resourcePanel .ny-chev {
      position: absolute; right: 1px; bottom: 1px;
      background: rgba(0, 20, 40, .75); color: #c8f0ff;
      border-radius: 3px; font-style: normal; font-size: 11px;
      line-height: 1; padding: 2px 3px; pointer-events: none;
    }
    #resourcePanel tr.ny-child td { background: rgba(4, 18, 36, .35); color: #c5e6f5; }
    #resourcePanel tr.ny-child td:first-child {
      padding-left: 28px; border-left: 3px solid rgba(255, 140, 120, .55); text-align: left;
    }
    #resourcePanel tr.ny-child img {
      width: 38px; height: 38px; object-fit: contain;
      background: rgba(0, 12, 28, .4); border-radius: 6px; vertical-align: middle;
    }
    #resourcePanel tr.ny-child .ny-child-name { display: inline-block; margin-left: 6px; }
    #resourcePanel tr.ny-zone td {
      padding: 4px 8px;
      background: linear-gradient(90deg, rgba(30, 110, 160, .45), rgba(12, 50, 86, .28));
      color: #e8fbff; font-size: 13px; font-weight: 700;
      letter-spacing: .03em; cursor: pointer; text-align: left;
      border-bottom: 1px solid rgba(140, 220, 255, .25);
    }
    #resourcePanel tr.ny-zone td:first-child { padding-left: 8px; }
    #resourcePanel tr.ny-zone .ny-zone-mark { display: inline-block; width: 14px; color: #9be7ff; margin-right: 6px; }
    #resourcePanel tr.ny-zone .ny-zone-ico { margin-right: 4px; opacity: .9; }
    #resourcePanel tr.ny-group td {
      padding: 3px 8px 3px 34px; background: rgba(16, 64, 96, .35);
      color: #cfefff; font-size: 13px; font-weight: 600; text-align: left; cursor: pointer;
      border-bottom: 1px dashed rgba(90, 180, 210, .25);
    }
    #resourcePanel tr.ny-group .ny-zone-mark { color: #9be7ff; margin-right: 6px; }
    #resourcePanel tr.ny-got td.delivered, #resourcePanel tr.ny-got td.score { color: #8ef0c0; font-weight: 700; }
    #resourcePanel tr.ny-got td:first-child { box-shadow: inset 3px 0 0 #3dcc8a; }
    #resourcePanel tr.ny-got.ny-child td:first-child { border-left-color: #3dcc8a; }
    #resourcePanel #totalRow td {
      background: rgba(4, 28, 48, .7); color: #b8ffe0;
      border-top: 1px solid rgba(100, 210, 180, .3);
    }
    #nyResize {
      height: 9px; margin: 3px 0 1px; cursor: ns-resize; border-radius: 6px;
      background: linear-gradient(180deg, transparent 3px, rgba(110, 200, 230, .35) 3px 4px, transparent 4px 6px, rgba(110, 200, 230, .2) 6px 7px, transparent 7px);
    }
    #nyResize:hover { background-color: rgba(80, 180, 220, .12); }
    #panelHeader {
      cursor: move;
      background: linear-gradient(90deg, rgba(16, 70, 108, .7), rgba(10, 36, 64, .45));
      padding: 5px 8px; border-radius: 8px; margin-bottom: 6px;
      display: flex; justify-content: space-between; align-items: center;
      border: 1px solid rgba(100, 200, 230, .22);
    }
    #nyTitle { color: #e6fbff; text-shadow: 0 0 10px rgba(80, 200, 255, .25); }
    #resourcePanel .hdr-btns { display: flex; gap: 4px; }
    #resourcePanel .hdr-btns button {
      background: rgba(20, 80, 120, .65); border: 1px solid rgba(120, 210, 240, .3);
      color: #e8fbff; cursor: pointer; border-radius: 5px; padding: 2px 7px;
    }
    #resourcePanel .hdr-btns button:hover { background: rgba(40, 120, 170, .75); }
    #resourcePanel .hint { font-size: 11px; opacity: .78; margin-top: 6px; line-height: 1.35; color: #b7dcea; }
    #idLog {
      margin-top: 6px; max-height: 120px; overflow: auto;
      font-size: 11px; background: rgba(2, 14, 28, .55); border-radius: 6px; padding: 4px 6px;
      display: none; text-align: left; border: 1px solid rgba(70, 160, 200, .25);
    }
    #idLog div { padding: 1px 0; border-bottom: 1px solid rgba(40, 80, 110, .35); }
    #idLog .st-found { color: #9cdcff; }
    #idLog .st-delivered { color: #8ef0c0; }
    #ist .cw-ny-found { background: rgba(100,180,255,0.25); padding: 1px 2px; border-radius: 3px; }
    #ist .cw-ny-put { background: rgba(160,255,160,0.25); padding: 1px 2px; border-radius: 3px; }
    #ist .cw-ny-pick { background: rgba(255,196,90,0.28); padding: 1px 2px; border-radius: 3px; }
    #ist .cw-ny-tag { cursor: help; border-bottom: 1px dotted rgba(220,240,255,.7); position: relative; }

    #nyGate, #nyStudio { position: fixed; z-index: 1000000; font-family: sans-serif; color: #eee; }
    #nyGate { inset: 0; background: rgba(0,0,0,.55); display: none; align-items: center; justify-content: center; }
    #nyGate .box { background: #1a1a1a; border: 1px solid #555; border-radius: 8px; padding: 14px 16px; width: 280px; }
    #nyGate input {
      width: 100%; box-sizing: border-box; margin: 8px 0;
      background: #111; color: #eee; border: 1px solid #444; border-radius: 4px; padding: 6px 8px;
    }
    #nyGate button, #nyStudio button {
      background: #444; border: none; color: #fff; border-radius: 4px; padding: 4px 8px; cursor: pointer;
    }
    #nyGate button:hover, #nyStudio button:hover { background: #5a5a5a; }
    #nyStudio {
      top: 80px; left: 490px; width: 640px; max-height: 84vh;
      background: rgba(10,10,10,.94); border: 2px solid #3a3a3a;
      border-radius: 8px; display: none; flex-direction: column;
    }
    #nyStudio .st-head {
      cursor: move; background: #222; padding: 6px 8px;
      display: flex; justify-content: space-between; align-items: center;
      border-radius: 6px 6px 0 0;
    }
    #nyStudio .st-body { overflow: auto; padding: 8px; font-size: 13px; }
    #nyStudio .st-foot {
      padding: 8px; border-top: 1px solid #333;
      display: flex; gap: 6px; flex-wrap: wrap; align-items: center;
    }
    #nyStudio h3 { margin: 10px 0 6px; font-size: 13px; color: #bcd; }
    #nyStudio .row { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 6px; }
    #nyStudio input[type="text"], #nyStudio input[type="number"], #nyStudio select {
      background: #141414; color: #eee; border: 1px solid #444; border-radius: 4px; padding: 4px 6px;
    }
    #nyStudio .card {
      border: 1px solid #333; border-radius: 6px; padding: 8px; margin-bottom: 8px; background: #151515;
    }
    #nyStudio .card.active { border-color: #6a8; box-shadow: 0 0 0 1px #6a8; }
    #nyStudio .card-top { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
    #nyStudio .items { width: 100%; border-collapse: collapse; margin-top: 6px; }
    #nyStudio .items td { padding: 3px; border-bottom: 1px solid #2a2a2a; vertical-align: middle; }
    #nyStudio .items input { width: 100%; box-sizing: border-box; }
    #nyStudio .items img { width: 28px; height: 28px; background: #222; border-radius: 4px; }
    #nyStudio .ny-folder-preview { width: 36px; height: 36px; background: #222; border-radius: 4px; object-fit: contain; }
    #nyStudio .chips { display: flex; flex-wrap: wrap; gap: 6px; min-height: 32px; }
    #nyStudio .chip {
      display: flex; align-items: center; gap: 4px;
      background: #222; border: 1px solid #444; border-radius: 6px;
      padding: 2px 6px; cursor: pointer;
    }
    #nyStudio .chip:hover { border-color: #8ca; }
    #nyStudio .chip img { width: 22px; height: 22px; }
    #nyStudio .muted { opacity: .65; font-size: 11px; }
    #nyStudio .danger { background: #622 !important; }
    #nyStudio .ok { background: #264 !important; }
    #nyStudio .zone-pill {
      display: inline-flex; gap: 4px; align-items: center;
      background: #222; border: 1px solid #444; border-radius: 12px; padding: 2px 8px; margin: 2px;
    }
  </style>
  <div id="panelHeader">
    <b id="nyTitle">Ныныны · лог нырков</b>
    <div class="hdr-btns">
      <button id="idsBtn" title="Показать привязанные ID">ID</button>
      <button id="resetBtn" title="Обнулить счётчик">Сброс</button>
      <button id="toggleBtn" title="Скрыть панель" style="font-weight:bold; padding:2px 10px; font-size:14px; line-height:1;">×</button>
    </div>
  </div>
  <div id="panelContent">
    <div id="nyTableWrap"><table id="resourceTable"></table></div>
    <div id="nyResize" title="Высота таблицы"></div>
    <div id="idLog"></div>
    <div class="hint">
      Наведите на подсвеченное действие в истории — появится уникальный ID.
      Сдача только в нужной локации у уже подписанного ID.
      Подняли обратно — снова не сдан. Камень сдаётся, если просто положили.
      Очистка истории счётчик не сбрасывает.
    </div>
  </div>`;

  function mount(el) {
    const add = () => document.body.appendChild(el);
    if (document.body) add(); else document.addEventListener("DOMContentLoaded", add);
  }
  const cssNode = panel.querySelector("style");
  if (cssNode) { cssNode.id = "cwNyCss"; (document.head || document.documentElement).appendChild(cssNode); }
  mount(panel);

  // --- ДОБАВЛЕНА ПОДСКАЗКА ---
  const nyTooltip = document.createElement("div");
  nyTooltip.id = "nyTooltip";
  nyTooltip.style.cssText = `
    position: fixed; display: none; z-index: 10000000;
    background: rgba(15, 31, 48, 0.95); color: #7ad7ff;
    font-size: 11px; line-height: 1.2;
    padding: 4px 8px; border-radius: 4px;
    border: 1px solid #4fc3f7;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    font-family: "Trebuchet MS", "Segoe UI", sans-serif;
  `;
  mount(nyTooltip);

  document.addEventListener("mouseover", (e) => {
    if (!e.target.closest) return;
    const tag = e.target.closest(".cw-ny-tag");
    if (tag) {
      const id = tag.getAttribute("data-cw-id");
      if (id) {
        nyTooltip.textContent = "Уникальный ID: " + id;
      } else {
        nyTooltip.textContent = "Уникальный ID не определён";
      }
      nyTooltip.style.display = "block";
      nyTooltip.style.left = (e.clientX + 12) + "px";
      nyTooltip.style.top = (e.clientY + 12) + "px";
    } else {
      nyTooltip.style.display = "none";
    }
  });
  document.addEventListener("mousemove", (e) => {
    if (nyTooltip.style.display === "block") {
      nyTooltip.style.left = (e.clientX + 12) + "px";
      nyTooltip.style.top = (e.clientY + 12) + "px";
    }
  });
  document.addEventListener("mouseout", (e) => {
    if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest(".cw-ny-tag")) {
      nyTooltip.style.display = "none";
    }
  });
  // --------------------------------

  function placePanelOnScreen() {
    const w = panel.offsetWidth || 462;
    const h = 80;
    let left = parseFloat(panel.style.left);
    let top = parseFloat(panel.style.top);
    if (Number.isNaN(left)) left = 50;
    if (Number.isNaN(top)) top = 100;
    left = Math.min(Math.max(8, left), Math.max(8, window.innerWidth - Math.min(w, 120)));
    top = Math.min(Math.max(8, top), Math.max(8, window.innerHeight - h));
    panel.style.left = left + "px";
    panel.style.top = top + "px";
  }

  try {
    const pos = JSON.parse(localStorage.getItem(POS_KEY) || "null");
    if (pos && typeof pos.left === "number" && typeof pos.top === "number") {
      panel.style.left = pos.left + "px";
      panel.style.top = pos.top + "px";
    }
  } catch (e) {}
  placePanelOnScreen();

  // --- ЛОГИКА СКРЫТИЯ/ПОКАЗА ПАНЕЛИ ---
  function togglePanel(show) {
    if (show === undefined) show = !ui.isOpen;
    ui.isOpen = !!show;
    saveUi();
    if (ui.isOpen) {
      panel.classList.remove("ny-hidden");
    } else {
      panel.classList.add("ny-hidden");
    }
  }

  trigger.addEventListener("click", () => togglePanel());
  panel.querySelector("#toggleBtn").onclick = () => togglePanel(false);

  if (!ui.isOpen) panel.classList.add("ny-hidden");
  // -----------------------------------

  panel.querySelector("#resetBtn").onclick = () => {
    if (confirm("Сбросить лог нырков (счётчики и привязанные ID)?")) resetState();
  };
  panel.querySelector("#idsBtn").onclick = () => {
    const box = panel.querySelector("#idLog");
    box.style.display = box.style.display === "block" ? "none" : "block";
    renderIdLog();
  };

  let drag = false, ox = 0, oy = 0;
  panel.querySelector("#panelHeader").addEventListener("mousedown", (e) => {
    if (e.target.tagName === "BUTTON") return;
    drag = true;
    ox = e.clientX - panel.offsetLeft;
    oy = e.clientY - panel.offsetTop;
  });
  document.addEventListener("mousemove", (e) => {
    if (!drag) return;
    panel.style.left = (e.clientX - ox) + "px";
    panel.style.top = (e.clientY - oy) + "px";
  });
  document.addEventListener("mouseup", () => {
    if (!drag) return;
    drag = false;
    placePanelOnScreen();
    localStorage.setItem(POS_KEY, JSON.stringify({ left: panel.offsetLeft, top: panel.offsetTop }));
  });

  function zoneMeta(id) { return zones.find((z) => z.id === id) || null; }

  function resourcesByZone() {
    const groups = [];
    const seen = {};
    for (const z of zones) { seen[z.id] = { id: z.id, name: z.name, items: [] }; groups.push(seen[z.id]); }
    const other = { id: "_other", name: "Прочее", items: [] };
    for (const r of resources) {
      const id = r.zone || "_other";
      if (seen[id]) seen[id].items.push(r); else other.items.push(r);
    }
    if (other.items.length) groups.push(other);
    return groups.filter((g) => g.items.length);
  }

  function groupsOfParts(parts) {
    const out = [];
    const map = {};
    (parts || []).forEach((part, i) => {
      const g = String(part.group || "").trim();
      if (!map[g]) { map[g] = { name: g, parts: [] }; out.push(map[g]); }
      map[g].parts.push({ part, i });
    });
    return out;
  }

  function loadTableHeight() {
    try {
      const h = parseFloat(localStorage.getItem(HEIGHT_KEY));
      if (h && h > 80) return h;
    } catch (e) {}
    return 352;
  }
  function applyTableHeight(h) {
    const wrap = panel.querySelector("#nyTableWrap");
    if (!wrap) return;
    h = Math.max(150, Math.min(Math.round(window.innerHeight * 0.75), Number(h) || 320));
    wrap.style.height = h + "px";
  }
  function bindTableResize() {
    if (panel.dataset.nyResize === "1") return;
    panel.dataset.nyResize = "1";
    let drag = false, y0 = 0, h0 = 0;
    panel.addEventListener("mousedown", (e) => {
      if (!e.target.closest || !e.target.closest("#nyResize")) return;
      e.preventDefault(); e.stopPropagation();
      const wrap = panel.querySelector("#nyTableWrap");
      if (!wrap) return;
      drag = true; y0 = e.clientY; h0 = wrap.offsetHeight;
    });
    document.addEventListener("mousemove", (e) => { if (drag) applyTableHeight(h0 + (e.clientY - y0)); });
    document.addEventListener("mouseup", () => {
      if (!drag) return;
      drag = false;
      const wrap = panel.querySelector("#nyTableWrap");
      if (wrap) localStorage.setItem(HEIGHT_KEY, String(wrap.offsetHeight));
    });
  }

  function setFolderOpen(table, key, open) {
    const folder = table.querySelector('tr.ny-folder[data-key="' + cssEscape(key) + '"]');
    if (folder) {
      folder.setAttribute("data-open", open ? "1" : "0");
      const chev = folder.querySelector(".ny-chev");
      if (chev) chev.textContent = open ? "▾" : "▸";
      const pic = folder.querySelector(".ny-fold-pic");
      if (pic) pic.title = open ? "Свернуть" : "Развернуть";
    }
    ui.folders[key] = !!open;
    saveUi();
    const zoneOpen = (row) => {
      const z = row && row.getAttribute("data-zone");
      const zr = z && table.querySelector('tr.ny-zone[data-zone="' + cssEscape(z) + '"]');
      return !zr || zr.getAttribute("data-open") !== "0";
    };
    table.querySelectorAll('tr.ny-group[data-parent="' + cssEscape(key) + '"]').forEach((gr) => {
      gr.style.display = open && zoneOpen(gr) ? "" : "none";
    });
    table.querySelectorAll('tr.ny-child[data-parent="' + cssEscape(key) + '"]').forEach((ch) => {
      if (!open || !zoneOpen(ch)) { ch.style.display = "none"; return; }
      const gid = ch.getAttribute("data-group") || "";
      if (!gid) { ch.style.display = ""; return; }
      const gr = table.querySelector('tr.ny-group[data-parent="' + cssEscape(key) + '"][data-group="' + cssEscape(gid) + '"]');
      ch.style.display = !gr || gr.getAttribute("data-open") === "1" ? "" : "none";
    });
  }

  function setZoneOpen(table, zid, open) {
    const zr = table.querySelector('tr.ny-zone[data-zone="' + cssEscape(zid) + '"]');
    if (zr) {
      zr.setAttribute("data-open", open ? "1" : "0");
      const mark = zr.querySelector(".ny-zone-mark");
      if (mark) mark.textContent = open ? "▾" : "▸";
    }
    ui.zones[zid] = !!open;
    saveUi();
    table.querySelectorAll('tr[data-zone="' + cssEscape(zid) + '"]').forEach((row) => {
      if (row.classList.contains("ny-zone")) return;
      if (!open) { row.style.display = "none"; return; }
      if (row.classList.contains("ny-child") || row.classList.contains("ny-group")) {
        const parent = row.getAttribute("data-parent") || "";
        const folder = table.querySelector('tr.ny-folder[data-key="' + cssEscape(parent) + '"]');
        if (folder && folder.getAttribute("data-open") !== "1") { row.style.display = "none"; return; }
        if (row.classList.contains("ny-child")) {
          const gid = row.getAttribute("data-group") || "";
          if (gid) {
            const gr = table.querySelector('tr.ny-group[data-parent="' + cssEscape(parent) + '"][data-group="' + cssEscape(gid) + '"]');
            row.style.display = !gr || gr.getAttribute("data-open") === "1" ? "" : "none";
            return;
          }
        }
      }
      row.style.display = "";
    });
  }

  function renderResourceRows() {
    const table = panel.querySelector("#resourceTable");
    if (!table) return;
    const body = [];
    const grouped = resourcesByZone();
    for (const g of grouped) {
      const zid = escAttr(g.id);
      body.push(`
        <tr class="ny-zone" data-zone="${zid}" data-open="1">
          <td>
            <span class="ny-zone-mark">▾</span>
            <span class="ny-zone-ico">≋</span>${escAttr(g.name)}
          </td>
          <td class="found">0</td><td class="delivered">0</td><td class="score">0</td>
        </tr>`);
      for (const r of g.items) {
        const k = escAttr(r.key);
        if (r.isFolder) {
          body.push(`
        <tr class="ny-folder" data-key="${k}" data-zone="${zid}" data-open="0">
          <td>
            <span class="ny-fold-pic" title="Развернуть">
              <img src="${escAttr(r.img)}" alt="${escAttr(r.label)}">
              <i class="ny-chev">▸</i>
            </span>
            <br>${escAttr(r.label)}
          </td>
          <td class="found">0</td><td class="delivered">0</td><td class="score">0</td>
        </tr>`);
          const bunches = groupsOfParts(r.parts || []);
          const multi = bunches.length > 1 || (bunches.length === 1 && bunches[0].name);
          bunches.forEach((bunch) => {
            const gid = escAttr(bunch.name || "");
            if (multi && bunch.name) {
              body.push(`
        <tr class="ny-group" data-parent="${k}" data-group="${gid}" data-zone="${zid}" data-open="0" style="display:none">
          <td colspan="4"><span class="ny-zone-mark">▸</span>${escAttr(bunch.name)}</td>
        </tr>`);
            }
            bunch.parts.forEach(({ part, i }) => {
              const sk = escAttr(subKeyOf(part, i));
              const lab = prettyLabel(part.label || part.name);
              body.push(`
        <tr class="ny-child" data-parent="${k}" data-sub="${sk}" data-group="${gid}" data-zone="${zid}" style="display:none">
          <td class="ny-child-cell">
            <img src="${escAttr(part.img)}" alt="${escAttr(lab)}">
            <span class="ny-child-name">${escAttr(lab)}</span>
          </td>
          <td class="found">0</td><td class="delivered">0</td><td class="score">0</td>
        </tr>`);
            });
          });
        } else {
          body.push(`
        <tr class="ny-solo" data-key="${k}" data-zone="${zid}">
          <td class="ny-pic"><img src="${escAttr(r.img)}" alt="${escAttr(r.label)}"><br>${escAttr(r.label)}</td>
          <td class="found">0</td><td class="delivered">0</td><td class="score">0</td>
        </tr>`);
        }
      }
    }
    body.push(`
        <tr id="totalRow">
          <td colspan="3" style="text-align:right; font-weight:bold;">ИТОГО:</td>
          <td id="totalScore" style="font-weight:bold;">0</td>
        </tr>`);
    table.innerHTML = `
      <thead><tr><th>Ресурс</th><th>Обнаружено</th><th>Сдано</th><th>Баллы</th></tr></thead>
      <tbody>${body.join("")}</tbody>`;

    table.querySelectorAll("tr.ny-zone").forEach((el) => {
      el.addEventListener("click", () => {
        const next = el.getAttribute("data-open") !== "1";
        setZoneOpen(table, el.getAttribute("data-zone") || "", next);
      });
    });
    table.querySelectorAll(".ny-fold-pic").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        const tr = el.closest("tr");
        if (!tr) return;
        const next = tr.getAttribute("data-open") !== "1";
        setFolderOpen(table, tr.getAttribute("data-key") || "", next);
      });
    });
    table.querySelectorAll("tr.ny-group").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        const next = el.getAttribute("data-open") !== "1";
        el.setAttribute("data-open", next ? "1" : "0");
        const mark = el.querySelector(".ny-zone-mark");
        if (mark) mark.textContent = next ? "▾" : "▸";
        const parent = el.getAttribute("data-parent") || "";
        const gid = el.getAttribute("data-group") || "";
        ui.groups[groupKey(parent, gid)] = next;
        saveUi();
        const folder = table.querySelector('tr.ny-folder[data-key="' + cssEscape(parent) + '"]');
        const zoneOk = (() => {
          const z = el.getAttribute("data-zone") || "";
          const zr = table.querySelector('tr.ny-zone[data-zone="' + cssEscape(z) + '"]');
          return !zr || zr.getAttribute("data-open") !== "0";
        })();
        const show = next && zoneOk && folder && folder.getAttribute("data-open") === "1";
        table.querySelectorAll('tr.ny-child[data-parent="' + cssEscape(parent) + '"][data-group="' + cssEscape(gid) + '"]').forEach((ch) => {
          ch.style.display = show ? "" : "none";
        });
      });
    });
    table.querySelectorAll("tr.ny-group").forEach((gr) => {
      const k = groupKey(gr.getAttribute("data-parent"), gr.getAttribute("data-group"));
      const open = ui.groups[k] === true;
      gr.setAttribute("data-open", open ? "1" : "0");
      const mark = gr.querySelector(".ny-zone-mark");
      if (mark) mark.textContent = open ? "▾" : "▸";
    });
    table.querySelectorAll("tr.ny-folder").forEach((fr) => {
      const key = fr.getAttribute("data-key") || "";
      setFolderOpen(table, key, ui.folders[key] === true);
    });
    table.querySelectorAll("tr.ny-zone").forEach((zr) => {
      const zid = zr.getAttribute("data-zone") || "";
      setZoneOpen(table, zid, ui.zones[zid] !== false);
    });
    applyTableHeight(loadTableHeight());
    bindTableResize();
    updateTable();
  }

  function renderIdLog() {
    const box = panel.querySelector("#idLog");
    if (!box || box.style.display !== "block") return;
    const total = state.order.length;
    const ordered = state.order.slice().reverse().slice(0, ID_LOG_MAX);
    const rows = ordered.map((id) => {
      const rec = state.items[id];
      if (!rec) return "";
      const res = resources.find((r) => r.key === rec.key);
      const st = rec.status === "delivered" ? "сдано" : "найдено";
      return `<div class="st-${escAttr(rec.status)}">${escAttr(res ? res.label : rec.key)} · <b>${escAttr(id)}</b> · ${st}</div>`;
    }).filter(Boolean);
    if (total > ID_LOG_MAX) rows.push(`<div class="muted">… всего ${total}</div>`);
    box.innerHTML = rows.length ? rows.join("") : "<div>Пока нет привязанных ID</div>";
  }

  function markGot(row, delivered) {
    if (!row) return;
    if (delivered > 0) row.classList.add("ny-got"); else row.classList.remove("ny-got");
  }

  function updateTable() {
    let totalScore = 0;
    const zoneSum = {};
    const byKey = {};
    for (const id of state.order) {
      const rec = state.items[id];
      if (!rec) continue;
      if (!byKey[rec.key]) byKey[rec.key] = [];
      byKey[rec.key].push(rec);
    }
    for (const r of resources) {
      const recs = byKey[r.key] || [];
      const found = recs.length;
      let delivered = 0;
      for (const x of recs) if (x.status === "delivered") delivered++;
      const pts = scores[r.key] || r.score || 0;
      const total = delivered * pts;
      totalScore += total;
      const zid = r.zone || "_other";
      if (!zoneSum[zid]) zoneSum[zid] = { found: 0, delivered: 0, score: 0 };
      zoneSum[zid].found += found;
      zoneSum[zid].delivered += delivered;
      zoneSum[zid].score += total;
      const row = panel.querySelector('#resourceTable tr[data-key="' + cssEscape(r.key) + '"]');
      if (row) {
        row.querySelector(".found").textContent = found;
        row.querySelector(".delivered").textContent = delivered;
        row.querySelector(".score").textContent = total;
        markGot(row, delivered);
      }
      if (r.isFolder) {
        const used = {};
        for (const rec of recs) {
          const sk = recSubKey(rec, r);
          if (!used[sk]) used[sk] = { found: 0, delivered: 0 };
          used[sk].found += 1;
          if (rec.status === "delivered") used[sk].delivered += 1;
        }
        (r.parts || []).forEach((part, i) => {
          const sk = subKeyOf(part, i);
          const st = used[sk] || { found: 0, delivered: 0 };
          const ch = panel.querySelector('#resourceTable tr.ny-child[data-parent="' + cssEscape(r.key) + '"][data-sub="' + cssEscape(sk) + '"]');
          if (!ch) return;
          ch.querySelector(".found").textContent = st.found;
          ch.querySelector(".delivered").textContent = st.delivered;
          ch.querySelector(".score").textContent = st.delivered * pts;
          markGot(ch, st.delivered);
        });
      }
    }
    for (const [zid, sum] of Object.entries(zoneSum)) {
      const zr = panel.querySelector('#resourceTable tr.ny-zone[data-zone="' + cssEscape(zid) + '"]');
      if (!zr) continue;
      zr.querySelector(".found").textContent = sum.found;
      zr.querySelector(".delivered").textContent = sum.delivered;
      zr.querySelector(".score").textContent = sum.score;
      markGot(zr, sum.delivered);
    }
    const scoreEl = panel.querySelector("#totalScore");
    if (scoreEl) scoreEl.textContent = totalScore;
    renderIdLog();
  }

  renderResourceRows();

  let authorOk = false;
  let failN = 0;
  let draft = { zones: clone(BUILTIN_ZONES), categories: clone(BUILTIN_CATEGORIES), allowedTribe: BUILTIN_TRIBE };
  let focusCat = 0;

  async function acceptKey(raw) {
    const h = await digest(String(raw) + _S);
    const extra = localStorage.getItem(_PK);
    return extra ? h === extra : h === _K;
  }

  function loadDraft() {
    try {
      const raw = JSON.parse(localStorage.getItem(_CK) || "null");
      if (raw && Array.isArray(raw.categories) && Array.isArray(raw.zones)) {
        if (raw.allowedTribe == null) raw.allowedTribe = BUILTIN_TRIBE;
        return raw;
      }
    } catch (e) {}
    return { zones: clone(BUILTIN_ZONES), categories: clone(BUILTIN_CATEGORIES), allowedTribe: BUILTIN_TRIBE };
  }
  function saveDraft() { localStorage.setItem(_CK, JSON.stringify(draft)); }

  function applyDraftLive() {
    compileConfig(draft.categories, draft.zones);
    const tset = String(draft.allowedTribe || "").trim();
    allowedTribe = looksLocked(tset) ? tset : BUILTIN_TRIBE;
    renderResourceRows();
    if (authorOk) reviveScript(); else enforceTribe();
    const hist = document.querySelector("#ist");
    if (hist && scriptAlive) paintHistory(hist);
    if (!looksLocked(tset) && tset) {
      stMsg("племя применится после экспорта в новую версию скрипта");
    }
  }

  const gate = document.createElement("div");
  gate.id = "nyGate";
  gate.hidden = true;
  gate.style.display = "none";
  gate.innerHTML = `
    <div class="box">
      <div>Ключ доступа</div>
      <input id="nyKey" type="password" autocomplete="off">
      <div style="display:flex;gap:6px;justify-content:flex-end">
        <button type="button" id="nyKeyNo">Закрыть</button>
        <button type="button" id="nyKeyOk">ОК</button>
      </div>
      <div id="nyKeyErr" class="muted" style="margin-top:6px;color:#f88"></div>
    </div>`;
  mount(gate);

  function openGate() {
    if (authorOk) { openStudio(); return; }
    if (failN >= 6) return;
    gate.hidden = false;
    gate.style.display = "flex";
    const inp = gate.querySelector("#nyKey");
    gate.querySelector("#nyKeyErr").textContent = "";
    inp.value = "";
    setTimeout(() => inp.focus(), 30);
  }

  gate.querySelector("#nyKeyNo").onclick = () => { gate.style.display = "none"; gate.hidden = true; };
  gate.addEventListener("click", (e) => { if (e.target === gate) gate.style.display = "none"; });
  gate.querySelector("#nyKeyOk").onclick = submitKey;
  gate.querySelector("#nyKey").addEventListener("keydown", (e) => { if (e.key === "Enter") submitKey(); });

  async function submitKey() {
    const inp = gate.querySelector("#nyKey");
    const err = gate.querySelector("#nyKeyErr");
    if (failN >= 6) { err.textContent = "закрыто"; return; }
    const ok = await acceptKey(inp.value);
    inp.value = "";
    if (!ok) { failN++; err.textContent = "нет"; return; }
    failN = 0;
    authorOk = true;
    gate.style.display = "none";
    gate.hidden = true;
    draft = loadDraft();
    reviveScript();
    openStudio();
  }

  panel.querySelector("#nyTitle").addEventListener("click", (e) => {
    if (e.shiftKey && e.altKey) { e.preventDefault(); e.stopPropagation(); openGate(); }
  });

  const studio = document.createElement("div");
  studio.id = "nyStudio";
  studio.hidden = true;
  studio.style.display = "none";
  studio.innerHTML = `
    <div class="st-head">
      <b>Схема добычи</b>
      <button type="button" id="nyStClose">×</button>
    </div>
    <div class="st-body">
      <h3>Кто может пользоваться</h3>
      <div class="row">
        <span class="muted">Племя, как на странице кошки</span>
        <input id="nyTribe" type="text" style="flex:1" placeholder="как на странице кошки" autocomplete="off">
      </div>
      <div class="muted">В код попадёт ключ, не название. Пустое поле — оставить как было.</div>
      <div class="muted" id="nyTribeRead" style="margin-bottom:8px"></div>
      <h3>Куда относить</h3>
      <div id="nyZones"></div>
      <div class="row">
        <input id="nyZoneName" type="text" placeholder="Название локации как в игре" style="flex:1">
        <button type="button" id="nyZoneAdd">+ локация</button>
      </div>
      <h3>Что ловится и к чему относится</h3>
      <div class="row">
        <button type="button" id="nyCatAdd">+ категория</button>
        <span class="muted">Категория = строка в таблице лога. Внутри неё — все названия из истории и неуникальные ID.</span>
      </div>
      <div id="nyCats"></div>
      <h3>Сейчас во рту — клик добавит type ID в выбранную категорию</h3>
      <div id="nyMouth" class="chips"></div>
    </div>
    <div class="st-foot">
      <button type="button" class="ok" id="nySave">Сохранить и применить</button>
      <button type="button" id="nyExport">Экспорт в скрипт</button>
      <button type="button" id="nyRevert">Вернуть встроенное</button>
      <button type="button" id="nyPw">Сменить ключ</button>
      <button type="button" id="nyPwReset">× ключ</button>
      <span id="nyStMsg" class="muted"></span>
    </div>`;
  mount(studio);

  let stDrag = false, stx = 0, sty = 0;
  studio.querySelector(".st-head").addEventListener("mousedown", (e) => {
    if (e.target.tagName === "BUTTON") return;
    stDrag = true;
    stx = e.clientX - studio.offsetLeft;
    sty = e.clientY - studio.offsetTop;
  });
  document.addEventListener("mousemove", (e) => {
    if (!stDrag) return;
    studio.style.left = (e.clientX - stx) + "px";
    studio.style.top = (e.clientY - sty) + "px";
  });
  document.addEventListener("mouseup", () => { stDrag = false; });
  studio.querySelector("#nyStClose").onclick = () => { studio.style.display = "none"; };

  function stMsg(t) { const el = studio.querySelector("#nyStMsg"); if (el) el.textContent = t || ""; }

  function openStudio() {
    if (!authorOk) return;
    studio.hidden = false;
    studio.style.display = "flex";
    drawStudio();
    refreshMouthChips();
  }

  function drawStudio() {
    const tribeInp = studio.querySelector("#nyTribe");
    if (tribeInp) {
      const raw = String(draft.allowedTribe || "").trim();
      tribeInp.value = looksLocked(raw) ? "" : raw;
    }
    const readEl = studio.querySelector("#nyTribeRead");
    if (readEl) {
      readEl.textContent = lastReadTribe
        ? ("С главной страницы сейчас: " + lastReadTribe)
        : "С главной страницы племя не прочиталось.";
    }
    const zbox = studio.querySelector("#nyZones");
    zbox.innerHTML = draft.zones.map((z, i) => `
      <span class="zone-pill">
        <input type="text" data-zi="${i}" value="${escAttr(z.name)}" style="width:170px">
        <button type="button" data-zd="${i}" class="danger">×</button>
      </span>`).join("");
    zbox.querySelectorAll("input[data-zi]").forEach((inp) => {
      inp.onchange = () => {
        const i = +inp.dataset.zi;
        draft.zones[i].name = inp.value.trim();
        if (!draft.zones[i].id) draft.zones[i].id = "z" + Date.now();
        drawCats();
      };
    });
    zbox.querySelectorAll("button[data-zd]").forEach((btn) => {
      btn.onclick = () => {
        const i = +btn.dataset.zd;
        const id = draft.zones[i].id;
        if (draft.categories.some((c) => c.zone === id) && !confirm("Локация используется в категориях. Удалить?")) return;
        draft.zones.splice(i, 1);
        drawStudio();
      };
    });
    drawCats();
  }

  function zoneOptions(selected) {
    return draft.zones.map((z) =>
      `<option value="${escAttr(z.id)}" ${z.id === selected ? "selected" : ""}>${escAttr(z.name)}</option>`
    ).join("");
  }

  function folderOn(c) { return c.folder === true || (c.folder !== false && (c.items || []).length > 1); }

  function drawCats() {
    const box = studio.querySelector("#nyCats");
    box.innerHTML = draft.categories.map((c, ci) => {
      const asFolder = folderOn(c);
      const foldImg = catCustomImg(c);
      const firstTid = ((c.items || []).map((i) => i.typeId).find(Boolean)) || "0";
      const foldPrev = foldImg || thingImg(firstTid);
      return `
      <div class="card ${ci === focusCat ? "active" : ""}" data-ci="${ci}">
        <div class="card-top">
          <label class="muted">в таблице</label>
          <input type="text" data-f="label" value="${escAttr(c.label)}" placeholder="Крепкая ветка" style="width:160px">
          <label class="muted">сдавать в</label>
          <select data-f="zone">${zoneOptions(c.zone)}</select>
          <label class="muted">баллы</label>
          <input type="number" data-f="score" value="${Number(c.score) || 0}" style="width:64px">
          <span class="muted">ключ: ${escAttr(c.key || "")}</span>
          <label class="muted"><input type="checkbox" data-f="folder"${asFolder ? " checked" : ""}> папка</label>
          <label class="muted"><input type="checkbox" data-f="drop"${c.drop ? " checked" : ""}> камень</label>
          <button type="button" class="danger" data-cdel="${ci}">удалить</button>
        </div>
        <div class="row ny-folder-img" style="margin:6px 0;${asFolder ? "" : "display:none"}">
          <span class="muted">картинка папки</span>
          <input type="text" data-f="img" value="${escAttr(foldImg)}" placeholder="https://… ссылка на свою картинку" style="flex:1">
          <img class="ny-folder-preview" src="${escAttr(foldPrev)}" alt="">
        </div>
        <div class="ny-subfolds" style="margin:6px 0;${asFolder ? "" : "display:none"}">
          <div class="muted" style="margin-bottom:4px">Подпапки внутри (раскрывающийся блок в логе)</div>
          ${(c.groups || []).map((g, gi) => `
          <div class="row">
            <input type="text" data-gi="${gi}" value="${escAttr(g)}" placeholder="Крылатое племя" style="flex:1">
            <button type="button" class="danger" data-gdel="${gi}">×</button>
          </div>`).join("")}
          <div class="row"><button type="button" data-gadd="${ci}">+ подпапка</button></div>
        </div>
        <div class="muted" style="margin:4px 0 2px">«Как в истории» — Обнаружил …. «В таблице» — как показать в логе. «Камень» — сдаётся, если просто положили в нужной локации.</div>
        <table class="items">
          <tr><td>Как в истории</td><td>В таблице</td><td>Подпапка</td><td>Неуникальный ID</td><td></td><td></td></tr>
          ${(c.items || []).map((it, ii) => `
            <tr>
              <td><input type="text" data-in="${ii}" data-f="name" value="${escAttr(it.name)}" placeholder="крепкую ветку"></td>
              <td><input type="text" data-in="${ii}" data-f="label" value="${escAttr(it.label || "")}" placeholder="Крепкая ветка"></td>
              <td style="width:140px">
                <select data-in="${ii}" data-f="group">
                  <option value="">—</option>
                  ${(c.groups || []).map((g) => `<option value="${escAttr(g)}"${String(it.group || "") === String(g) ? " selected" : ""}>${escAttr(g)}</option>`).join("")}
                </select>
              </td>
              <td style="width:110px"><input type="text" data-in="${ii}" data-f="typeId" value="${escAttr(it.typeId)}" placeholder="75"></td>
              <td style="width:36px"><img src="${thingImg(it.typeId || "0")}" alt=""></td>
              <td style="width:28px"><button type="button" class="danger" data-idel="${ii}">×</button></td>
            </tr>`).join("")}
        </table>
        <div class="row" style="margin-top:6px">
          <button type="button" data-iadd="${ci}">+ предмет</button>
        </div>
      </div>`;
    }).join("");

    box.querySelectorAll(".card").forEach((card) => {
      const ci = +card.dataset.ci;
      card.addEventListener("mousedown", () => { focusCat = ci; });
      card.querySelectorAll("[data-f]").forEach((el) => {
        const apply = () => {
          const f = el.dataset.f;
          if (el.dataset.in != null) {
            const ii = +el.dataset.in;
            draft.categories[ci].items[ii][f] = el.value;
            if (f === "typeId") {
              const img = el.closest("tr").querySelector("img");
              if (img) img.src = thingImg(el.value.trim());
            }
            if (f === "name" && !draft.categories[ci].key) draft.categories[ci].key = el.value.trim();
          } else if (f === "folder") {
            draft.categories[ci].folder = !!el.checked;
            const row = card.querySelector(".ny-folder-img");
            if (row) row.style.display = el.checked ? "flex" : "none";
            const sf = card.querySelector(".ny-subfolds");
            if (sf) sf.style.display = el.checked ? "" : "none";
          } else if (f === "drop") {
            draft.categories[ci].drop = !!el.checked;
          } else if (f === "score") {
            draft.categories[ci][f] = Number(el.value) || 0;
          } else {
            draft.categories[ci][f] = el.value;
            if (f === "img") {
              const prev = card.querySelector(".ny-folder-preview");
              const tid = ((draft.categories[ci].items || []).map((i) => i.typeId).find(Boolean)) || "0";
              if (prev) prev.src = String(el.value || "").trim() || thingImg(tid);
            }
          }
        };
        el.addEventListener("change", apply);
        el.addEventListener("input", apply);
      });
      const delC = card.querySelector("[data-cdel]");
      if (delC) {
        delC.onclick = () => {
          draft.categories.splice(ci, 1);
          if (focusCat >= draft.categories.length) focusCat = Math.max(0, draft.categories.length - 1);
          drawCats();
        };
      }
      card.querySelectorAll("[data-idel]").forEach((btn) => {
        btn.onclick = () => { draft.categories[ci].items.splice(+btn.dataset.idel, 1); drawCats(); };
      });
    });
    box.querySelectorAll("input[data-gi]").forEach((inp) => {
      const card = inp.closest(".card");
      const ci = card ? +card.dataset.ci : -1;
      inp.onchange = () => {
        if (ci < 0 || !draft.categories[ci]) return;
        if (!draft.categories[ci].groups) draft.categories[ci].groups = [];
        const gi = +inp.dataset.gi;
        const old = draft.categories[ci].groups[gi];
        const neu = inp.value.trim();
        draft.categories[ci].groups[gi] = neu;
        (draft.categories[ci].items || []).forEach((it) => { if (it.group === old) it.group = neu; });
        drawCats();
      };
    });
    box.querySelectorAll("[data-gdel]").forEach((btn) => {
      btn.onclick = () => {
        const card = btn.closest(".card");
        const ci = card ? +card.dataset.ci : -1;
        if (ci < 0 || !draft.categories[ci]) return;
        const gi = +btn.dataset.gdel;
        const old = (draft.categories[ci].groups || [])[gi];
        draft.categories[ci].groups.splice(gi, 1);
        (draft.categories[ci].items || []).forEach((it) => { if (it.group === old) it.group = ""; });
        drawCats();
      };
    });
    box.querySelectorAll("[data-gadd]").forEach((btn) => {
      btn.onclick = () => {
        const ci = +btn.dataset.gadd;
        if (!draft.categories[ci]) return;
        if (!draft.categories[ci].groups) draft.categories[ci].groups = [];
        draft.categories[ci].groups.push("");
        draft.categories[ci].folder = true;
        focusCat = ci;
        drawCats();
      };
    });
    box.querySelectorAll("[data-iadd]").forEach((btn) => {
      btn.onclick = () => {
        const ci = +btn.dataset.iadd;
        if (!draft.categories[ci].items) draft.categories[ci].items = [];
        draft.categories[ci].items.push({ name: "", typeId: "", label: "", group: "" });
        if (draft.categories[ci].items.length > 1 && draft.categories[ci].folder == null) draft.categories[ci].folder = true;
        focusCat = ci;
        drawCats();
      };
    });
  }

  studio.querySelector("#nyZoneAdd").onclick = () => {
    const name = studio.querySelector("#nyZoneName").value.trim();
    if (!name) return;
    draft.zones.push({ id: "z" + Date.now(), name });
    studio.querySelector("#nyZoneName").value = "";
    drawStudio();
  };

  studio.querySelector("#nyCatAdd").onclick = () => {
    const zone = (draft.zones[0] && draft.zones[0].id) || "";
    draft.categories.push({
      key: "", label: "Новая категория", zone, score: 0, folder: false, drop: false, groups: [],
      items: [{ name: "", typeId: "", label: "", group: "" }]
    });
    focusCat = draft.categories.length - 1;
    drawCats();
  };

  function refreshMouthChips() {
    const box = document.querySelector("#nyMouth");
    if (!box || !authorOk || studio.style.display === "none") return;
    const items = getMouthItems();
    if (!items.length) { box.innerHTML = '<span class="muted">пусто</span>'; return; }
    box.innerHTML = items.map((it) => `
      <span class="chip" data-tid="${escAttr(it.typeId || "")}" title="уникальный ${escAttr(it.id)}">
        <img src="${thingImg(it.typeId || "0")}" alt="">
        <b>${escAttr(it.typeId || "?")}</b>
      </span>`).join("");
    box.querySelectorAll(".chip").forEach((ch) => {
      ch.onclick = () => {
        if (!draft.categories[focusCat]) return;
        const cat = draft.categories[focusCat];
        if (!cat.items) cat.items = [];
        const tid = ch.dataset.tid;
        if (tid && cat.items.some((x) => String(x.typeId) === tid)) {
          stMsg("этот type ID уже есть в категории");
          return;
        }
        const lastFind = pendingFinds[pendingFinds.length - 1];
        let guess = "";
        const hist = document.querySelector("#ist");
        if (hist) {
          const ev = splitEvents(hist.textContent || "").reverse();
          for (const line of ev) {
            const m = line.match(FIND_RE);
            if (m) { guess = String(m[1] || "").trim(); break; }
          }
        }
        if (lastFind && lastFind.key) guess = lastFind.key;
        cat.items.push({ name: guess, typeId: tid });
        drawCats();
        stMsg("добавлен type ID " + tid);
      };
    });
  }

  studio.querySelector("#nySave").onclick = () => {
    const tribeInp = studio.querySelector("#nyTribe");
    if (tribeInp) {
      const v = tribeInp.value.trim();
      if (v) draft.allowedTribe = v;
    }
    for (const c of draft.categories) {
      if (!c.key) {
        const n = (c.items || []).map((i) => i.name).find(Boolean);
        c.key = n || c.label;
      }
      c.groups = (c.groups || []).map((g) => String(g || "").trim()).filter(Boolean);
      c.items = (c.items || []).filter((i) => String(i.name || "").trim() || String(i.typeId || "").trim());
    }
    saveDraft();
    applyDraftLive();
    stMsg("применено в этой сессии");
  };

  studio.querySelector("#nyRevert").onclick = () => {
    if (!confirm("Вернуть встроенную схему?")) return;
    draft = { zones: clone(BUILTIN_ZONES), categories: clone(BUILTIN_CATEGORIES), allowedTribe: BUILTIN_TRIBE };
    saveDraft();
    applyDraftLive();
    drawStudio();
    stMsg("встроенная схема");
  };

  async function urlToData(url) {
    url = String(url || "").trim();
    if (!url) return "";
    if (/^data:/i.test(url)) return url;
    try {
      const res = await fetch(url, { mode: "cors", credentials: "omit", cache: "force-cache" });
      if (!res.ok) return url;
      const blob = await res.blob();
      if (!blob || !blob.size) return url;
      if (blob.size > 1.5 * 1024 * 1024) {
        console.warn("[ny] большая картинка при экспорте:", url, (blob.size / 1024 / 1024).toFixed(2) + " МБ");
      }
      return await new Promise((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result || url));
        fr.onerror = () => resolve(url);
        fr.readAsDataURL(blob);
      });
    } catch (e) { return url; }
  }

  async function bakeExportCategories(cats) {
    const out = clone(cats);
    await Promise.all(out.map(async (c) => {
      const src = catCustomImg(c);
      if (src) { c.img = await urlToData(src); delete c.folderImg; }
      if (Array.isArray(c.items)) {
        await Promise.all(c.items.map(async (it) => {
          if (it.img) it.img = await urlToData(it.img);
        }));
      }
    }));
    return out;
  }

  studio.querySelector("#nyExport").onclick = async () => {
    stMsg("сохраняю картинки…");
    let cats = draft.categories;
    try { cats = await bakeExportCategories(draft.categories); }
    catch (e) { cats = draft.categories; }
    let tribeOut = BUILTIN_TRIBE;
    try {
      const raw = String(draft.allowedTribe || "").trim();
      if (looksLocked(raw)) tribeOut = raw.toLowerCase();
      else if (raw) tribeOut = await tribeToken(raw);
      else if (looksLocked(BUILTIN_TRIBE)) tribeOut = String(BUILTIN_TRIBE).toLowerCase();
    } catch (e) { tribeOut = BUILTIN_TRIBE; }
    const text = [
      "const BUILTIN_TRIBE = " + JSON.stringify(tribeOut) + ";",
      "const BUILTIN_ZONES = " + JSON.stringify(draft.zones, null, 2) + ";",
      "const BUILTIN_CATEGORIES = " + JSON.stringify(cats, null, 2) + ";"
    ].join("\n\n");
    const done = (msg) => { stMsg(msg); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => done("скопировано, картинки внутри")).catch(() => fallback());
    } else fallback();
    function fallback() {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done("скопировано, картинки внутри"); }
      catch (e) { done("не удалось скопировать"); }
      ta.remove();
    }
  };

  studio.querySelector("#nyPw").onclick = async () => {
    const a = prompt("Новый ключ");
    if (!a) return;
    const b = prompt("Ещё раз");
    if (a !== b) { stMsg("не совпало"); return; }
    try { localStorage.setItem(_PK, await digest(a + _S)); stMsg("ключ обновлён только в этом браузере"); }
    catch (e) { stMsg("не удалось обновить ключ"); }
  };

  studio.querySelector("#nyPwReset").onclick = () => {
    if (!confirm("Сбросить локальный ключ (вернуться ко встроенному)?")) return;
    try { localStorage.removeItem(_PK); } catch (e) {}
    stMsg("локальный ключ сброшен");
  };

  function escAttr(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function onHistoryNode(hist) {
    const text = hist.textContent || "";
    const delta = newestExtra(state.lastHist, text);

    if (delta.kind === "clear") {
      pendingFinds.length = 0;
      pendingPuts.length = 0;
      state.lastHist = text;
      saveState();
      return;
    }

    if (delta.kind === "fresh") {
      if (!state.lastHist) {
        consumeHistory(delta.extra, "replay");
        adoptUnboundMouth(text);
        pendingFinds.length = 0;
        pendingNews.length = 0;
      } else {
        const unseen = extraEvents(state.lastHist, text);
        if (unseen.length) consumeHistory(unseen.join(" "), "live");
      }
    } else if (delta.kind === "append" && delta.extra.trim()) {
      consumeHistory(delta.extra, "live");
    }

    state.lastHist = text;
    saveState();
    paintHistory(hist);
    updateTable();
  }

  function hookHistory(hist) {
    let parseTimeout = null;
    let lastSeen = "";

    const run = () => {
      if (ignoreMutations) return;
      const text = hist.textContent || "";
      if (text === lastSeen) {
        if (!hist.querySelector(".cw-ny-found") && text && !/История очищена/i.test(text)) paintHistory(hist);
        return;
      }
      lastSeen = text;
      onHistoryNode(hist);
    };

    run();
    new MutationObserver(() => {
      if (ignoreMutations) return;
      clearTimeout(parseTimeout);
      parseTimeout = setTimeout(run, 200);
    }).observe(hist, { childList: true, subtree: true, characterData: true });
  }

  function hookMouth() {
    const root = document.querySelector("#tr_mouth") || document.querySelector("#app") || document.body;
    lastMouth = getMouthItems();
    for (const item of lastMouth) {
      const rec = state.items[item.id];
      if (rec && rec.status === "delivered") unDeliver(item.id);
    }
    adoptUnboundMouth((document.querySelector("#ist") || {}).textContent || "");
    updateTable();
    new MutationObserver(() => syncMouth()).observe(root, { childList: true, subtree: true });
    if (!document.documentElement.dataset.nySelHook) {
      document.documentElement.dataset.nySelHook = "1";
      document.addEventListener("click", (e) => {
        const itemEl = e.target.closest && e.target.closest("#itemList .itemInMouth");
        if (itemEl && itemEl.id) {
          const img = itemEl.querySelector("img");
          const src = (img && (img.getAttribute("src") || img.src)) || "";
          const tm = src.match(/things\/(\d+)/);
          noteSelected(itemEl.id, tm ? tm[1] : null);
        }
        const a = e.target.closest && e.target.closest("a");
        if (a && /поверхностно|тщательно/i.test(a.textContent || "")) {
          snapshotSelected();
          if (lastSelected.id) {
            pendingLooks.push({
              id: lastSelected.id, key: lastSelected.key, typeId: lastSelected.typeId,
              t: Date.now(), seenLook: false
            });
          }
        }
      }, true);
    }
  }

  function hookLocation() {
    rememberLocation();
    const el = document.querySelector("#location");
    const root = el || document.querySelector("#app") || document.body;
    new MutationObserver(() => rememberLocation()).observe(root, { childList: true, subtree: true, characterData: true });
  }

  function startGameHooks() {
    if (bootStarted) return;
    bootStarted = true;
    const boot = setInterval(() => {
      const hist = document.querySelector("#ist");
      if (!hist) return;
      clearInterval(boot);
      hookHistory(hist);
      hookMouth();
      hookLocation();
      updateTable();
    }, 500);
  }

  function mojibake(s) {
    try { return unescape(encodeURIComponent(s)); }
    catch (e) { return "Ð½Ñ‹Â·Ð»Ð¾Ð³"; }
  }

  function restoreRealPanel() {
    const title = panel.querySelector("#nyTitle");
    if (title) title.textContent = "Ныныны · лог нырков";
    const box = panel.querySelector("#panelContent");
    if (!box) return;
    if (!box.querySelector("#resourceTable")) {
      box.innerHTML = `
        <div id="nyTableWrap"><table id="resourceTable"></table></div>
        <div id="nyResize" title="Высота таблицы"></div>
        <div id="idLog"></div>
        <div class="hint">
          Наведите на подсвеченное действие в истории — появится уникальный ID.
          Сдача только в нужной локации у уже подписанного ID.
          Подняли обратно — снова не сдан. Камень сдаётся, если просто положили.
          Очистка истории счётчик не сбрасывает.
        </div>`;
      applyTableHeight(loadTableHeight());
    }
    renderResourceRows();
  }

  function showBrokenShell() {
    scriptAlive = false;
    if (panel && !document.body.contains(panel)) mount(panel);
    panel.style.display = "";
    const title = panel.querySelector("#nyTitle");
    if (title) title.textContent = mojibake("Ныныны") + " Â· " + mojibake("лог");
    const box = panel.querySelector("#panelContent");
    if (box) {
      box.innerHTML = `
        <table>
          <tr><th>${mojibake("Ресурс")}</th><th>??</th><th>Â�</th></tr>
          <tr><td>Ð¼Ð¾Ñ…�</td><td>?</td><td>NaN</td></tr>
          <tr><td>Ð²ÐµÑ‚ÐºÂ�</td><td>□</td><td>—</td></tr>
          <tr><td>Â«Â» Ã Ã</td><td>undefined</td><td>0</td></tr>
        </table>
        <div class="hint">${mojibake("ошибка кодировки")} / cp1251</div>`;
    }
    if (gate) { gate.style.display = "none"; gate.hidden = true; }
    if (studio) { studio.style.display = "none"; studio.hidden = true; }
    placePanelOnScreen();
  }

  function reviveScript() {
    scriptAlive = true;
    if (panel && !document.body.contains(panel)) mount(panel);
    panel.style.display = "";
    restoreRealPanel();
    placePanelOnScreen();
    startGameHooks();
  }

  function killScript() { showBrokenShell(); }

  async function enforceTribe() {
    if (authorOk) { reviveScript(); return; }
    const need = String(allowedTribe || BUILTIN_TRIBE || "").trim();
    if (!need || !looksLocked(need)) { killScript(); return; }
    const found = await readPlayerTribe();
    if (await tribesMatch(found, need)) { reviveScript(); return; }
    killScript();
  }

  document.addEventListener("click", (e) => {
    if (e.shiftKey && e.altKey && e.ctrlKey) { e.preventDefault(); e.stopPropagation(); openGate(); }
  }, true);

  enforceTribe();
})();

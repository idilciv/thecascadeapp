/* Cascade — lightweight client-side i18n.
   English lives in index.html (source of truth); this file swaps [data-i18n] nodes
   for the selected language, auto-detects from the browser, and remembers the choice.
   Translations are assembled in translations.js (window.CASCADE_I18N). */
(function () {
  var LANGS = [
    { c: "en", n: "English" },
    { c: "tr", n: "Türkçe" },
    { c: "es", n: "Español" },
    { c: "de", n: "Deutsch" },
    { c: "fr", n: "Français" },
    { c: "it", n: "Italiano" },
    { c: "pt-BR", n: "Português" },
    { c: "ru", n: "Русский" },
    { c: "ja", n: "日本語" },
    { c: "zh-Hans", n: "简体中文" },
    { c: "zh-Hant", n: "繁體中文" },
    { c: "ar", n: "العربية", rtl: 1 },
    { c: "ko", n: "한국어" },
    { c: "hi", n: "हिन्दी" },
    { c: "id", n: "Bahasa Indonesia" },
    { c: "nl", n: "Nederlands" },
    { c: "pl", n: "Polski" },
    { c: "uk", n: "Українська" },
    { c: "vi", n: "Tiếng Việt" },
    { c: "th", n: "ไทย" },
    { c: "sv", n: "Svenska" },
    { c: "fa", n: "فارسی", rtl: 1 }
  ];
  var STORE = "cascade_lang";
  var T = window.CASCADE_I18N || {};

  var nodes = document.querySelectorAll("[data-i18n]");
  var EN = {};
  nodes.forEach(function (el) {
    var k = el.getAttribute("data-i18n");
    if (!(k in EN)) EN[k] = el.innerHTML;
  });
  // On pre-rendered localized pages the DOM is already translated, so use the real
  // English source from T["en"] (added at build time) rather than the translated DOM.
  if (T["en"]) { for (var ek in T["en"]) EN[ek] = T["en"][ek]; }
  var EN_TITLE = (T["en"] && T["en"]["meta.title"]) ? T["en"]["meta.title"] : document.title;

  function supported(c) { for (var i = 0; i < LANGS.length; i++) if (LANGS[i].c === c) return true; return false; }
  function isRTL(c) { for (var i = 0; i < LANGS.length; i++) if (LANGS[i].c === c) return !!LANGS[i].rtl; return false; }

  // Map a browser locale (e.g. "de-AT", "pt-PT", "zh-TW") to one of our supported codes.
  function norm(code) {
    if (!code) return null;
    code = code.toLowerCase();
    if (code === "pt" || code.indexOf("pt") === 0) return "pt-BR";
    if (code === "zh-tw" || code === "zh-hk" || code === "zh-mo" || code === "zh-hant") return "zh-Hant";
    if (code.indexOf("zh") === 0) return "zh-Hans";
    var two = code.split("-")[0];
    if (two === "in") return "id";      // legacy Indonesian code
    if (two === "nb" || two === "nn") return null; // Norwegian not supported
    var map = { en:"en", tr:"tr", es:"es", de:"de", fr:"fr", it:"it", ru:"ru", ja:"ja",
                ko:"ko", hi:"hi", id:"id", nl:"nl", pl:"pl", uk:"uk", vi:"vi", th:"th",
                sv:"sv", ar:"ar", fa:"fa" };
    return map[two] || null;
  }

  function detect() {
    try { var s = localStorage.getItem(STORE); if (s && supported(s)) return s; } catch (e) {}
    var list = (navigator.languages && navigator.languages.length)
      ? navigator.languages : [navigator.language || navigator.userLanguage || "en"];
    for (var i = 0; i < list.length; i++) { var n = norm(list[i]); if (n) return n; }
    return "en";
  }

  function apply(lang) {
    if (!supported(lang)) lang = "en";
    var d = (lang === "en") ? null : (T[lang] || null);
    nodes.forEach(function (el) {
      var k = el.getAttribute("data-i18n");
      var v = (d && d[k] != null) ? d[k] : EN[k];
      if (v != null && el.innerHTML !== v) el.innerHTML = v;
    });
    document.title = (d && d["meta.title"]) ? d["meta.title"] : EN_TITLE;
    var html = document.documentElement;
    html.setAttribute("lang", lang);
    html.setAttribute("dir", isRTL(lang) ? "rtl" : "ltr");
    try { localStorage.setItem(STORE, lang); } catch (e) {}
    var sel = document.getElementById("langPicker");
    if (sel && sel.value !== lang) sel.value = lang;
  }

  function build() {
    var sel = document.getElementById("langPicker");
    if (sel) {
      var h = "";
      for (var i = 0; i < LANGS.length; i++) h += '<option value="' + LANGS[i].c + '">' + LANGS[i].n + "</option>";
      sel.innerHTML = h;
      sel.addEventListener("change", function () { apply(sel.value); });
    }
    // A pre-rendered localized page pins its language via window.__CASCADE_LANG.
    var forced = window.__CASCADE_LANG;
    apply((forced && supported(forced)) ? forced : detect());
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();

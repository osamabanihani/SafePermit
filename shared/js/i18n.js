(function () {
  const STORAGE_KEY = "safePermitLanguage";
  const root = document.documentElement;
  const staticTextState = new WeakMap();
  const staticAttrState = new WeakMap();
  const originalDynamicText = new WeakMap();
  const lastDynamicTranslation = new WeakMap();
  const originalDynamicAttrs = new WeakMap();
  const lastDynamicAttrs = new WeakMap();
  const translatableAttrs = ["placeholder", "aria-label", "title", "alt"];
  const locales = {};
  let readyResolve;
  const readyPromise = new Promise(function (resolve) { readyResolve = resolve; });
  let isReady = false;

  function normalize(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function splitWhitespace(value) {
    const match = String(value).match(/^(\s*)([\s\S]*?)(\s*)$/);
    return match ? [match[1], match[2], match[3]] : ["", String(value), ""];
  }

  function getLanguage() {
    return root.lang === "ar" ? "ar" : "en";
  }

  function locale() {
    return locales[getLanguage()] || locales.en || { strings: {}, runtime: {} };
  }

  function resolveLocaleUrl(fileName) {
    if (window.SafePermitPaths && window.SafePermitPaths.localesBase) {
      return new URL(fileName, window.SafePermitPaths.localesBase).href;
    }
    const script = document.currentScript || document.querySelector('script[src*="/shared/js/i18n.js"], script[src$="shared/js/i18n.js"]');
    return new URL("../locales/" + fileName, script.src).href;
  }

  async function loadLocales() {
    try {
      const responses = await Promise.all([
        fetch(resolveLocaleUrl("en.json")),
        fetch(resolveLocaleUrl("ar.json"))
      ]);
      if (!responses[0].ok || !responses[1].ok) throw new Error("Locale file could not be loaded.");
      locales.en = await responses[0].json();
      locales.ar = await responses[1].json();
    } catch (error) {
      console.error("SafePermit i18n:", error);
      locales.en = { strings: {}, runtime: {} };
      locales.ar = { strings: {}, runtime: {} };
    }
    isReady = true;
    root.classList.add("sp-i18n-ready");
    readyResolve();
    apply(document);
    syncControls(document);
    scheduleApply();
    document.dispatchEvent(new CustomEvent("safepermit:i18nready"));
  }

  function getString(key) {
    if (!key) return "";
    const data = locale();
    return Object.prototype.hasOwnProperty.call(data.strings || {}, key) ? data.strings[key] : "";
  }

  function patternTranslate(text) {
    if (getLanguage() !== "ar") return text;

    const runtime = (locale() && locale().runtime) || {};
    function known(value) {
      const clean = normalize(value);
      return Object.prototype.hasOwnProperty.call(runtime, clean) ? runtime[clean] : clean;
    }

    function localizeDateWords(value) {
      const words = {
        January: "يناير", February: "فبراير", March: "مارس", April: "أبريل",
        May: "مايو", June: "يونيو", July: "يوليو", August: "أغسطس",
        September: "سبتمبر", October: "أكتوبر", November: "نوفمبر", December: "ديسمبر",
        Jan: "يناير", Feb: "فبراير", Mar: "مارس", Apr: "أبريل", Jun: "يونيو",
        Jul: "يوليو", Aug: "أغسطس", Sep: "سبتمبر", Sept: "سبتمبر", Oct: "أكتوبر",
        Nov: "نوفمبر", Dec: "ديسمبر"
      };
      let result = value.replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\b/g, function (word) {
        return words[word] || word;
      });
      result = result.replace(/\bAM\b/g, "ص").replace(/\bPM\b/g, "م");
      return result;
    }

    let match;
    // Safety error messages: "<prefix>: reason; reason" (prefixes may nest).
    if ((match = text.match(/^(Decision not saved|Safety review blocked|Safety blockers|Cannot resume|Action rejected|Unable to update permit):\s*([\s\S]+)$/))) {
      return known(match[1] + ":") + " " + match[2].split(/;\s*/).map(function (part) {
        const localized = known(part);
        return localized === normalize(part) ? patternTranslate(normalize(part)) : localized;
      }).join("؛ ");
    }
    // Safety & Risk Command Center composites (v13).
    if ((match = text.match(/^(\d+) records?$/))) return match[1] + " سجل";
    if ((match = text.match(/^(New|Edit) (.+)$/))) return (match[1] === "New" ? "جديد: " : "تعديل: ") + known(match[2]);
    if ((match = text.match(/^Compliance HSE Verification — (.+)$/))) return "تحقق الامتثال — " + match[1];
    if ((match = text.match(/^Risk: (\d+) \/ 25 — (\w+)(?: · Residual: (\d+))?$/))) {
      return "المخاطر: " + match[1] + " / 25 — " + known(match[2]) + (match[3] ? " · المتبقي: " + match[3] : "");
    }
    if ((match = text.match(/^(id|area|permitId|otherPermitId|owner|due): ([\s\S]+)$/))) {
      const keys = { id: "المعرّف", area: "المنطقة", permitId: "رقم التصريح", otherPermitId: "التصريح المتعارض", owner: "المسؤول", due: "الاستحقاق" };
      return keys[match[1]] + ": " + match[2];
    }
    if ((match = text.match(/^Unable to load records: ([\s\S]+)$/))) return "تعذّر تحميل السجلات: " + match[1];
    if ((match = text.match(/^(\d+)\s+min(?:s)?\s+ago$/i))) return "قبل " + match[1] + " دقيقة";
    if ((match = text.match(/^(\d+)\s+hr(?:s)?\s+ago$/i))) return "قبل " + match[1] + " ساعة";
    if ((match = text.match(/^(\d+)\s+day(?:s)?\s+ago$/i))) return "قبل " + match[1] + " يوم";
    if ((match = text.match(/^(\d+)\s+of\s+(\d+)\s+complete$/i))) return match[1] + " من " + match[2] + " مكتمل";
    if ((match = text.match(/^(\d+)\s*\/\s*(\d+)\s+complete$/i))) return match[1] + " / " + match[2] + " مكتمل";
    if ((match = text.match(/^(\d+)\s*\/\s*(\d+)\s+answered$/i))) return match[1] + " / " + match[2] + " تمت الإجابة";
    if ((match = text.match(/^(\d+)\s+residual score$/i))) return "درجة المخاطر المتبقية " + match[1];
    if ((match = text.match(/^Hazard\s+(\d+)(.*)$/i))) {
      const rest = match[2].match(/^\s*·\s*(.+)$/);
      return "الخطر " + match[1] + (rest ? " · " + known(rest[1]) : match[2]);
    }
    if ((match = text.match(/^(\d+) active \/ (\d+) areas?$/i))) return match[1] + " نشطة / " + match[2] + " مناطق";
    if ((match = text.match(/^(\d+) approvals? · (\d+) exceptions?$/i))) return match[1] + " موافقات · " + match[2] + " استثناءات";
    if ((match = text.match(/^(\d+) events?$/i))) return match[1] + " أحداث";
    if ((match = text.match(/^(Deactivate|Activate|Block|Unblock) (.+)\?$/))) {
      const verbs = { Deactivate: "إلغاء تفعيل", Activate: "تفعيل", Block: "حظر", Unblock: "إلغاء حظر" };
      return verbs[match[1]] + " " + known(match[2]) + "؟";
    }
    if ((match = text.match(/^Detected (\d+) potential conflict\(s\); (\d+) new review record\(s\)\. Manual HSE assessment required\.$/))) {
      return "تم رصد " + match[1] + " تعارض محتمل؛ " + match[2] + " سجل مراجعة جديد. يلزم تقييم يدوي من فريق HSE.";
    }
    if ((match = text.match(/^NOT AUTHORIZED — permit is (.+)$/))) return "غير مصرّح — حالة التصريح: " + known(match[1]);
    if ((match = text.match(/^Initial\s+([^·]+)\s*·\s*(Low|Medium|High|Critical)$/i))) return "أولي " + normalize(match[1]) + " · " + known(match[2]);
    if ((match = text.match(/^Residual\s+([^·]+)\s*·\s*(Low|Medium|High|Critical)$/i))) return "متبقي " + normalize(match[1]) + " · " + known(match[2]);
    if ((match = text.match(/^(\d+)\s+hazards?$/i))) return match[1] === "1" ? "خطر واحد" : match[1] + " مخاطر";
    if ((match = text.match(/^(\d+)\s+permits?\s+shown$/i))) return match[1] === "1" ? "تصريح واحد ظاهر" : match[1] + " تصاريح ظاهرة";
    if ((match = text.match(/^Worker:\s*(.+)$/i))) return "العامل: " + known(match[1]);
    if ((match = text.match(/^Assigned reviewer:\s*(.+)$/i))) return "المراجع المعيّن: " + known(match[1]);
    if ((match = text.match(/^Submitted\s+(.+)$/i))) return "تم الإرسال " + localizeDateWords(match[1]);
    if ((match = text.match(/^Suggestions for:\s*(.+)$/i))) return "اقتراحات لـ: " + match[1];
    if ((match = text.match(/^Your operational approval was recorded\. The permit status is now\s+(.+)\.$/i))) {
      return "تم تسجيل موافقتك التشغيلية. حالة التصريح الآن: " + known(match[1]) + ".";
    }
    if ((match = text.match(/^Final Admin decision already recorded:\s*(.+)\.$/i))) {
      return "تم تسجيل قرار المسؤول النهائي مسبقًا: " + known(match[1]) + ".";
    }
    if ((match = text.match(/^→\s*(.+)$/))) return "← " + known(match[1]);

    // Composite labels such as "Factory A · Maintenance Room" or "Site · Active".
    if (text.includes(" · ")) {
      return text.split(" · ").map(function (part) {
        const localized = known(part);
        return localized === part ? localizeDateWords(part) : localized;
      }).join(" · ");
    }

    if (text.includes(" → ")) {
      return text.split(" → ").map(function (part) {
        const localized = known(part);
        return localized === part ? localizeDateWords(part) : localized;
      }).join(" ← ");
    }

    const dated = localizeDateWords(text);
    if (dated !== text) return dated;
    if (text === "→") return "←";
    if (text === "←") return "→";
    return text;
  }

  function translateRuntime(value) {
    const source = normalize(value);
    if (!source) return value;
    const data = locale();
    if (Object.prototype.hasOwnProperty.call(data.runtime || {}, source)) {
      return data.runtime[source];
    }
    return patternTranslate(source);
  }

  function directTextNodes(element) {
    return Array.from(element.childNodes).filter(function (node) {
      return node.nodeType === Node.TEXT_NODE && normalize(node.nodeValue);
    });
  }

  function applyStaticElement(element) {
    if (!(element instanceof Element) || element.closest("[data-i18n-ignore]")) return;

    const singleKey = element.getAttribute("data-i18n-text");
    const multiKeys = element.getAttribute("data-i18n-texts");
    if (singleKey || multiKeys) {
      const nodes = directTextNodes(element);
      const keys = singleKey ? [singleKey] : String(multiKeys || "").split("|");
      nodes.forEach(function (node, index) {
        const key = keys[index];
        if (!key) return;
        const english = locales.en && locales.en.strings ? locales.en.strings[key] : "";
        const arabic = locales.ar && locales.ar.strings ? locales.ar.strings[key] : "";
        if (!english) return;

        let state = staticTextState.get(node);
        const current = normalize(node.nodeValue);
        if (!state) {
          state = { dynamicSource: null, lastApplied: null };
          // If page JavaScript changed an annotated node before the locale finished loading, preserve that live value.
          if (current && current !== normalize(english) && current !== normalize(arabic)) state.dynamicSource = current;
          staticTextState.set(node, state);
        } else if (state.lastApplied && current !== state.lastApplied) {
          // Page JavaScript changed this node after our previous pass. Treat the new value as the live English source.
          state.dynamicSource = current;
        }

        const target = state.dynamicSource
          ? (getLanguage() === "ar" ? translateRuntime(state.dynamicSource) : state.dynamicSource)
          : (getLanguage() === "ar" ? arabic : english);
        if (!target) return;
        const parts = splitWhitespace(node.nodeValue);
        node.nodeValue = parts[0] + target + parts[2];
        state.lastApplied = normalize(target);
      });
    }

    const attrMap = {
      "placeholder": "data-i18n-placeholder",
      "aria-label": "data-i18n-aria-label",
      "title": "data-i18n-title",
      "data-title": "data-i18n-data-title",
      "alt": "data-i18n-alt"
    };
    Object.keys(attrMap).forEach(function (attr) {
      const key = element.getAttribute(attrMap[attr]);
      if (!key) return;
      const english = locales.en && locales.en.strings ? locales.en.strings[key] : "";
      const arabic = locales.ar && locales.ar.strings ? locales.ar.strings[key] : "";
      if (!english) return;

      let stores = staticAttrState.get(element);
      if (!stores) { stores = {}; staticAttrState.set(element, stores); }
      let state = stores[attr];
      const current = normalize(element.getAttribute(attr));
      if (!state) {
        state = { dynamicSource: null, lastApplied: null };
        if (current && current !== normalize(english) && current !== normalize(arabic)) state.dynamicSource = current;
        stores[attr] = state;
      } else if (state.lastApplied && current !== state.lastApplied) {
        state.dynamicSource = current;
      }

      const target = state.dynamicSource
        ? (getLanguage() === "ar" ? translateRuntime(state.dynamicSource) : state.dynamicSource)
        : (getLanguage() === "ar" ? arabic : english);
      if (target) {
        element.setAttribute(attr, target);
        state.lastApplied = normalize(target);
      }
    });
  }

  function isStaticI18nTextNode(node) {
    const parent = node.parentElement;
    return !!(parent && (parent.hasAttribute("data-i18n-text") || parent.hasAttribute("data-i18n-texts")));
  }

  function shouldSkipDynamic(node) {
    const parent = node.parentElement;
    if (!parent) return true;
    if (["SCRIPT", "STYLE", "CODE", "PRE", "SVG", "PATH", "DEFS", "SYMBOL"].includes(parent.tagName)) return true;
    if (parent.closest("[data-i18n-ignore]")) return true;
    if (isStaticI18nTextNode(node)) return true;
    return false;
  }

  function applyDynamicText(node) {
    if (shouldSkipDynamic(node)) return;
    const language = getLanguage();
    const current = node.nodeValue;

    if (!originalDynamicText.has(node)) originalDynamicText.set(node, current);

    const last = lastDynamicTranslation.get(node);
    if (last && current !== last) {
      // The application changed this node after our translation pass. Preserve the new live source.
      originalDynamicText.set(node, current);
      lastDynamicTranslation.delete(node);
    } else if (!last && language === "en" && current !== originalDynamicText.get(node)) {
      // English mode is authoritative for live page state.
      originalDynamicText.set(node, current);
    }

    const source = originalDynamicText.get(node);
    if (language === "en") {
      if (last && node.nodeValue === last) node.nodeValue = source;
      lastDynamicTranslation.delete(node);
      return;
    }

    if (/\p{Script=Arabic}/u.test(normalize(source))) return;
    const parts = splitWhitespace(source);
    const translated = translateRuntime(parts[1]);
    const result = parts[0] + translated + parts[2];
    if (result !== node.nodeValue) node.nodeValue = result;
    lastDynamicTranslation.set(node, result);
  }

  function applyDynamicAttrs(element) {
    if (!(element instanceof Element) || element.closest("[data-i18n-ignore]")) return;
    let originals = originalDynamicAttrs.get(element);
    if (!originals) { originals = {}; originalDynamicAttrs.set(element, originals); }
    let translatedStore = lastDynamicAttrs.get(element);
    if (!translatedStore) { translatedStore = {}; lastDynamicAttrs.set(element, translatedStore); }

    translatableAttrs.forEach(function (name) {
      if (!element.hasAttribute(name)) return;
      const keyAttr = "data-i18n-" + name;
      if (element.hasAttribute(keyAttr)) return;
      const current = element.getAttribute(name);
      if (!(name in originals)) originals[name] = current;

      const last = translatedStore[name];
      if (last && current !== last) {
        originals[name] = current;
        delete translatedStore[name];
      } else if (!last && getLanguage() === "en" && current !== originals[name]) {
        originals[name] = current;
      }

      if (getLanguage() === "en") {
        if (last && element.getAttribute(name) === last) element.setAttribute(name, originals[name]);
        delete translatedStore[name];
      } else {
        const result = translateRuntime(originals[name]);
        element.setAttribute(name, result);
        translatedStore[name] = result;
      }
    });
  }

  function apply(scope) {
    if (!isReady || !scope) return;
    const base = scope === document ? document.documentElement : scope;

    if (base instanceof Element) applyStaticElement(base);
    if (base.querySelectorAll) {
      base.querySelectorAll("[data-i18n-text],[data-i18n-texts],[data-i18n-placeholder],[data-i18n-aria-label],[data-i18n-title],[data-i18n-data-title],[data-i18n-alt]").forEach(applyStaticElement);
    }

    const walkerRoot = scope === document ? document.body : scope;
    if (!walkerRoot) return;
    const walker = document.createTreeWalker(walkerRoot, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node = walker.currentNode;
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) applyDynamicText(node);
      else if (node.nodeType === Node.ELEMENT_NODE) applyDynamicAttrs(node);
      node = walker.nextNode();
    }

    // The page title is static data-i18n text in <title>, but TreeWalker does not traverse <head> when applying body.
    const title = document.querySelector("title[data-i18n-text]");
    if (title) applyStaticElement(title);
  }

  function scheduleApply() {
    [0, 80, 300, 900].forEach(function (delay) {
      window.setTimeout(function () { apply(document); }, delay);
    });
  }

  function saveLanguage(language) {
    try { localStorage.setItem(STORAGE_KEY, language); } catch (error) {}
  }

  function updateLanguageButton(button) {
    if (!button) return;
    const arabic = getLanguage() === "ar";
    const label = button.querySelector("[data-sp-language-label]");
    if (label) label.textContent = arabic ? "EN" : "AR";
    const description = arabic ? "التبديل إلى الإنجليزية" : "Switch to Arabic";
    button.setAttribute("aria-label", description);
    button.title = description;
  }

  function syncControls(scope) {
    (scope || document).querySelectorAll("[data-sp-language-toggle]").forEach(updateLanguageButton);
  }

  function bind(scope) {
    const host = scope || document;
    host.querySelectorAll("[data-sp-language-toggle]").forEach(function (button) {
      if (button.dataset.spLanguageBound === "true") {
        updateLanguageButton(button);
        return;
      }
      button.dataset.spLanguageBound = "true";
      updateLanguageButton(button);
      button.addEventListener("click", function () {
        setLanguage(getLanguage() === "ar" ? "en" : "ar");
      });
    });
  }

  function setLanguage(language, persist) {
    const next = language === "ar" ? "ar" : "en";
    root.lang = next;
    root.dir = next === "ar" ? "rtl" : "ltr";
    root.setAttribute("data-language", next);
    if (persist !== false) saveLanguage(next);
    apply(document);
    syncControls(document);
    scheduleApply();
    document.dispatchEvent(new CustomEvent("safepermit:languagechange", { detail: { language: next } }));
    return next;
  }

  function t(key) {
    return getString(key) || key;
  }

  window.SafePermitI18n = {
    ready: function () { return readyPromise; },
    isReady: function () { return isReady; },
    getLanguage: getLanguage,
    setLanguage: setLanguage,
    toggleLanguage: function () { return setLanguage(getLanguage() === "ar" ? "en" : "ar"); },
    t: t,
    translateValue: function (value) { return getLanguage() === "ar" ? translateRuntime(value) : value; },
    apply: apply,
    bind: bind,
    syncControls: syncControls
  };

  // Re-apply after ordinary UI interactions so dynamically rendered known UI strings are translated.
  // "input" covers search boxes, whose result counts and empty states are rendered while typing.
  ["click", "change", "submit", "input"].forEach(function (eventName) {
    document.addEventListener(eventName, function () {
      window.setTimeout(function () { apply(document); }, 0);
      window.setTimeout(function () { apply(document); }, 120);
    });
  });

  document.addEventListener("safepermit:themechange", function () {
    window.setTimeout(function () { apply(document); }, 0);
  });

  window.addEventListener("storage", function (event) {
    if (event.key === STORAGE_KEY && (event.newValue === "ar" || event.newValue === "en")) {
      setLanguage(event.newValue, false);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadLocales, { once: true });
  } else {
    loadLocales();
  }
})();

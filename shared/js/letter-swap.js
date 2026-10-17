(function () {
  "use strict";
  if (window.SafePermitLetterSwap) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const states = new WeakMap();

  function init(scope) {
    if (!scope) return;
    scope.querySelectorAll("[data-letter-swap]").forEach(function (element) {
      if (states.has(element)) { states.get(element).sync(); return; }
      let signature = "";
      let visual = null;
      function sync() {
        const text = Array.from(element.childNodes).filter(function (node) { return node.nodeType === 3; })
          .map(function (node) { return node.nodeValue; }).join("").trim();
        const enabled = !reduced.matches && document.documentElement.lang !== "ar" && /[a-z]/i.test(text) && !/[\u0600-\u06ff]/.test(text);
        const next = String(enabled) + ":" + text;
        if (next === signature) return;
        signature = next;
        if (visual) visual.remove();
        visual = null;
        element.classList.remove("is-letter-swap-ready");
        if (!enabled) return;
        visual = document.createElement("span");
        visual.className = "sp-letter-swap__visual";
        visual.setAttribute("aria-hidden", "true");
        visual.setAttribute("data-i18n-ignore", "");
        Array.from(text.toUpperCase()).forEach(function (letter, index) {
          const cell = document.createElement("span");
          cell.className = "sp-letter-swap__letter";
          cell.style.setProperty("--letter-i", index);
          const pair = document.createElement("span");
          pair.className = "sp-letter-swap__pair";
          for (let copy = 0; copy < 2; copy++) {
            const glyph = document.createElement("span");
            glyph.textContent = letter === " " ? "\u00a0" : letter;
            pair.appendChild(glyph);
          }
          cell.appendChild(pair);
          visual.appendChild(cell);
        });
        element.appendChild(visual);
        element.classList.add("is-letter-swap-ready");
      }
      // Existing i18n rewrites the untouched source text, then this refreshes the decorative copy.
      const observer = new MutationObserver(sync);
      observer.observe(element, { childList: true, characterData: true, subtree: true });
      document.addEventListener("safepermit:languagechange", sync);
      document.addEventListener("safepermit:i18nready", sync);
      reduced.addEventListener("change", sync);
      states.set(element, { sync: sync });
      sync();
    });
    // Scramble variant (public footer links): a short noise run that settles on the real label.
    scope.querySelectorAll("[data-letter-scramble]").forEach(function (element) {
      if (states.has(element)) return;
      const label = element.querySelector("[data-letter-scramble-label]") || element;
      let frame = 0;
      let visual = null;
      function stop() {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        if (visual) visual.remove();
        visual = null;
        element.classList.remove("is-scrambling");
      }
      function run() {
        stop();
        const text = label.textContent.replace(/\s+/g, " ").trim();
        // Arabic labels keep their shape: the CSS gives them a non-text hover effect instead.
        if (reduced.matches || document.documentElement.lang === "ar" || !/[a-z]/i.test(text) || /[؀-ۿ]/.test(text)) return;
        visual = document.createElement("span");
        visual.className = "sp-scramble__visual";
        visual.setAttribute("aria-hidden", "true");
        visual.setAttribute("data-i18n-ignore", "");
        label.appendChild(visual);
        element.classList.add("is-scrambling");
        const start = performance.now();
        const seed = Math.random() * 100;
        let n = 0;
        const step = function (now) {
          const progress = (now - start) / 420;
          if (progress >= 1) { stop(); return; }
          // A new noise glyph every other frame reads as typing, not static.
          if (n++ % 2 === 0) visual.textContent = scramble(text, progress, seed + Math.floor(n / 2));
          frame = window.requestAnimationFrame(step);
        };
        visual.textContent = scramble(text, 0, seed);
        frame = window.requestAnimationFrame(step);
      }
      element.addEventListener("pointerenter", run);
      element.addEventListener("focus", run);
      document.addEventListener("safepermit:languagechange", stop);
      states.set(element, { sync: stop });
    });
  }

  const NOISE = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=/<>";
  // One frame of the scramble: letters left of `progress` (0..1) are settled; spaces and punctuation never change.
  function scramble(text, progress, seed) {
    const chars = Array.from(text);
    const p = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 1;
    const settled = Math.floor(p * chars.length);
    return chars.map(function (ch, i) {
      if (i < settled || !/[a-z0-9]/i.test(ch)) return ch;
      const r = Math.abs(Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453) % 1;
      return NOISE[Math.floor(r * NOISE.length)];
    }).join("");
  }
  window.SafePermitLetterSwap = { init: init, scramble: scramble };
})();

/* SafePermit risk scoring — presentation-independent.
   Policy thresholds must be validated by the adopting organization's HSE team. */
(function (root) {
  "use strict";
  const BANDS = Object.freeze([
    Object.freeze({ max: 4, level: "Low", key: "low" }),
    Object.freeze({ max: 9, level: "Medium", key: "medium" }),
    Object.freeze({ max: 16, level: "High", key: "high" }),
    Object.freeze({ max: 25, level: "Critical", key: "critical" })
  ]);
  function classify(score) {
    const value = Number(score);
    if (!Number.isInteger(value) || value < 1 || value > 25) return null;
    const band = BANDS.find(function (entry) { return value <= entry.max; });
    return { score: value, level: band.level, key: band.key };
  }
  function calculate(severity, likelihood) {
    const s = Number(severity);
    const l = Number(likelihood);
    if (![s,l].every(function (n) { return Number.isInteger(n) && n >= 1 && n <= 5; })) return null;
    return classify(s * l);
  }
  root.SafePermitRiskEngine = Object.freeze({ classify: classify, calculate: calculate, bands: BANDS });
})(typeof window !== "undefined" ? window : globalThis);

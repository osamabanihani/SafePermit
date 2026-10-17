(function () {
  var language = "en";
  try {
    var saved = localStorage.getItem("safePermitLanguage");
    if (saved === "ar" || saved === "en") language = saved;
  } catch (error) {}
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  document.documentElement.setAttribute("data-language", language);
})();

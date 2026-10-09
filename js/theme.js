// Theme toggle: flips data-theme on <html> and persists the choice.
// Vanilla JS only - no eval, strict-CSP safe.
(function () {
  var btn = document.getElementById("theme-toggle");
  if (!btn) return;

  btn.addEventListener("click", function () {
    var current = document.documentElement.getAttribute("data-theme");
    var next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch (e) {
      /* storage unavailable - theme still applies for this page view */
    }
  });
})();

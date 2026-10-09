// Consent gate: nothing is sent to Google Analytics until the visitor chooses.
// "Essential only" stores a denial and loads no analytics at all.
// Set GA_ID to the portal's GA4 measurement id before launch; a placeholder disables GA.
(function () {
  var GA_ID = "G-XXXXXXXXXX"; // TODO: replace with the pkgs.rsquaredacademy.com measurement id
  var KEY = "consent";
  var PLACEHOLDER = /^G-X+$/i;

  function loadGa() {
    if (PLACEHOLDER.test(GA_ID)) {
      console.info("consent: GA measurement id not configured; analytics disabled");
      return;
    }
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { anonymize_ip: true });
  }

  function store(choice) {
    try {
      localStorage.setItem(KEY, choice);
    } catch (e) {
      /* storage unavailable - banner reappears next visit */
    }
  }

  function decide(choice) {
    store(choice);
    if (choice === "granted") loadGa();
  }

  function showBanner() {
    var banner = document.createElement("div");
    banner.className = "consent";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-live", "polite");
    banner.setAttribute("aria-label", "Analytics consent");

    var text = document.createElement("p");
    text.textContent =
      "This site uses Google Analytics to count visits. Nothing is sent to Google until you choose.";

    var actions = document.createElement("div");
    actions.className = "consent-actions";

    var accept = document.createElement("button");
    accept.type = "button";
    accept.className = "primary";
    accept.textContent = "Accept";
    accept.addEventListener("click", function () {
      decide("granted");
      banner.remove();
    });

    var essential = document.createElement("button");
    essential.type = "button";
    essential.textContent = "Essential only";
    essential.addEventListener("click", function () {
      decide("denied");
      banner.remove();
    });

    actions.appendChild(accept);
    actions.appendChild(essential);
    banner.appendChild(text);
    banner.appendChild(actions);
    document.body.appendChild(banner);
    accept.focus();
  }

  try {
    var choice = localStorage.getItem(KEY);
    if (choice === "granted") {
      loadGa();
    } else if (choice !== "denied") {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", showBanner);
      } else {
        showBanner();
      }
    }
  } catch (e) {
    /* storage unavailable - no banner, no analytics */
  }
})();

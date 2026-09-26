// RumBee ID (Clerk) in the browser. The server treats Clerk's session as the
// source of truth (server/rumbee/session.js); this script is its browser half:
//
//   /login   → renders Clerk's <SignIn/>, same component and theming as id.
//   /logout  → signs out of RumBee ID itself, i.e. out of every RumBee app
//   elsewhere→ keeps Clerk's 60s session cookie fresh (so htmx requests carry
//              a valid one) and reloads the page when the user signs out — or
//              switches account — on id. or any other RumBee app, so the
//              server drops the local session right away.
(function () {
  "use strict";

  var body = document.body;
  var page = body.getAttribute("data-rumbee-page");

  // Same theming id.rumbee.ai gives Clerk (lib/clerk/appearance.ts there):
  // Brand Book tokens, so dark/light follows the page's data-theme.
  var appearance = {
    variables: {
      colorPrimary: "var(--accent)",
      colorPrimaryForeground: "var(--accent-on)",
      colorForeground: "var(--text)",
      colorMutedForeground: "var(--text-muted)",
      colorBackground: "var(--bg)",
      colorInput: "var(--surface)",
      colorInputForeground: "var(--text)",
      colorNeutral: "var(--border)",
      colorBorder: "var(--border)",
      fontFamily: "var(--rb-font)",
      borderRadius: "var(--rb-radius-md)",
    },
    elements: {
      card: { boxShadow: "none", border: "none", background: "transparent" },
      headerTitle: { display: "none" },
      headerSubtitle: { display: "none" },
      footer: { display: "none" },
      // amber text is --accent-ink, never the --accent fill (contrast in light)
      alternativeMethodsBlockButtonText: { color: "var(--accent-ink)" },
      footerActionLink: { color: "var(--accent-ink)" },
      formFieldAction: { color: "var(--accent-ink)" },
    },
  };

  var LOGIN_SYNC_KEY = "rb-login-sync";

  function showSignInError(target) {
    if (!target) return;
    target.innerHTML = "";
    var message = document.createElement("p");
    message.className = "auth-shell-status";
    message.textContent =
      "Não foi possível carregar o login do RumBee ID. Recarregue a página para tentar de novo.";
    target.appendChild(message);
  }

  function mountSignIn(clerk) {
    var target = document.querySelector("[data-rumbee-sign-in]");
    if (!target) return;

    if (clerk.isSignedIn) {
      // The server rendered /login, yet the browser holds a RumBee session
      // (e.g. just signed in on another tab). Go home once so the server
      // picks it up; if that already failed, stop instead of looping.
      var last = Number(sessionStorage.getItem(LOGIN_SYNC_KEY) || 0);
      if (Date.now() - last > 10000) {
        sessionStorage.setItem(LOGIN_SYNC_KEY, String(Date.now()));
        window.location.replace("/");
        return;
      }
      showSignInError(target);
      return;
    }

    sessionStorage.removeItem(LOGIN_SYNC_KEY);
    target.innerHTML = "";
    clerk.mountSignIn(target, {
      appearance: appearance,
      forceRedirectUrl: "/",
      signUpForceRedirectUrl: "/",
    });
  }

  function signOut(clerk) {
    function toLogin() {
      window.location.replace("/login");
    }
    clerk.signOut().then(toLogin, toLogin);
  }

  function followSession(clerk) {
    var userId = clerk.user ? clerk.user.id : null;
    clerk.addListener(function (resources) {
      var next = resources.user ? resources.user.id : null;
      if (next === userId) return;
      userId = next;
      // signed out or switched account on id. or another RumBee app: let the
      // server re-read the session (it redirects to /login when there's none)
      window.location.reload();
    });
  }

  window.addEventListener("load", function () {
    var clerk = window.Clerk;
    if (!clerk) {
      if (page === "login") showSignInError(document.querySelector("[data-rumbee-sign-in]"));
      if (page === "logout") window.location.replace("/login");
      return;
    }

    var options = { appearance: appearance, localization: window.__rumbeeClerkLocalization };
    if (page === "login" && window.__internal_ClerkUICtor) {
      options.ui = { ClerkUI: window.__internal_ClerkUICtor };
    }

    clerk.load(options).then(
      function () {
        if (page === "login") mountSignIn(clerk);
        else if (page === "logout") signOut(clerk);
        else followSession(clerk);
      },
      function () {
        if (page === "login") showSignInError(document.querySelector("[data-rumbee-sign-in]"));
        if (page === "logout") window.location.replace("/login");
      }
    );
  });
})();

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Network error configurations.
 * These include NS_ERROR_* codes and URL parameter error codes.
 */

export const HTTPS_UPGRADES_MDN_DOCS =
  "https://developer.mozilla.org/docs/Web/Security/HTTPS-Only_Mode";
export const COOP_MDN_DOCS =
  "https://developer.mozilla.org/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy";
export const COEP_MDN_DOCS =
  "https://developer.mozilla.org/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy";

export const NET_ERRORS = [
  {
    id: "NS_ERROR_OFFLINE",
    errorCode: "NS_ERROR_OFFLINE",
    category: "net",
    bodyTitleL10nId: "neterror-offline-body-title",
    introContent: {
      id: "fp-neterror-offline-intro",
      args: { hostname: null },
    },
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    customNetError: {
      titleL10nId: "fp-neterror-offline-body-title",
      whatCanYouDoL10nId: "fp-neterror-offline-what-can-you-do-body",
      whatCanYouDoL10nArgs: { hostname: null },
    },
    hasNoUserFix: false,
    image: "chrome://global/skin/illustrations/no-connection.svg",
  },
  {
    id: "blockedByCOOP",
    errorCode: "NS_ERROR_DOM_COOP_FAILED",
    category: "blocked",
    introContent: {
      id: "fp-neterror-coop-coep-intro",
    },
    descriptionParts: [
      { tag: "p", l10nId: "certerror-blocked-by-corp-headers-description" },
      { tag: "a", l10nId: "certerror-coop-learn-more", href: COOP_MDN_DOCS },
    ],
    buttons: {
      showTryAgain: false,
      showGoBack: true,
    },
    customNetError: {
      titleL10nId: "fp-certerror-body-title",
      whyDidThisHappenL10nId: "fp-neterror-coop-coep-why-did-this-happen-body",
      whyDidThisHappenL10nArgs: { hostname: null },
      learnMoreL10nId: "certerror-coop-learn-more",
      learnMoreSupportPage: COOP_MDN_DOCS,
    },
    hasNoUserFix: true,
  },
  {
    id: "blockedByCOEP",
    errorCode: "NS_ERROR_DOM_COEP_FAILED",
    category: "blocked",
    introContent: {
      id: "fp-neterror-coop-coep-intro",
    },
    descriptionParts: [
      { tag: "p", l10nId: "certerror-blocked-by-corp-headers-description" },
      { tag: "a", l10nId: "certerror-coep-learn-more", href: COEP_MDN_DOCS },
    ],
    buttons: {
      showTryAgain: false,
      showGoBack: true,
    },
    customNetError: {
      titleL10nId: "fp-certerror-body-title",
      whyDidThisHappenL10nId: "fp-neterror-coop-coep-why-did-this-happen-body",
      whyDidThisHappenL10nArgs: { hostname: null },
      learnMoreL10nId: "certerror-coep-learn-more",
      learnMoreSupportPage: COEP_MDN_DOCS,
    },
    hasNoUserFix: true,
  },
  {
    id: "basicHttpAuthDisabled",
    errorCode: "NS_ERROR_BASIC_HTTP_AUTH_DISABLED",
    category: "net",
    introContent: {
      id: "fp-neterror-http-auth-disabled-intro",
    },
    descriptionParts: [
      {
        tag: "li",
        l10nId: "neterror-basic-http-auth",
        l10nArgs: { hostname: null },
      },
      {
        tag: "a",
        l10nId: "neterror-learn-more-link",
        href: HTTPS_UPGRADES_MDN_DOCS,
      },
    ],
    buttons: {
      showTryAgain: false,
      showGoBack: true,
      showAdvanced: true,
    },
    advanced: {
      whyDangerousL10nId: "fp-neterror-http-auth-disabled-why-dangerous-body",
      whyDangerousL10nArgs: { hostname: null },
      whatCanYouDoL10nId: "fp-neterror-http-auth-disabled-what-can-you-do-body",
      learnMoreL10nId: "fp-learn-more-about-https-connections",
      learnMoreSupportPage: HTTPS_UPGRADES_MDN_DOCS,
    },
    hasNoUserFix: false,
  },
  {
    id: "netReset",
    errorCode: "NS_ERROR_NET_EMPTY_RESPONSE",
    category: "net",
    bodyTitleL10nId: "problem-with-this-site-title",
    introContent: {
      id: "neterror-http-empty-response-description",
      args: { hostname: null },
    },
    descriptionParts: "connectionFailureDescription",
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    customNetError: {
      titleL10nId: "problem-with-this-site-title",
      whatCanYouDoL10nId: "neterror-http-empty-response",
    },
    hasNoUserFix: false,
    image: "chrome://global/skin/illustrations/no-connection.svg",
  },
  {
    id: "nssBadCert",
    errorCode: "nssBadCert",
    category: "cert",
    introContent: {
      id: "fp-certerror-intro",
      args: { hostname: null },
    },
    buttons: {
      showTryAgain: false,
      showGoBack: true,
      showAdvanced: true,
      showAddException: true,
    },
    advanced: {
      whyDangerousResolver: context => {
        // For HSTS sites, we don't need detailed "why dangerous" since we'll
        // explain the HSTS policy in "what can you do"
        // For all cases, use generic cert invalid message since we don't know
        // the specific error (nssBadCert is a fallback when specific code unavailable)
        return {
          id: "fp-certerror-invalid-cert-why-dangerous",
          args: { hostname: context.hostname },
        };
      },
      whatCanYouDoResolver: context => {
        // For HSTS sites (badStsCert), explain why exceptions can't be added
        if (context.cssClass === "badStsCert") {
          return {
            id: "certerror-what-should-i-do-bad-sts-cert-explanation",
            args: { hostname: context.hostname },
          };
        }
        // For other cases, provide generic advice
        return {
          id: "fp-certerror-unknown-issuer-what-can-you-do-body",
          args: {},
        };
      },
      learnMoreL10nId: "fp-learn-more-about-cert-issues",
      learnMoreSupportPage: "connection-not-secure",
      showViewCertificate: true,
      showDateTime: true,
    },
    hasNoUserFix: false,
  },
  // Legacy URL parameter error codes (used in aboutNetError.mjs)
  {
    id: "connectionFailure",
    errorCode: "connectionFailure",
    category: "net",
    useLegacy: true,
    descriptionParts: "connectionFailureDescription",
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    hasNoUserFix: false,
  },
  {
    id: "netInterrupt",
    errorCode: "netInterrupt",
    category: "net",
    useLegacy: true,
    descriptionParts: "connectionFailureDescription",
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    hasNoUserFix: false,
  },
  {
    id: "netTimeout",
    errorCode: "netTimeout",
    category: "net",
    useLegacy: true,
    descriptionParts: "connectionFailureDescription",
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    hasNoUserFix: false,
  },
  {
    id: "dnsNotFound",
    errorCode: "dnsNotFound",
    category: "net",
    useLegacy: true,
    descriptionParts: "dnsNotFoundDescription",
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    hasNoUserFix: false,
    checkTrrOnly: true,
  },
  {
    id: "blockedByPolicy",
    errorCode: "blockedByPolicy",
    category: "blocked",
    useLegacy: true,
    descriptionParts: [],
    buttons: {
      showTryAgain: false,
      showGoBack: false,
    },
    hasNoUserFix: true,
  },
  {
    id: "httpErrorPage",
    errorCode: "httpErrorPage",
    category: "net",
    useLegacy: true,
    descriptionParts: [{ tag: "li", l10nId: "neterror-http-error-page" }],
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    hasNoUserFix: false,
  },
  {
    id: "serverError",
    errorCode: "serverError",
    category: "net",
    useLegacy: true,
    descriptionParts: [{ tag: "li", l10nId: "neterror-load-error-try-again" }],
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    hasNoUserFix: false,
  },
  {
    id: "invalidHeaderValue",
    errorCode: "invalidHeaderValue",
    category: "net",
    useLegacy: true,
    descriptionParts: [{ tag: "li", l10nId: "neterror-http-error-page" }],
    buttons: {
      showTryAgain: false,
      showGoBack: false,
    },
    hasNoUserFix: false,
  },
  {
    id: "deniedPortAccess",
    errorCode: "deniedPortAccess",
    category: "blocked",
    useLegacy: true,
    descriptionParts: [],
    buttons: {
      showTryAgain: false,
      showGoBack: false,
    },
    hasNoUserFix: true,
  },
  {
    id: "malformedURI",
    errorCode: "malformedURI",
    category: "net",
    useLegacy: true,
    descriptionParts: [],
    buttons: {
      showTryAgain: false,
      showGoBack: false,
    },
    hasNoUserFix: true,
  },
  {
    id: "captivePortal",
    errorCode: "captivePortal",
    category: "net",
    useLegacy: true,
    descriptionParts: [{ tag: "p", l10nId: "" }],
    buttons: {
      showTryAgain: false,
      showGoBack: false,
      showOpenPortal: true,
    },
    hasNoUserFix: false,
    isCaptivePortal: true,
  },
  {
    id: "contentEncodingError",
    errorCode: "contentEncodingError",
    category: "net",
    useLegacy: true,
    descriptionParts: [
      { tag: "li", l10nId: "neterror-content-encoding-error" },
    ],
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    hasNoUserFix: false,
  },
  {
    id: "corruptedContentErrorv2",
    errorCode: "corruptedContentErrorv2",
    category: "net",
    useLegacy: true,
    descriptionParts: [
      { tag: "p", l10nId: "neterror-corrupted-content-intro" },
      { tag: "li", l10nId: "neterror-corrupted-content-contact-website" },
    ],
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    hasNoUserFix: false,
  },
  {
    id: "fileAccessDenied",
    errorCode: "fileAccessDenied",
    category: "net",
    useLegacy: true,
    descriptionParts: [{ tag: "li", l10nId: "neterror-access-denied" }],
    buttons: {
      showTryAgain: false,
      showGoBack: false,
    },
    hasNoUserFix: true,
  },
  {
    id: "fileNotFound",
    errorCode: "fileNotFound",
    category: "net",
    useLegacy: true,
    descriptionParts: [
      { tag: "li", l10nId: "neterror-file-not-found-filename" },
      { tag: "li", l10nId: "neterror-file-not-found-moved" },
    ],
    buttons: {
      showTryAgain: false,
      showGoBack: false,
    },
    hasNoUserFix: true,
  },
  {
    id: "inadequateSecurityError",
    errorCode: "inadequateSecurityError",
    category: "net",
    useLegacy: true,
    descriptionParts: [
      {
        tag: "p",
        l10nId: "neterror-inadequate-security-intro",
        l10nArgs: { hostname: null },
      },
      { tag: "p", l10nId: "neterror-inadequate-security-code" },
    ],
    buttons: {
      showTryAgain: false,
      showGoBack: false,
    },
    hasNoUserFix: true,
  },
  {
    id: "mitm",
    errorCode: "mitm",
    category: "cert",
    useLegacy: true,
    descriptionPartsResolver: "mitmDescription",
    buttons: {
      showTryAgain: false,
      showGoBack: true,
      showAdvanced: true,
    },
    hasNoUserFix: false,
    checkMitm: true,
  },
  {
    id: "netOffline",
    errorCode: "netOffline",
    category: "net",
    useLegacy: true,
    descriptionParts: [{ tag: "li", l10nId: "neterror-net-offline" }],
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    hasNoUserFix: false,
  },
  {
    id: "networkProtocolError",
    errorCode: "networkProtocolError",
    category: "net",
    useLegacy: true,
    descriptionParts: [
      { tag: "p", l10nId: "neterror-network-protocol-error-intro" },
      { tag: "li", l10nId: "neterror-network-protocol-error-contact-website" },
    ],
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    hasNoUserFix: false,
  },
  {
    id: "notCached",
    errorCode: "notCached",
    category: "net",
    useLegacy: true,
    descriptionParts: [
      { tag: "p", l10nId: "neterror-not-cached-intro" },
      { tag: "li", l10nId: "neterror-not-cached-sensitive" },
      { tag: "li", l10nId: "neterror-not-cached-try-again" },
    ],
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    hasNoUserFix: false,
  },
  {
    id: "nssFailure2",
    errorCode: "nssFailure2",
    category: "cert",
    useLegacy: true,
    descriptionParts: [
      { tag: "li", l10nId: "neterror-nss-failure-not-verified" },
      { tag: "li", l10nId: "neterror-nss-failure-contact-website" },
    ],
    buttons: {
      showTryAgain: false,
      showGoBack: false,
      showPrefReset: true,
    },
    hasNoUserFix: false,
    checkNSSFailure: true,
  },
  {
    id: "proxyConnectFailure",
    errorCode: "proxyConnectFailure",
    category: "net",
    useLegacy: true,
    descriptionParts: [
      { tag: "li", l10nId: "neterror-proxy-connect-failure-settings" },
      { tag: "li", l10nId: "neterror-proxy-connect-failure-contact-admin" },
    ],
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    hasNoUserFix: false,
  },
  {
    id: "proxyResolveFailure",
    errorCode: "proxyResolveFailure",
    category: "net",
    useLegacy: true,
    descriptionParts: [
      { tag: "li", l10nId: "neterror-proxy-resolve-failure-settings" },
      { tag: "li", l10nId: "neterror-proxy-resolve-failure-connection" },
      { tag: "li", l10nId: "neterror-proxy-resolve-failure-firewall" },
    ],
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    hasNoUserFix: false,
  },
  {
    id: "redirectLoop",
    errorCode: "redirectLoop",
    category: "net",
    useLegacy: true,
    descriptionParts: [{ tag: "li", l10nId: "neterror-redirect-loop" }],
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    hasNoUserFix: false,
  },
  {
    id: "sslv3Used",
    errorCode: "sslv3Used",
    category: "cert",
    useLegacy: true,
    descriptionParts: [{ tag: "span", l10nId: "neterror-sslv3-used" }],
    buttons: {
      showTryAgain: false,
      showGoBack: false,
    },
    hasNoUserFix: true,
  },
  {
    id: "unknownProtocolFound",
    errorCode: "unknownProtocolFound",
    category: "net",
    useLegacy: true,
    descriptionParts: [{ tag: "li", l10nId: "neterror-unknown-protocol" }],
    buttons: {
      showTryAgain: false,
      showGoBack: false,
    },
    hasNoUserFix: true,
  },
  {
    id: "unknownSocketType",
    errorCode: "unknownSocketType",
    category: "net",
    useLegacy: true,
    descriptionParts: [
      { tag: "li", l10nId: "neterror-unknown-socket-type-psm-installed" },
      { tag: "li", l10nId: "neterror-unknown-socket-type-server-config" },
    ],
    buttons: {
      showTryAgain: false,
      showGoBack: false,
    },
    hasNoUserFix: true,
  },
  {
    id: "unsafeContentType",
    errorCode: "unsafeContentType",
    category: "net",
    useLegacy: true,
    descriptionParts: [{ tag: "li", l10nId: "neterror-unsafe-content-type" }],
    buttons: {
      showTryAgain: false,
      showGoBack: false,
    },
    hasNoUserFix: true,
  },
  {
    id: "cspBlocked",
    errorCode: "cspBlocked",
    category: "blocked",
    useLegacy: true,
    buttons: {
      showTryAgain: false,
      showGoBack: false,
    },
    hasNoUserFix: true,
  },
  {
    id: "xfoBlocked",
    errorCode: "xfoBlocked",
    category: "blocked",
    useLegacy: true,
    buttons: {
      showTryAgain: false,
      showGoBack: false,
    },
    hasNoUserFix: true,
  },
];

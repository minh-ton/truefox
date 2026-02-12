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
      dataL10nId: "fp-neterror-offline-intro",
      dataL10nArgs: { hostname: null },
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
      dataL10nId: "fp-neterror-coop-coep-intro",
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
      dataL10nId: "fp-neterror-coop-coep-intro",
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
      dataL10nId: "fp-neterror-http-auth-disabled-intro",
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
      whyDangerous: {
        dataL10nId: "fp-neterror-http-auth-disabled-why-dangerous-body",
        dataL10nArgs: { hostname: null },
      },
      whatCanYouDo: {
        dataL10nId: "fp-neterror-http-auth-disabled-what-can-you-do-body",
      },
      learnMore: {
        dataL10nId: "fp-learn-more-about-https-connections",
        supportPage: HTTPS_UPGRADES_MDN_DOCS,
      },
    },
    hasNoUserFix: false,
  },
  {
    id: "netReset",
    errorCode: "NS_ERROR_NET_EMPTY_RESPONSE",
    category: "net",
    bodyTitleL10nId: "problem-with-this-site-title",
    introContent: {
      dataL10nId: "neterror-http-empty-response-description",
      dataL10nArgs: { hostname: null },
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
      dataL10nId: "fp-certerror-intro",
      dataL10nArgs: { hostname: null },
    },
    buttons: {
      showTryAgain: false,
      showGoBack: true,
      showAdvanced: true,
      showAddException: true,
    },
    advanced: {
      whyDangerous: {
        dataL10nId: "fp-certerror-bad-cert-why-dangerous-body",
        dataL10nArgs: { hostname: null },
      },
      whatCanYouDo: {
        dataL10nId: l10nArgValues =>
          l10nArgValues.cssClass === "badStsCert"
            ? "certerror-what-should-i-do-bad-sts-cert-explanation"
            : "fp-certerror-bad-cert-what-can-you-do-body",
        dataL10nArgs: { hostname: null },
      },
      learnMore: {
        dataL10nId: "fp-learn-more-about-cert-issues",
        supportPage: "connection-not-secure",
      },
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
    bodyTitleL10nId: "problem-with-this-site-title",
    introContent: {
      dataL10nId: "fp-neterror-offline-intro",
      dataL10nArgs: { hostname: null },
    },
    descriptionParts: "connectionFailureDescription",
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    customNetError: {
      titleL10nId: "problem-with-this-site-title",
      whatCanYouDoL10nId: "fp-neterror-offline-what-can-you-do-body",
    },
    hasNoUserFix: false,
    image: "chrome://global/skin/illustrations/no-connection.svg",
  },
  {
    id: "netInterrupt",
    errorCode: "netInterrupt",
    category: "net",
    bodyTitleL10nId: "problem-with-this-site-title",
    introContent: {
      dataL10nId: "fp-neterror-offline-intro",
      dataL10nArgs: { hostname: null },
    },
    descriptionParts: "connectionFailureDescription",
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    customNetError: {
      titleL10nId: "problem-with-this-site-title",
      whatCanYouDoL10nId: "fp-neterror-offline-what-can-you-do-body",
    },
    hasNoUserFix: false,
    image: "chrome://global/skin/illustrations/no-connection.svg",
  },
  {
    id: "netTimeout",
    errorCode: "netTimeout",
    category: "net",
    bodyTitleL10nId: "problem-with-this-site-title",
    introContent: {
      dataL10nId: "fp-neterror-offline-intro",
      dataL10nArgs: { hostname: null },
    },
    descriptionParts: "connectionFailureDescription",
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    customNetError: {
      titleL10nId: "problem-with-this-site-title",
      whatCanYouDoL10nId: "fp-neterror-offline-what-can-you-do-body",
    },
    hasNoUserFix: false,
    image: "chrome://global/skin/illustrations/no-connection.svg",
  },
  {
    id: "dnsNotFound",
    errorCode: "dnsNotFound",
    category: "net",
    bodyTitleL10nId: "neterror-dns-not-found-title",
    introContent: {
      dataL10nId: "fp-neterror-offline-intro",
      dataL10nArgs: { hostname: null },
    },
    descriptionParts: "dnsNotFoundDescription",
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    customNetError: {
      titleL10nId: "neterror-dns-not-found-title",
      whatCanYouDoL10nId: "fp-neterror-offline-what-can-you-do-body",
      learnMoreL10nId: "neterror-learn-more-link",
      learnMoreSupportPage: "server-not-found-connection-problem",
    },
    hasNoUserFix: false,
    checkTrrOnly: true,
    image: "chrome://global/skin/illustrations/no-connection.svg",
  },
  {
    id: "blockedByPolicy",
    errorCode: "blockedByPolicy",
    category: "blocked",
    bodyTitleL10nId: "neterror-blocked-by-policy-page-title",
    introContent: {
      dataL10nId: "fp-neterror-offline-intro",
      dataL10nArgs: { hostname: null },
    },
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
    bodyTitleL10nId: "problem-with-this-site-title",
    introContent: {
      dataL10nId: "fp-neterror-offline-intro",
      dataL10nArgs: { hostname: null },
    },
    descriptionParts: [{ tag: "li", l10nId: "neterror-http-error-page" }],
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    customNetError: {
      titleL10nId: "problem-with-this-site-title",
      whatCanYouDoL10nId: "neterror-load-error-try-again",
    },
    hasNoUserFix: false,
    image: "chrome://global/skin/illustrations/no-connection.svg",
  },
  {
    id: "serverError",
    errorCode: "serverError",
    category: "net",
    bodyTitleL10nId: "problem-with-this-site-title",
    introContent: {
      dataL10nId: "fp-neterror-offline-intro",
      dataL10nArgs: { hostname: null },
    },
    descriptionParts: [{ tag: "li", l10nId: "neterror-load-error-try-again" }],
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    customNetError: {
      titleL10nId: "problem-with-this-site-title",
      whatCanYouDoL10nId: "neterror-load-error-try-again",
    },
    hasNoUserFix: false,
    image: "chrome://global/skin/illustrations/no-connection.svg",
  },
  {
    id: "invalidHeaderValue",
    errorCode: "invalidHeaderValue",
    category: "net",
    bodyTitleL10nId: "problem-with-this-site-title",
    introContent: {
      dataL10nId: "fp-neterror-offline-intro",
      dataL10nArgs: { hostname: null },
    },
    descriptionParts: [{ tag: "li", l10nId: "neterror-http-error-page" }],
    buttons: {
      showTryAgain: false,
      showGoBack: false,
    },
    customNetError: {
      titleL10nId: "problem-with-this-site-title",
      whatCanYouDoL10nId: "neterror-load-error-try-again",
    },
    hasNoUserFix: false,
    image: "chrome://global/skin/illustrations/no-connection.svg",
  },
  {
    id: "deniedPortAccess",
    errorCode: "deniedPortAccess",
    category: "blocked",
    bodyTitleL10nId: "deniedPortAccess-title",
    introContent: {
      dataL10nId: "fp-neterror-offline-intro",
      dataL10nArgs: { hostname: null },
    },
    descriptionParts: [],
    buttons: {
      showTryAgain: false,
      showGoBack: false,
    },
    customNetError: {
      titleL10nId: "deniedPortAccess-title",
      whatCanYouDoL10nId: "certerror-bad-cert-domain-what-can-you-do-about-it",
    },
    hasNoUserFix: true,
  },
  {
    id: "malformedURI",
    errorCode: "malformedURI",
    category: "net",
    bodyTitleL10nId: "malformedURI-title",
    introContent: {
      dataL10nId: "fp-neterror-offline-intro",
      dataL10nArgs: { hostname: null },
    },
    descriptionParts: [],
    buttons: {
      showTryAgain: false,
      showGoBack: false,
    },
    customNetError: {
      titleL10nId: "malformedURI-title",
      whatCanYouDoL10nId: "neterror-http-error-page",
    },
    hasNoUserFix: true,
  },
  {
    id: "captivePortal",
    errorCode: "captivePortal",
    category: "net",
    bodyTitleL10nId: "neterror-captive-portal-page-title",
    introContent: {
      dataL10nId: "fp-neterror-offline-intro",
      dataL10nArgs: { hostname: null },
    },
    descriptionParts: [{ tag: "p", l10nId: "neterror-captive-portal" }],
    buttons: {
      showTryAgain: false,
      showGoBack: false,
      showOpenPortal: true,
    },
    customNetError: {
      titleL10nId: "neterror-captive-portal-page-title",
      whatCanYouDoL10nId: "neterror-captive-portal",
    },
    hasNoUserFix: false,
    isCaptivePortal: true,
  },
  {
    id: "contentEncodingError",
    errorCode: "contentEncodingError",
    category: "net",
    bodyTitleL10nId: "contentEncodingError-title",
    introContent: {
      dataL10nId: "fp-neterror-offline-intro",
      dataL10nArgs: { hostname: null },
    },
    descriptionParts: [
      { tag: "li", l10nId: "neterror-content-encoding-error" },
    ],
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    customNetError: {
      titleL10nId: "contentEncodingError-title",
      whatCanYouDoL10nId: "certerror-bad-cert-domain-what-can-you-do-about-it",
    },
    hasNoUserFix: false,
  },
  {
    id: "corruptedContentErrorv2",
    errorCode: "corruptedContentErrorv2",
    category: "net",
    bodyTitleL10nId: "corruptedContentErrorv2-title",
    introContent: {
      dataL10nId: "neterror-corrupted-content-intro",
    },
    descriptionParts: [
      { tag: "p", l10nId: "neterror-corrupted-content-intro" },
      { tag: "li", l10nId: "neterror-corrupted-content-contact-website" },
    ],
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    customNetError: {
      titleL10nId: "corruptedContentErrorv2-title",
      whatCanYouDoL10nId: "certerror-bad-cert-domain-what-can-you-do-about-it",
    },
    hasNoUserFix: false,
  },
  {
    id: "fileAccessDenied",
    errorCode: "fileAccessDenied",
    category: "net",
    bodyTitleL10nId: "fileAccessDenied-title",
    introContent: {
      dataL10nId: "fp-neterror-offline-intro",
      dataL10nArgs: { hostname: null },
    },
    descriptionParts: [{ tag: "li", l10nId: "neterror-access-denied" }],
    buttons: {
      showTryAgain: false,
      showGoBack: false,
    },
    customNetError: {
      titleL10nId: "fileAccessDenied-title",
      whatCanYouDoL10nId: "certerror-bad-cert-domain-what-can-you-do-about-it",
    },
    hasNoUserFix: true,
  },
  {
    id: "fileNotFound",
    errorCode: "fileNotFound",
    category: "net",
    bodyTitleL10nId: "fileNotFound-title",
    introContent: {
      dataL10nId: "fp-neterror-offline-intro",
      dataL10nArgs: { hostname: null },
    },
    descriptionParts: [
      { tag: "li", l10nId: "neterror-file-not-found-filename" },
      { tag: "li", l10nId: "neterror-file-not-found-moved" },
    ],
    buttons: {
      showTryAgain: false,
      showGoBack: false,
    },
    customNetError: {
      titleL10nId: "fileNotFound-title",
      whatCanYouDoL10nId: "neterror-http-error-page",
    },
    hasNoUserFix: true,
  },
  {
    id: "inadequateSecurityError",
    errorCode: "inadequateSecurityError",
    category: "net",
    bodyTitleL10nId: "inadequateSecurityError-title",
    introContent: {
      dataL10nId: "neterror-inadequate-security-intro",
      dataL10nArgs: { hostname: null },
    },
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
    customNetError: {
      titleL10nId: "inadequateSecurityError-title",
      whatCanYouDoL10nId: "certerror-bad-cert-domain-what-can-you-do-about-it",
    },
    hasNoUserFix: true,
  },
  {
    id: "mitm",
    errorCode: "mitm",
    category: "cert",
    bodyTitleL10nId: "certerror-mitm-title",
    introContent: {
      dataL10nId: "fp-certerror-intro",
      dataL10nArgs: { hostname: null },
    },
    descriptionPartsResolver: "mitmDescription",
    buttons: {
      showTryAgain: false,
      showGoBack: true,
      showAdvanced: true,
    },
    advanced: {
      whyDangerous: {
        dataL10nId: "cert-error-mitm-connection",
      },
      whatCanYouDo: {
        dataL10nId: "certerror-mitm-what-can-you-do-about-it-antivirus",
      },
      learnMore: {
        dataL10nId: "fp-learn-more-about-cert-issues",
        supportPage: "connection-not-secure",
      },
    },
    hasNoUserFix: false,
    checkMitm: true,
  },
  {
    id: "netOffline",
    errorCode: "netOffline",
    category: "net",
    bodyTitleL10nId: "netOffline-title",
    introContent: {
      dataL10nId: "fp-neterror-offline-intro",
      dataL10nArgs: { hostname: null },
    },
    descriptionParts: [{ tag: "li", l10nId: "neterror-net-offline" }],
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    customNetError: {
      titleL10nId: "netOffline-title",
      whatCanYouDoL10nId: "fp-neterror-offline-what-can-you-do-body",
    },
    hasNoUserFix: false,
  },
  {
    id: "networkProtocolError",
    errorCode: "networkProtocolError",
    category: "net",
    bodyTitleL10nId: "networkProtocolError-title",
    introContent: {
      dataL10nId: "neterror-network-protocol-error-intro",
    },
    descriptionParts: [
      { tag: "p", l10nId: "neterror-network-protocol-error-intro" },
      { tag: "li", l10nId: "neterror-network-protocol-error-contact-website" },
    ],
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    customNetError: {
      titleL10nId: "networkProtocolError-title",
      whatCanYouDoL10nId: "certerror-bad-cert-domain-what-can-you-do-about-it",
    },
    hasNoUserFix: false,
  },
  {
    id: "notCached",
    errorCode: "notCached",
    category: "net",
    bodyTitleL10nId: "notCached-title",
    introContent: {
      dataL10nId: "neterror-not-cached-intro",
    },
    descriptionParts: [
      { tag: "p", l10nId: "neterror-not-cached-intro" },
      { tag: "li", l10nId: "neterror-not-cached-sensitive" },
      { tag: "li", l10nId: "neterror-not-cached-try-again" },
    ],
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    customNetError: {
      titleL10nId: "notCached-title",
      whatCanYouDoL10nId: "neterror-not-cached-try-again",
    },
    hasNoUserFix: false,
  },
  {
    id: "nssFailure2",
    errorCode: "nssFailure2",
    category: "cert",
    bodyTitleL10nId: "nssFailure2-title",
    introContent: {
      dataL10nId: "neterror-nss-failure-not-verified",
    },
    descriptionParts: [
      { tag: "li", l10nId: "neterror-nss-failure-not-verified" },
      { tag: "li", l10nId: "neterror-nss-failure-contact-website" },
    ],
    buttons: {
      showTryAgain: false,
      showGoBack: false,
      showPrefReset: true,
    },
    customNetError: {
      titleL10nId: "nssFailure2-title",
      whatCanYouDoL10nId: "certerror-bad-cert-domain-what-can-you-do-about-it",
    },
    hasNoUserFix: false,
    checkNSSFailure: true,
  },
  {
    id: "proxyConnectFailure",
    errorCode: "proxyConnectFailure",
    category: "net",
    bodyTitleL10nId: "proxyConnectFailure-title",
    introContent: {
      dataL10nId: "fp-neterror-offline-intro",
      dataL10nArgs: { hostname: null },
    },
    descriptionParts: [
      { tag: "li", l10nId: "neterror-proxy-connect-failure-settings" },
      { tag: "li", l10nId: "neterror-proxy-connect-failure-contact-admin" },
    ],
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    customNetError: {
      titleL10nId: "proxyConnectFailure-title",
      whatCanYouDoL10nId: "neterror-proxy-connect-failure-contact-admin",
    },
    hasNoUserFix: false,
  },
  {
    id: "proxyResolveFailure",
    errorCode: "proxyResolveFailure",
    category: "net",
    bodyTitleL10nId: "proxyResolveFailure-title",
    introContent: {
      dataL10nId: "fp-neterror-offline-intro",
      dataL10nArgs: { hostname: null },
    },
    descriptionParts: [
      { tag: "li", l10nId: "neterror-proxy-resolve-failure-settings" },
      { tag: "li", l10nId: "neterror-proxy-resolve-failure-connection" },
      { tag: "li", l10nId: "neterror-proxy-resolve-failure-firewall" },
    ],
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    customNetError: {
      titleL10nId: "proxyResolveFailure-title",
      whatCanYouDoL10nId: "fp-neterror-offline-what-can-you-do-body",
    },
    hasNoUserFix: false,
  },
  {
    id: "redirectLoop",
    errorCode: "redirectLoop",
    category: "net",
    bodyTitleL10nId: "redirectLoop-title",
    introContent: {
      dataL10nId: "fp-neterror-offline-intro",
      dataL10nArgs: { hostname: null },
    },
    descriptionParts: [{ tag: "li", l10nId: "neterror-redirect-loop" }],
    buttons: {
      showTryAgain: true,
      showGoBack: false,
    },
    customNetError: {
      titleL10nId: "redirectLoop-title",
      whatCanYouDoL10nId: "neterror-load-error-try-again",
    },
    hasNoUserFix: false,
  },
  {
    id: "sslv3Used",
    errorCode: "sslv3Used",
    category: "cert",
    bodyTitleL10nId: "sslv3Used-title",
    introContent: {
      dataL10nId: "fp-certerror-intro",
      dataL10nArgs: { hostname: null },
    },
    descriptionParts: [{ tag: "span", l10nId: "neterror-sslv3-used" }],
    buttons: {
      showTryAgain: false,
      showGoBack: false,
    },
    customNetError: {
      titleL10nId: "sslv3Used-title",
      whatCanYouDoL10nId: "certerror-bad-cert-domain-what-can-you-do-about-it",
    },
    hasNoUserFix: true,
  },
  {
    id: "unknownProtocolFound",
    errorCode: "unknownProtocolFound",
    category: "net",
    bodyTitleL10nId: "unknownProtocolFound-title",
    introContent: {
      dataL10nId: "fp-neterror-offline-intro",
      dataL10nArgs: { hostname: null },
    },
    descriptionParts: [{ tag: "li", l10nId: "neterror-unknown-protocol" }],
    buttons: {
      showTryAgain: false,
      showGoBack: false,
    },
    customNetError: {
      titleL10nId: "unknownProtocolFound-title",
      whatCanYouDoL10nId: "neterror-unknown-protocol",
    },
    hasNoUserFix: true,
  },
  {
    id: "unknownSocketType",
    errorCode: "unknownSocketType",
    category: "net",
    bodyTitleL10nId: "unknownSocketType-title",
    introContent: {
      dataL10nId: "fp-neterror-offline-intro",
      dataL10nArgs: { hostname: null },
    },
    descriptionParts: [
      { tag: "li", l10nId: "neterror-unknown-socket-type-client-config" },
    ],
    buttons: {
      showTryAgain: false,
      showGoBack: false,
    },
    customNetError: {
      titleL10nId: "unknownSocketType-title",
      whatCanYouDoL10nId: "certerror-bad-cert-domain-what-can-you-do-about-it",
    },
    hasNoUserFix: true,
  },
  {
    id: "unsafeContentType",
    errorCode: "unsafeContentType",
    category: "net",
    bodyTitleL10nId: "unsafeContentType-title",
    introContent: {
      dataL10nId: "fp-neterror-offline-intro",
      dataL10nArgs: { hostname: null },
    },
    descriptionParts: [{ tag: "li", l10nId: "neterror-unsafe-content-type" }],
    buttons: {
      showTryAgain: false,
      showGoBack: false,
    },
    customNetError: {
      titleL10nId: "unsafeContentType-title",
      whatCanYouDoL10nId: "certerror-bad-cert-domain-what-can-you-do-about-it",
    },
    hasNoUserFix: true,
  },
  {
    id: "cspBlocked",
    errorCode: "cspBlocked",
    category: "blocked",
    bodyTitleL10nId: "csp-xfo-error-title",
    introContent: {
      dataL10nId: "csp-xfo-blocked-long-desc",
      dataL10nArgs: { hostname: null },
    },
    buttons: {
      showTryAgain: false,
      showGoBack: false,
    },
    customNetError: {
      titleL10nId: "csp-xfo-error-title",
      whatCanYouDoL10nId: "csp-xfo-blocked-long-desc",
      whatCanYouDoL10nArgs: { hostname: null },
    },
    hasNoUserFix: true,
  },
  {
    id: "xfoBlocked",
    errorCode: "xfoBlocked",
    category: "blocked",
    bodyTitleL10nId: "csp-xfo-error-title",
    introContent: {
      dataL10nId: "csp-xfo-blocked-long-desc",
      dataL10nArgs: { hostname: null },
    },
    buttons: {
      showTryAgain: false,
      showGoBack: false,
    },
    customNetError: {
      titleL10nId: "csp-xfo-error-title",
      whatCanYouDoL10nId: "csp-xfo-blocked-long-desc",
      whatCanYouDoL10nArgs: { hostname: null },
    },
    hasNoUserFix: true,
  },
];

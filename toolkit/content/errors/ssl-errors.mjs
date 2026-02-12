/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * SSL/TLS error configurations (SSL_ERROR_* codes).
 * These errors relate to TLS handshake and protocol issues.
 */

export const SSL_ERRORS = [
  {
    id: "SSL_ERROR_BAD_CERT_DOMAIN",
    errorCode: "SSL_ERROR_BAD_CERT_DOMAIN",
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
      whyDangerousL10nId: "fp-certerror-bad-domain-why-dangerous-body",
      whyDangerousL10nArgs: { hostname: null, validHosts: null },
      whatCanYouDoL10nId: "fp-certerror-bad-domain-what-can-you-do-body",
      learnMoreL10nId: "fp-learn-more-about-secure-connection-failures",
      learnMoreSupportPage: "connection-not-secure",
      showViewCertificate: true,
      showDateTime: true,
      requiresDomainMismatchNames: true,
    },
    hasNoUserFix: false,
  },
  {
    id: "SSL_ERROR_NO_CYPHER_OVERLAP",
    errorCode: "SSL_ERROR_NO_CYPHER_OVERLAP",
    category: "cert",
    introContent: {
      id: "fp-neterror-connection-intro",
      args: { hostname: null },
    },
    buttons: {
      showTryAgain: false,
      showGoBack: true,
      showAdvanced: true,
      showAddException: false,
      showPrefReset: true,
    },
    advanced: {
      whyDangerousL10nId: "fp-neterror-cypher-overlap-why-dangerous-body",
      whatCanYouDoL10nId: "fp-neterror-cypher-overlap-what-can-you-do-body",
      learnMoreL10nId: "fp-learn-more-about-secure-connection-failures",
      learnMoreSupportPage: "connection-not-secure",
    },
    hasNoUserFix: false,
    checkNSSFailure: true,
  },
  {
    id: "SSL_ERROR_RX_MALFORMED_HANDSHAKE",
    errorCode: "SSL_ERROR_RX_MALFORMED_HANDSHAKE",
    category: "cert",
    introContent: [
      {
        id: "cert-error-ssl-connection-error",
        args: { hostname: null, errorMessage: null },
      },
      {
        id: "ssl-error-rx-malformed-handshake",
      },
    ],
    buttons: {
      showTryAgain: true,
      showGoBack: true,
      showAdvanced: true,
      showAddException: false,
    },
    advanced: {
      whyDangerousL10nId: "neterror-nss-failure-not-verified",
      whatCanYouDoL10nId: "neterror-nss-failure-contact-website",
      learnMoreL10nId: "fp-learn-more-about-secure-connection-failures",
      learnMoreSupportPage: "connection-not-secure",
    },
    hasNoUserFix: true,
  },
  {
    id: "SSL_ERROR_UNSUPPORTED_VERSION",
    errorCode: "SSL_ERROR_UNSUPPORTED_VERSION",
    category: "cert",
    bodyTitleL10nId: "nssFailure2-title",
    introContent: [
      {
        id: "cert-error-ssl-connection-error",
        args: { hostname: null, errorMessage: null },
      },
      {
        id: "ssl-error-unsupported-version",
      },
    ],
    buttons: {
      showTryAgain: true,
      showGoBack: true,
      showAdvanced: true,
      showAddException: false,
    },
    advanced: {
      whyDangerousL10nId: "neterror-nss-failure-not-verified",
      whatCanYouDoL10nId: "neterror-nss-failure-contact-website",
      learnMoreL10nId: "fp-learn-more-about-secure-connection-failures",
      learnMoreSupportPage: "connection-not-secure",
    },
    hasNoUserFix: true,
  },
  {
    id: "SSL_ERROR_PROTOCOL_VERSION_ALERT",
    errorCode: "SSL_ERROR_PROTOCOL_VERSION_ALERT",
    category: "cert",
    bodyTitleL10nId: "nssFailure2-title",
    introContent: [
      {
        id: "cert-error-ssl-connection-error",
        args: { hostname: null, errorMessage: null },
      },
      {
        id: "ssl-error-protocol-version-alert",
      },
    ],
    buttons: {
      showTryAgain: true,
      showGoBack: true,
      showAdvanced: true,
      showAddException: false,
    },
    advanced: {
      whyDangerousL10nId: "neterror-nss-failure-not-verified",
      whatCanYouDoL10nId: "neterror-nss-failure-contact-website",
      learnMoreL10nId: "fp-learn-more-about-secure-connection-failures",
      learnMoreSupportPage: "connection-not-secure",
    },
    hasNoUserFix: true,
  },
];

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Certificate error configurations (SEC_ERROR_* codes).
 * These errors relate to certificate validation issues.
 */

export const CERT_ERRORS = [
  {
    id: "SEC_ERROR_UNKNOWN_ISSUER",
    errorCode: "SEC_ERROR_UNKNOWN_ISSUER",
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
      whyDangerousL10nId: "fp-certerror-unknown-issuer-why-dangerous-body",
      whatCanYouDoL10nId: "fp-certerror-unknown-issuer-what-can-you-do-body",
      learnMoreL10nId: "fp-learn-more-about-cert-issues",
      learnMoreSupportPage: "connection-not-secure",
      showViewCertificate: true,
      showDateTime: true,
    },
    hasNoUserFix: false,
    checkMitm: true,
  },
  {
    id: "SEC_ERROR_UNTRUSTED_ISSUER",
    errorCode: "SEC_ERROR_UNTRUSTED_ISSUER",
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
      whyDangerousL10nId: "fp-certerror-untrusted-issuer-why-dangerous-body",
      whyDangerousL10nArgs: { hostname: null },
      whatCanYouDoL10nId: "fp-certerror-untrusted-issuer-what-can-you-do-body",
      learnMoreL10nId: "fp-learn-more-about-cert-issues",
      learnMoreSupportPage: "connection-not-secure",
      showViewCertificate: true,
    },
    hasNoUserFix: true,
  },
  {
    id: "SEC_ERROR_EXPIRED_CERTIFICATE",
    errorCode: "SEC_ERROR_EXPIRED_CERTIFICATE",
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
        const { errorInfo } = context;
        const isNotYetValid =
          errorInfo?.validNotBefore && Date.now() < errorInfo?.validNotBefore;
        return errorInfo
          ? {
              id: "fp-certerror-expired-why-dangerous-body",
              args: {
                date: isNotYetValid
                  ? errorInfo.validNotBefore
                  : errorInfo.validNotAfter,
              },
            }
          : null;
      },
      whatCanYouDoL10nId: "fp-certerror-expired-what-can-you-do-body",
      whatCanYouDoL10nArgs: { date: null },
      learnMoreL10nId: "fp-learn-more-about-time-related-errors",
      learnMoreSupportPage: "time-errors",
      showViewCertificate: true,
      showDateTime: true,
    },
    hasNoUserFix: false,
    checkClockSkew: true,
  },
  {
    id: "SEC_ERROR_EXPIRED_ISSUER_CERTIFICATE",
    errorCode: "SEC_ERROR_EXPIRED_ISSUER_CERTIFICATE",
    category: "cert",
    introContent: {
      id: "fp-certerror-expired-into",
      args: { hostname: null },
    },
    buttons: {
      showTryAgain: false,
      showGoBack: true,
      showAdvanced: true,
      showAddException: true,
    },
    advanced: {
      whyDangerousResolver: context =>
        context.errorInfo
          ? {
              id: "fp-certerror-expired-why-dangerous-body",
              args: { date: context.errorInfo.validNotAfter },
            }
          : null,
      whyDangerousL10nId: "fp-certerror-expired-why-dangerous-body",
      whyDangerousL10nArgs: { date: null },
      whatCanYouDoL10nId: "fp-certerror-expired-what-can-you-do-body",
      whatCanYouDoL10nArgs: { date: null },
      learnMoreL10nId: "fp-learn-more-about-time-related-errors",
      learnMoreSupportPage: "time-errors",
      showViewCertificate: true,
      showDateTime: true,
    },
    hasNoUserFix: false,
  },
  {
    id: "SEC_ERROR_REVOKED_CERTIFICATE",
    errorCode: "SEC_ERROR_REVOKED_CERTIFICATE",
    category: "cert",
    introContent: {
      id: "fp-certerror-intro",
      args: { hostname: null },
    },
    buttons: {
      showTryAgain: false,
      showGoBack: true,
      showAdvanced: true,
      showAddException: false,
    },
    advanced: {
      whyDangerousL10nId: "fp-certerror-revoked-why-dangerous-body",
      whyDangerousL10nArgs: { hostname: null },
      whatCanYouDoL10nId: "fp-certerror-revoked-what-can-you-do-body",
      learnMoreL10nId: "fp-learn-more-about-cert-issues",
      learnMoreSupportPage: "connection-not-secure",
      showViewCertificate: true,
    },
    hasNoUserFix: true,
  },
  // NSS errors with no user fix - these use the error code as the l10n ID
  {
    id: "SEC_ERROR_BAD_DER",
    errorCode: "SEC_ERROR_BAD_DER",
    category: "cert",
    introContent: {
      id: "fp-certerror-intro",
      args: { hostname: null },
    },
    buttons: {
      showTryAgain: false,
      showGoBack: true,
      showAdvanced: true,
      showAddException: false,
    },
    advanced: {
      titleL10nId: "fp-certerror-body-title",
      whyDangerousL10nId: "sec-error-bad-der",
    },
    hasNoUserFix: true,
  },
  {
    id: "SEC_ERROR_BAD_SIGNATURE",
    errorCode: "SEC_ERROR_BAD_SIGNATURE",
    category: "cert",
    introContent: {
      id: "fp-certerror-intro",
      args: { hostname: null },
    },
    buttons: {
      showTryAgain: false,
      showGoBack: true,
      showAdvanced: true,
      showAddException: false,
    },
    advanced: {
      titleL10nId: "fp-certerror-body-title",
      whyDangerousL10nId: "sec-error-bad-signature",
    },
    hasNoUserFix: true,
  },
  {
    id: "SEC_ERROR_CERT_NOT_IN_NAME_SPACE",
    errorCode: "SEC_ERROR_CERT_NOT_IN_NAME_SPACE",
    category: "cert",
    introContent: {
      id: "fp-certerror-intro",
      args: { hostname: null },
    },
    buttons: {
      showTryAgain: false,
      showGoBack: true,
      showAdvanced: true,
      showAddException: false,
    },
    advanced: {
      titleL10nId: "fp-certerror-body-title",
      whyDangerousL10nId: "sec-error-cert-not-in-name-space",
    },
    hasNoUserFix: true,
  },
  {
    id: "SEC_ERROR_EXTENSION_VALUE_INVALID",
    errorCode: "SEC_ERROR_EXTENSION_VALUE_INVALID",
    category: "cert",
    introContent: {
      id: "fp-certerror-intro",
      args: { hostname: null },
    },
    buttons: {
      showTryAgain: false,
      showGoBack: true,
      showAdvanced: true,
      showAddException: false,
    },
    advanced: {
      titleL10nId: "fp-certerror-body-title",
      whyDangerousL10nId: "sec-error-extension-value-invalid",
    },
    hasNoUserFix: true,
  },
  {
    id: "SEC_ERROR_INADEQUATE_CERT_TYPE",
    errorCode: "SEC_ERROR_INADEQUATE_CERT_TYPE",
    category: "cert",
    introContent: {
      id: "fp-certerror-intro",
      args: { hostname: null },
    },
    buttons: {
      showTryAgain: false,
      showGoBack: true,
      showAdvanced: true,
      showAddException: false,
    },
    advanced: {
      titleL10nId: "fp-certerror-body-title",
      whyDangerousL10nId: "sec-error-inadequate-cert-type",
    },
    hasNoUserFix: true,
  },
  {
    id: "SEC_ERROR_INADEQUATE_KEY_USAGE",
    errorCode: "SEC_ERROR_INADEQUATE_KEY_USAGE",
    category: "cert",
    introContent: {
      id: "fp-certerror-intro",
      args: { hostname: null },
    },
    buttons: {
      showTryAgain: false,
      showGoBack: true,
      showAdvanced: true,
      showAddException: false,
    },
    advanced: {
      titleL10nId: "fp-certerror-body-title",
      whyDangerousL10nId: "sec-error-inadequate-key-usage",
    },
    hasNoUserFix: true,
  },
  {
    id: "SEC_ERROR_INVALID_KEY",
    errorCode: "SEC_ERROR_INVALID_KEY",
    category: "cert",
    introContent: {
      id: "fp-certerror-intro",
      args: { hostname: null },
    },
    buttons: {
      showTryAgain: false,
      showGoBack: true,
      showAdvanced: true,
      showAddException: false,
    },
    advanced: {
      titleL10nId: "fp-certerror-body-title",
      whyDangerousL10nId: "sec-error-invalid-key",
    },
    hasNoUserFix: true,
  },
  {
    id: "SEC_ERROR_PATH_LEN_CONSTRAINT_INVALID",
    errorCode: "SEC_ERROR_PATH_LEN_CONSTRAINT_INVALID",
    category: "cert",
    introContent: {
      id: "fp-certerror-intro",
      args: { hostname: null },
    },
    buttons: {
      showTryAgain: false,
      showGoBack: true,
      showAdvanced: true,
      showAddException: false,
    },
    advanced: {
      titleL10nId: "fp-certerror-body-title",
      whyDangerousL10nId: "sec-error-path-len-constraint-invalid",
    },
    hasNoUserFix: true,
  },
  {
    id: "SEC_ERROR_UNKNOWN_CRITICAL_EXTENSION",
    errorCode: "SEC_ERROR_UNKNOWN_CRITICAL_EXTENSION",
    category: "cert",
    introContent: {
      id: "fp-certerror-intro",
      args: { hostname: null },
    },
    buttons: {
      showTryAgain: false,
      showGoBack: true,
      showAdvanced: true,
      showAddException: false,
    },
    advanced: {
      titleL10nId: "fp-certerror-body-title",
      whyDangerousL10nId: "sec-error-unknown-critical-extension",
    },
    hasNoUserFix: true,
  },
  {
    id: "SEC_ERROR_UNSUPPORTED_EC_POINT_FORM",
    errorCode: "SEC_ERROR_UNSUPPORTED_EC_POINT_FORM",
    category: "cert",
    introContent: {
      id: "fp-certerror-intro",
      args: { hostname: null },
    },
    buttons: {
      showTryAgain: false,
      showGoBack: true,
      showAdvanced: true,
      showAddException: false,
    },
    advanced: {
      titleL10nId: "fp-certerror-body-title",
      whyDangerousL10nId: "sec-error-unsupported-ec-point-form",
    },
    hasNoUserFix: true,
  },
  {
    id: "SEC_ERROR_UNSUPPORTED_ELLIPTIC_CURVE",
    errorCode: "SEC_ERROR_UNSUPPORTED_ELLIPTIC_CURVE",
    category: "cert",
    introContent: {
      id: "fp-certerror-intro",
      args: { hostname: null },
    },
    buttons: {
      showTryAgain: false,
      showGoBack: true,
      showAdvanced: true,
      showAddException: false,
    },
    advanced: {
      titleL10nId: "fp-certerror-body-title",
      whyDangerousL10nId: "sec-error-unsupported-elliptic-curve",
    },
    hasNoUserFix: true,
  },
  {
    id: "SEC_ERROR_UNSUPPORTED_KEYALG",
    errorCode: "SEC_ERROR_UNSUPPORTED_KEYALG",
    category: "cert",
    introContent: {
      id: "fp-certerror-intro",
      args: { hostname: null },
    },
    buttons: {
      showTryAgain: false,
      showGoBack: true,
      showAdvanced: true,
      showAddException: false,
    },
    advanced: {
      titleL10nId: "fp-certerror-body-title",
      whyDangerousL10nId: "sec-error-unsupported-keyalg",
    },
    hasNoUserFix: true,
  },
  {
    id: "SEC_ERROR_UNTRUSTED_CERT",
    errorCode: "SEC_ERROR_UNTRUSTED_CERT",
    category: "cert",
    pageTitleL10nId: "certerror-page-title",
    bodyTitleL10nId: "nssBadCert-title",
    introContent: {
      id: "fp-certerror-intro",
      args: { hostname: null },
    },
    buttons: {
      showTryAgain: false,
      showGoBack: true,
      showAdvanced: true,
      showAddException: false,
    },
    advanced: {
      titleL10nId: "fp-certerror-body-title",
      whyDangerousL10nId: "sec-error-untrusted-cert",
    },
    hasNoUserFix: true,
  },
  {
    id: "SEC_ERROR_CERT_SIGNATURE_ALGORITHM_DISABLED",
    errorCode: "SEC_ERROR_CERT_SIGNATURE_ALGORITHM_DISABLED",
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
      whyDangerousL10nId: "cert-error-trust-signature-algorithm-disabled",
      whatCanYouDoL10nId: "fp-certerror-revoked-what-can-you-do-body",
      learnMoreL10nId: "fp-learn-more-about-secure-connection-failures",
      learnMoreSupportPage: "connection-not-secure",
      showViewCertificate: true,
    },
    hasNoUserFix: false,
  },
];

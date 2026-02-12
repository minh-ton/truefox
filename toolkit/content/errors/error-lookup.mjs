/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Utilities for looking up error configurations and resolving dynamic content.
 *
 * Some error configurations require runtime data (e.g., hostname, certificate
 * validity dates, connectivity status). This module provides resolver functions
 * that inject runtime context into static configurations.
 */

import { getErrorConfig } from "chrome://global/content/errors/error-registry.mjs";

/**
 * Find the supported error id for the given error info.
 * Handles NS_ERROR_* to URL parameter id mappings and offline state.
 *
 * @param {object} errorInfo - Error info from document.getFailedCertSecurityInfo() or getNetErrorInfo()
 * @param {string} gErrorCode - The URL parameter error code
 * @param {boolean} isOffline - Whether the browser is offline
 * @returns {string|null} The supported error id, or null if not supported
 */
export function findSupportedErrorCode(errorInfo, gErrorCode, isOffline) {
  const defaultId = errorInfo?.errorCodeString || gErrorCode;
  if (isOffline && isFeltPrivacySupported("NS_ERROR_OFFLINE")) {
    return "NS_ERROR_OFFLINE";
  }
  return isFeltPrivacySupported(defaultId) || null;
}

/**
 * Check if an error has no action the user can take to fix it.
 *
 * @param {string} id - The error id to check
 * @returns {boolean} True if the error has no user fix
 */
export function errorHasNoUserFix(id) {
  const config = getErrorConfig(id);
  return config ? config.hasNoUserFix === true : false;
}

/**
 * Check if an error is supported by the Felt Privacy v1 experience.
 *
 * @param {string} id - The error id to check
 * @returns {boolean} True if the error does not use legacy rendering
 */
export function isFeltPrivacySupported(id) {
  const config = getErrorConfig(id);
  return config ? !config.useLegacy : false;
}

/**
 * Resolve l10n arguments by injecting runtime context.
 *
 * @param {object | null} l10nConfig - The l10n config with { id, args }
 * @param {object} context - Runtime context (hostname, errorInfo, etc.)
 * @returns {object | null} Resolved l10n config with args filled in
 */
export function resolveL10nArgs(l10nConfig, context) {
  const values = {
    hostname: context.hostname,
    date: context.errorInfo?.validNotAfter ?? Date.now(),
    errorMessage: context.errorInfo?.errorMessage ?? "",
  };
  if (!l10nConfig) {
    return null;
  }

  if (Array.isArray(l10nConfig)) {
    const result = [];
    for (const conf of l10nConfig) {
      const resolvedArgs = { ...conf.args };
      for (const [key, value] of Object.entries(resolvedArgs)) {
        if (value === null) {
          resolvedArgs[key] = values[key];
        }
      }
      result.push({ id: conf.id, args: resolvedArgs });
    }
    return result;
  }

  if (!l10nConfig.args) {
    return l10nConfig;
  }

  const resolvedArgs = { ...l10nConfig.args };

  for (const [key, value] of Object.entries(resolvedArgs)) {
    if (value === null) {
      resolvedArgs[key] = values[key];
    }
  }

  return {
    id: l10nConfig.id,
    args: resolvedArgs,
  };
}

/**
 * Resolve description parts by calling resolver functions for dynamic content.
 *
 * @param {Array|string} descriptionParts - Static parts array or resolver name
 * @param {object} context - Runtime context
 * @returns {Array} Resolved description parts
 */
export function resolveDescriptionParts(descriptionParts, context) {
  if (!descriptionParts) {
    return [];
  }

  if (typeof descriptionParts === "string") {
    // It's a resolver name - call the resolver
    const resolver = DESCRIPTION_RESOLVERS[descriptionParts];
    if (resolver) {
      return resolver(context);
    }
    return [];
  }

  // Static parts - resolve any l10n args
  return descriptionParts.map(part => {
    if (part.l10nArgs) {
      return {
        ...part,
        l10nArgs: resolveL10nArgs({ args: part.l10nArgs }, context)?.args,
      };
    }
    return part;
  });
}

/**
 * Resolver functions for dynamic description content.
 * These handle cases where description varies based on runtime state.
 */
const DESCRIPTION_RESOLVERS = {
  dnsNotFoundDescription(context) {
    if (context.noConnectivity) {
      return [
        { tag: "span", l10nId: "neterror-dns-not-found-offline-hint-header" },
        {
          tag: "li",
          l10nId: "neterror-dns-not-found-offline-hint-different-device",
        },
        { tag: "li", l10nId: "neterror-dns-not-found-offline-hint-modem" },
        { tag: "li", l10nId: "neterror-dns-not-found-offline-hint-reconnect" },
      ];
    }
    return [
      { tag: "span", l10nId: "neterror-dns-not-found-hint-header" },
      { tag: "li", l10nId: "neterror-dns-not-found-hint-try-again" },
      { tag: "li", l10nId: "neterror-dns-not-found-hint-check-network" },
      { tag: "li", l10nId: "neterror-dns-not-found-hint-firewall" },
    ];
  },

  connectionFailureDescription(context) {
    const parts = [
      { tag: "li", l10nId: "neterror-load-error-try-again" },
      { tag: "li", l10nId: "neterror-load-error-connection" },
      { tag: "li", l10nId: "neterror-load-error-firewall" },
    ];
    if (context.showOSXPermissionWarning) {
      parts.push({ tag: "li", l10nId: "neterror-load-osx-permission" });
    }
    return parts;
  },

  mitmDescription(context) {
    const { hostname, mitmName } = context;
    return [
      {
        tag: "span",
        l10nId: "certerror-mitm",
        l10nArgs: { hostname, mitm: mitmName || "" },
      },
    ];
  },
};

/**
 * Resolve the advanced section configuration.
 *
 * @param {object | null} advancedConfig - The advanced section config
 * @param {object} context - Runtime context
 * @returns {object | null} Resolved advanced config
 */
export function resolveAdvancedConfig(advancedConfig, context) {
  if (!advancedConfig) {
    return null;
  }

  const resolved = { ...advancedConfig };

  // Handle resolver for whyDangerous
  if (advancedConfig.whyDangerousResolver) {
    resolved.whyDangerous = advancedConfig.whyDangerousResolver(context);
    delete resolved.whyDangerousResolver;
  } else if (advancedConfig.whyDangerous) {
    resolved.whyDangerous = resolveL10nArgs(
      advancedConfig.whyDangerous,
      context
    );
  }

  // Handle resolver for whatCanYouDo
  if (advancedConfig.whatCanYouDoResolver) {
    resolved.whatCanYouDo = advancedConfig.whatCanYouDoResolver?.(context);
    delete resolved.whatCanYouDoResolver;
  } else if (advancedConfig.whatCanYouDo) {
    resolved.whatCanYouDo = resolveL10nArgs(
      advancedConfig.whatCanYouDo,
      context
    );
  }

  return resolved;
}

/**
 * Get a fully resolved error configuration with runtime context applied.
 *
 * @param {string} id - The error id to look up
 * @param {object} context - Runtime context { hostname, errorInfo, noConnectivity, showOSXPermissionWarning }
 * @returns {object} Fully resolved error configuration
 */
export function getResolvedErrorConfig(id, context, gOffline) {
  id = gOffline ? "NS_ERROR_OFFLINE" : id;
  const baseConfig = getErrorConfig(id);

  return baseConfig
    ? {
        ...baseConfig,
        introContent: resolveL10nArgs(baseConfig.introContent, context),
        shortDescription: resolveL10nArgs(baseConfig.shortDescription, context),
        descriptionParts: resolveDescriptionParts(
          baseConfig.descriptionParts,
          context
        ),
        advanced: resolveAdvancedConfig(baseConfig.advanced, context),
      }
    : {};
}

// Export resolvers for testing
export const _testOnlyResolvers = {
  description: DESCRIPTION_RESOLVERS,
};

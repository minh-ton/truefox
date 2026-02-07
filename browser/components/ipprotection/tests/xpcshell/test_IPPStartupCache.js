/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { IPPStartupCacheSingleton } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPPStartupCache.sys.mjs"
);

/**
 * Test the disabled cache
 */
add_task(async function test_IPPStartupCache_disabled() {
  // By default the cache is not active.
  Services.prefs.setBoolPref("browser.ipProtection.cacheDisabled", true);
  const cache = new IPPStartupCacheSingleton();
  cache.init();

  Assert.ok(
    cache.isStartupCompleted,
    "In XPCShell mode the cache is not active"
  );
});

/**
 * Test the enabled cache
 */
add_task(async function test_IPPStartupCache_enabled() {
  // By default the cache is not active.
  Services.prefs.setBoolPref("browser.ipProtection.cacheDisabled", false);

  // Default state is UNINITIALIZED
  {
    const cache = new IPPStartupCacheSingleton();
    cache.init();

    Assert.ok(
      !cache.isStartupCompleted,
      "In XPCShell mode the cache is active"
    );
    Assert.equal(
      cache.state,
      IPProtectionStates.UNINITIALIZED,
      "The state is unitialized"
    );
  }

  // Fetch the cached state
  {
    Services.prefs.setCharPref(
      "browser.ipProtection.stateCache",
      IPProtectionStates.READY
    );

    const cache = new IPPStartupCacheSingleton();
    cache.init();

    Assert.ok(
      !cache.isStartupCompleted,
      "In XPCShell mode the cache is active"
    );
    Assert.equal(cache.state, IPProtectionStates.READY, "The state is READY");
  }

  // Invalid cache means UNINITIALIZED
  {
    Services.prefs.setCharPref(
      "browser.ipProtection.stateCache",
      "Hello World!"
    );

    const cache = new IPPStartupCacheSingleton();
    cache.init();

    Assert.ok(
      !cache.isStartupCompleted,
      "In XPCShell mode the cache is active"
    );
    Assert.equal(
      cache.state,
      IPProtectionStates.UNINITIALIZED,
      "The state is unitialized"
    );
  }
});

/**
 * Cache the entitlement
 */
add_task(async function test_IPPStartupCache_enabled() {
  Services.prefs.setBoolPref("browser.ipProtection.cacheDisabled", false);

  // Default entitlement is null
  {
    const cache = new IPPStartupCacheSingleton();
    cache.init();

    Assert.ok(
      !cache.isStartupCompleted,
      "In XPCShell mode the cache is active"
    );
    Assert.equal(cache.entitlement, null, "Null entitlement");
  }

  // Store and retrieve a valid entitlement
  {
    const originalEntitlement = new Entitlement({
      autostart: true,
      created_at: "2024-01-15T10:30:00.000Z",
      limited_bandwidth: false,
      location_controls: true,
      subscribed: true,
      uid: 12345,
      website_inclusion: false,
      maxBytes: "1000000000",
    });

    const cache = new IPPStartupCacheSingleton();
    cache.init();

    Assert.ok(
      !cache.isStartupCompleted,
      "In XPCShell mode the cache is active"
    );

    cache.storeEntitlement(originalEntitlement);

    const storedPref = Services.prefs.getCharPref(
      "browser.ipProtection.entitlementCache",
      ""
    );
    Assert.greater(storedPref.length, 0, "The cache is correctly stored");

    const retrievedEntitlement = cache.entitlement;
    Assert.notEqual(
      retrievedEntitlement,
      null,
      "Retrieved entitlement is not null"
    );

    for (const key of Object.keys(originalEntitlement)) {
      const expected = originalEntitlement[key];
      const actual = retrievedEntitlement[key];
      if (typeof expected === "bigint") {
        Assert.equal(actual.toString(), expected.toString(), `${key} matches`);
      } else if (key === "created_at") {
        Assert.equal(
          actual.toISOString(),
          expected.toISOString(),
          `${key} matches`
        );
      } else {
        Assert.equal(actual, expected, `${key} matches`);
      }
    }
  }

  // Invalid JSON returns null
  {
    Services.prefs.setCharPref(
      "browser.ipProtection.entitlementCache",
      '{"invalid json}}}}'
    );

    const cache = new IPPStartupCacheSingleton();
    cache.init();

    Assert.ok(
      !cache.isStartupCompleted,
      "In XPCShell mode the cache is active"
    );
    Assert.equal(cache.entitlement, null, "Invalid JSON returns null");
  }

  // Storing non-Entitlement objects throws
  {
    const cache = new IPPStartupCacheSingleton();
    cache.init();

    Assert.ok(
      !cache.isStartupCompleted,
      "In XPCShell mode the cache is active"
    );

    Assert.throws(
      () => cache.storeEntitlement(42),
      /Error/,
      "Storing a number should throw"
    );

    Assert.throws(
      () => cache.storeEntitlement({ a: 42 }),
      /Error/,
      "Storing arbitrary object should throw"
    );
  }
});

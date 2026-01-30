/*
 * Tests for network.http.dictionaries.disabled_origins preference
 * - Verify dictionaries are not stored for disabled origins
 * - Verify dictionaries are not used for disabled origins
 * - Verify runtime pref changes remove cached entries
 */

"use strict";

Services.scriptloader.loadSubScript("resource://test/head_cache.js", this);

const { NodeHTTPSServer } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

var server = null;
const dictContent = "DICTIONARY_DATA";
const resourcePath = "/resource";
const dictPath = "/dict";

function makeChan(url) {
  let chan = NetUtil.newChannel({
    uri: url,
    loadUsingSystemPrincipal: true,
    contentPolicyType: Ci.nsIContentPolicy.TYPE_DOCUMENT,
  }).QueryInterface(Ci.nsIHttpChannel);
  return chan;
}

function channelOpenPromise(chan) {
  return new Promise(resolve => {
    function finish(req, buffer) {
      resolve([req, buffer]);
    }
    chan.asyncOpen(new ChannelListener(finish, null, CL_ALLOW_UNKNOWN_CL));
  });
}

function serveDictionary(request, response) {
  const dictContent = "DICTIONARY_DATA";
  response.writeHead(200, {
    "Content-Type": "application/octet-stream",
    "Use-As-Dictionary": `match="*", id="dict1", type=raw`,
    "Cache-Control": "max-age=3600",
  });
  response.end(dictContent, "binary");
}

function serveResource(request, response) {
  const compressedContent =
    "\xff\x44\x43\x42" +
    "12345678901234567890123456789012" +
    "\x21\x38\x00\x04COMPRESSED_DATA\x03";
  let availDict = request.headers["available-dictionary"];
  if (availDict != undefined) {
    response.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "dcb",
    });
    response.end(compressedContent, "binary");
  } else {
    response.writeHead(200, {
      "Content-Type": "application/octet-stream",
    });
    response.end("UNCOMPRESSED_DATA", "binary");
  }
}

add_setup(async function () {
  Services.prefs.setBoolPref("network.http.dictionaries.enable", true);
  Services.prefs.setStringPref(
    "network.http.dictionaries.disabled_origins",
    ""
  );

  if (!server) {
    server = new NodeHTTPSServer();
    await server.start();
    registerCleanupFunction(async () => {
      await server.stop();
      Services.prefs.clearUserPref(
        "network.http.dictionaries.disabled_origins"
      );
    });

    await server.registerPathHandler(dictPath, serveDictionary);
    await server.registerPathHandler(resourcePath, serveResource);
  }
});

// Test that dictionaries work normally when origin is not disabled
add_task(async function test_dictionary_works_when_not_disabled() {
  Services.prefs.setStringPref(
    "network.http.dictionaries.disabled_origins",
    ""
  );

  // Fetch the dictionary
  let dictUri = `${server.origin()}${dictPath}`;
  let chan = makeChan(dictUri);
  let [, data] = await channelOpenPromise(chan);
  Assert.equal(data, dictContent, "Dictionary fetched successfully");

  // Wait a bit for the dictionary to be processed
  await new Promise(resolve => do_timeout(100, resolve));

  // Fetch resource - should use dictionary (Available-Dictionary header sent)
  let resourceUri = `${server.origin()}${resourcePath}`;
  chan = makeChan(resourceUri);
  let [req] = await channelOpenPromise(chan);

  let availDict;
  try {
    availDict = req.getRequestHeader("available-dictionary");
  } catch (e) {
    availDict = null;
  }
  Assert.ok(availDict, "Available-Dictionary header was sent");
});

// Test that dictionaries are not stored when origin is disabled
add_task(async function test_dictionary_not_stored_when_disabled() {
  // Clear any cached dictionaries first
  Services.cache2.clear();
  await new Promise(resolve => do_timeout(100, resolve));

  // Disable the server's origin
  let origin = server.origin();
  Services.prefs.setStringPref(
    "network.http.dictionaries.disabled_origins",
    origin
  );

  // Fetch the dictionary - it should be fetched but not stored as a dictionary
  let dictUri = `${origin}${dictPath}`;
  let chan = makeChan(dictUri);
  let [, data] = await channelOpenPromise(chan);
  Assert.equal(data, dictContent, "Dictionary content fetched");

  // Wait a bit
  await new Promise(resolve => do_timeout(100, resolve));

  // Fetch resource - should NOT have Available-Dictionary header
  let resourceUri = `${origin}${resourcePath}`;
  chan = makeChan(resourceUri);
  let [req, resData] = await channelOpenPromise(chan);

  let availDict;
  try {
    availDict = req.getRequestHeader("available-dictionary");
  } catch (e) {
    availDict = null;
  }
  Assert.ok(!availDict, "Available-Dictionary header was NOT sent");
  Assert.equal(resData, "UNCOMPRESSED_DATA", "Received uncompressed data");

  // Clean up
  Services.prefs.setStringPref(
    "network.http.dictionaries.disabled_origins",
    ""
  );
});

// Test that runtime pref change removes cached dictionaries
add_task(async function test_runtime_pref_change_removes_cache() {
  Services.cache2.clear();
  await new Promise(resolve => do_timeout(100, resolve));

  // Ensure origin is not disabled
  Services.prefs.setStringPref(
    "network.http.dictionaries.disabled_origins",
    ""
  );

  let origin = server.origin();

  // Fetch and store dictionary
  let dictUri = `${origin}${dictPath}`;
  let chan = makeChan(dictUri);
  await channelOpenPromise(chan);
  await new Promise(resolve => do_timeout(100, resolve));

  // Verify dictionary is usable
  let resourceUri = `${origin}${resourcePath}`;
  chan = makeChan(resourceUri);
  let [req] = await channelOpenPromise(chan);

  let availDict;
  try {
    availDict = req.getRequestHeader("available-dictionary");
  } catch (e) {
    availDict = null;
  }
  Assert.ok(availDict, "Dictionary was stored and used");

  // Now disable the origin at runtime
  Services.prefs.setStringPref(
    "network.http.dictionaries.disabled_origins",
    origin
  );

  // Wait for pref callback to process
  await new Promise(resolve => do_timeout(100, resolve));

  // Fetch resource again - should NOT have Available-Dictionary header
  chan = makeChan(resourceUri);
  [req] = await channelOpenPromise(chan);

  try {
    availDict = req.getRequestHeader("available-dictionary");
  } catch (e) {
    availDict = null;
  }
  Assert.ok(
    !availDict,
    "Dictionary was removed after origin was disabled at runtime"
  );

  // Clean up
  Services.prefs.setStringPref(
    "network.http.dictionaries.disabled_origins",
    ""
  );
});

// Test multiple origins in the disabled list
add_task(async function test_multiple_disabled_origins() {
  Services.cache2.clear();
  await new Promise(resolve => do_timeout(100, resolve));

  let origin = server.origin();

  // Disable multiple origins including our test origin
  Services.prefs.setStringPref(
    "network.http.dictionaries.disabled_origins",
    "https://example.com, " + origin + ", https://other.org"
  );

  // Fetch dictionary
  let dictUri = `${origin}${dictPath}`;
  let chan = makeChan(dictUri);
  await channelOpenPromise(chan);
  await new Promise(resolve => do_timeout(100, resolve));

  // Fetch resource - should NOT have Available-Dictionary header
  let resourceUri = `${origin}${resourcePath}`;
  chan = makeChan(resourceUri);
  let [req, resData] = await channelOpenPromise(chan);

  let availDict;
  try {
    availDict = req.getRequestHeader("available-dictionary");
  } catch (e) {
    availDict = null;
  }
  Assert.ok(!availDict, "Dictionary not used when origin in multi-origin list");
  Assert.equal(resData, "UNCOMPRESSED_DATA", "Received uncompressed data");

  // Clean up
  Services.prefs.setStringPref(
    "network.http.dictionaries.disabled_origins",
    ""
  );
});

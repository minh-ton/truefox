/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  sinon: "resource://testing-common/Sinon.sys.mjs",
  ShellService: "moz-src:///browser/components/shell/ShellService.sys.mjs",
  TaskbarTabs: "resource:///modules/taskbartabs/TaskbarTabs.sys.mjs",
  TaskbarTabsPin: "resource:///modules/taskbartabs/TaskbarTabsPin.sys.mjs",
  TaskbarTabsWindowManager:
    "resource:///modules/taskbartabs/TaskbarTabsWindowManager.sys.mjs",
  TaskbarTabsUtils: "resource:///modules/taskbartabs/TaskbarTabsUtils.sys.mjs",
});

const kBaseUri = Services.io.newURI("https://example.com");
const kInnerUri = Services.io.newURI("https://example.com/somewhere/else");

let gFaviconUri;
let gFaviconImg;

add_setup(async function setup() {
  // Note: we don't want to stub out creating the icon file, so we need to stub
  // out everything else.
  let sandbox = sinon.createSandbox();
  sandbox.stub(ShellService, "shellService").value({
    ...ShellService.shellService,
    createShortcut: sinon.stub().resolves(),
    deleteShortcut: sinon.stub().resolves(),
    pinShortcutToTaskbar: sinon.stub().resolves(),
    unpinShortcutFromTaskbar: sinon.stub().resolves(),
  });
  registerCleanupFunction(() => sandbox.restore());

  gFaviconUri = Services.io.newURI(
    "chrome://mochitests/content/browser/browser/components/taskbartabs/test/browser/favicon-normal16.png"
  );
  gFaviconImg = await TaskbarTabsUtils._imageFromLocalURI(gFaviconUri);
});

add_task(async function test_noFavicon() {
  const sandbox = sinon.createSandbox();

  sandbox.stub(TaskbarTabsUtils, "getFaviconUri").resolves(null);
  await checkTaskbarTabIcon(await TaskbarTabsUtils.getDefaultIcon());

  sandbox.restore();
});

add_task(async function test_typicalFavicon() {
  const sandbox = sinon.createSandbox();

  sandbox.stub(TaskbarTabsUtils, "getFaviconUri").callsFake(async aUri => {
    if (aUri.equals(kBaseUri)) {
      return gFaviconUri;
    }

    return null;
  });

  await checkTaskbarTabIcon(gFaviconImg);

  sandbox.restore();
});

add_task(async function test_faviconOnOtherPage() {
  // Suppose we have a manifest with start_url '/base', and we're on
  // '/base/other'. If '/base' has a favicon, we should use that (since that's
  // what the user will actually open), but if not we should fall back.
  const sandbox = sinon.createSandbox();

  let checkedInnerLast = false;
  sandbox.stub(TaskbarTabsUtils, "getFaviconUri").callsFake(async aUri => {
    checkedInnerLast = false;
    if (aUri.equals(kBaseUri)) {
      return null;
    }

    if (aUri.equals(kInnerUri)) {
      checkedInnerLast = true;
      return gFaviconUri;
    }

    return null;
  });

  await checkTaskbarTabIcon(gFaviconImg, {
    uri: kInnerUri,
    startPath: "/",
  });
  ok(checkedInnerLast, "The inner URL should be checked last");

  sandbox.restore();
});

/**
 * Checks that loading the given URI and start path and creating a Taskbar Tab
 * results in the given image, and that it can be loaded from disk correctly.
 *
 * You will likely want to mock out TaskbarTabsUtils.getFaviconUri.
 *
 * @param {imgIContainer} aImage - The expected image for this Taskbar Tab.
 * @param {object} [aDetails] - Additional options for the test.
 * @param {nsIURI} [aDetails.uri] - The URI to load.
 * @param {string} [aDetails.startPath] - The "start_url" to set in the fake
 * Web App Manifest.
 */
async function checkTaskbarTabIcon(
  aImage,
  { uri = kBaseUri, startPath = null } = {}
) {
  const sandbox = sinon.createSandbox();

  // We want to wait for the pin to fully complete before continuing, as
  // otherwise e.g. the image might not have saved.
  let pendingPin;
  let pinStub = sandbox
    .stub(TaskbarTabsPin, "pinTaskbarTab")
    .callsFake((...args) => {
      pendingPin = TaskbarTabsPin.pinTaskbarTab.wrappedMethod(...args);
    });

  let replaceStub = sandbox
    .stub(TaskbarTabsWindowManager.prototype, "replaceTabWithWindow")
    .resolves({});

  let tt = await TaskbarTabs.findTaskbarTab(uri, 0);
  Assert.strictEqual(tt, null, "No Taskbar Tab exists under url");

  // The first run should create a Taskbar Tab.
  await openAndMoveIntoTaskbarTab(uri, startPath);
  await pendingPin;
  tt = await TaskbarTabs.findTaskbarTab(uri, 0);
  Assert.notEqual(tt, null, "A new Taskbar Tab was created");
  let priorId = tt.id;

  Assert.equal(pinStub.callCount, 1, "Tried to pin taskbar tab");
  Assert.strictEqual(
    pinStub.firstCall.args[2]?.width,
    aImage.width,
    "Correct image width was used when pinning"
  );
  Assert.strictEqual(
    pinStub.firstCall.args[2]?.height,
    aImage.height,
    "Correct image height was used when pinning"
  );

  Assert.equal(
    replaceStub.callCount,
    1,
    "Tried to replace the tab with a window"
  );
  Assert.strictEqual(
    replaceStub.getCall(0).args[2]?.width,
    aImage.width,
    "Correct image width was used for the window"
  );
  Assert.strictEqual(
    replaceStub.getCall(0).args[2]?.height,
    aImage.height,
    "Correct image height was used for the window"
  );

  await TaskbarTabs.removeTaskbarTab(priorId);
  sandbox.restore();
}

/**
 * Opens aUri in a new tab and moves it into a Taskbar Tab. Additionally, uses
 * aStartPath as the "start_url" of the page's manifest.
 *
 * @param {nsIURI} aUri - The URI to load.
 * @param {string} aStartPath - The value to use as "start_url".
 */
async function openAndMoveIntoTaskbarTab(aUri, aStartPath) {
  await BrowserTestUtils.withNewTab(aUri.spec, async browser => {
    await SpecialPowers.spawn(browser, [aStartPath], async path => {
      if (path !== null) {
        content.document.body.innerHTML = `<link rel="manifest" href='data:application/json,{"start_url": "${path}"}'>`;
      }
    });

    let tab = window.gBrowser.getTabForBrowser(browser);
    await TaskbarTabs.moveTabIntoTaskbarTab(tab);
  });
}

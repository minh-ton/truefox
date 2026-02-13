/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  AIWindowUI:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindowUI.sys.mjs",
  AIWindowAccountAuth:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindowAccountAuth.sys.mjs",
  Chat: "moz-src:///browser/components/aiwindow/models/Chat.sys.mjs",
  openAIEngine: "moz-src:///browser/components/aiwindow/models/Utils.sys.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
});

const AIWINDOW_URL = "chrome://browser/content/aiwindow/aiWindow.html";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.smartwindow.enabled", true],
      ["browser.smartwindow.firstrun.hasCompleted", true],
    ],
  });
});

/**
 * Opens a new AI Window
 *
 * @returns {Promise<Window>}
 */
async function openAIWindow() {
  const win = await BrowserTestUtils.openNewBrowserWindow({ aiWindow: true });
  await BrowserTestUtils.waitForMutationCondition(
    win.document.documentElement,
    { attributes: true },
    () => win.document.documentElement.hasAttribute("ai-window")
  );
  return win;
}

/**
 * Stubs AIWindowAccountAuth.ensureAIWindowAccess to skip sign-in flow
 * Call the returned restore function to clean up the stub
 *
 * @returns {Function} restore function to clean up the stub
 */
function skipSignIn() {
  const stub = sinon
    .stub(AIWindowAccountAuth, "ensureAIWindowAccess")
    .resolves(true);
  return () => stub.restore();
}

/**
 * Type text into the smartbar and wait for a pending query to complete.
 *
 * @param {MozBrowser} browser - The browser element
 * @param {string} text - Text to type
 */
async function typeInSmartbar(browser, text) {
  await SpecialPowers.spawn(browser, [text], async searchText => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = await ContentTaskUtils.waitForCondition(
      () => aiWindowElement.shadowRoot?.querySelector("#ai-window-smartbar"),
      "Wait for Smartbar to be rendered"
    );
    const editor = smartbar.querySelector("moz-multiline-editor");
    editor.focus();
    EventUtils.sendString(searchText, content);
    await smartbar.lastQueryContextPromise;
  });
}

/**
 * Waits for the Smartbar suggestions view to open.
 *
 * @param {MozBrowser} browser - The browser element
 * @param {Function} openFn - A function that should trigger the view opening
 * @returns {Promise} A promise that resolves when the view is open
 */
async function promiseSmartbarSuggestionsOpen(browser, openFn) {
  if (!openFn) {
    throw new Error(
      "openFn should be supplied to promiseSmartbarSuggestionsOpen"
    );
  }

  const opened = SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = await ContentTaskUtils.waitForCondition(
      () => aiWindowElement.shadowRoot?.querySelector("#ai-window-smartbar"),
      "Wait for Smartbar to be rendered"
    );
    if (smartbar.view.isOpen) {
      return;
    }
    await new Promise(resolve => {
      smartbar.controller.addListener({
        onViewOpen() {
          smartbar.controller.removeListener(this);
          resolve();
        },
      });
    });
  });
  await openFn();
  await opened;
}

/**
 * Waits for the Smartbar suggestions view to close.
 *
 * @param {MozBrowser} browser - The browser element
 * @returns {Promise} A promise that resolves when the view is closed
 */
async function promiseSmartbarSuggestionsClose(browser) {
  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = await ContentTaskUtils.waitForCondition(
      () => aiWindowElement.shadowRoot?.querySelector("#ai-window-smartbar"),
      "Wait for Smartbar to be rendered"
    );
    if (!smartbar.view.isOpen) {
      return;
    }

    await new Promise(resolve => {
      smartbar.controller.addListener({
        onViewClose() {
          smartbar.controller.removeListener(this);
          resolve();
        },
      });
    });
  });
}

/**
 * Asserts the Smartbar suggestions view position and visibility.
 *
 * @param {MozBrowser} browser - The browser element
 * @param {boolean} shouldBeVisible - Whether the suggestions view should be visible
 * @param {string} expectedPosition - The expected position
 */
async function assertSmartbarSuggestionsVisible(
  browser,
  shouldBeVisible,
  expectedPosition = "bottom"
) {
  const aiWindowElement =
    browser.contentWindow.document.querySelector("ai-window");
  const smartbarElement = aiWindowElement.shadowRoot.querySelector(
    "#ai-window-smartbar"
  );
  const urlbarView = smartbarElement.querySelector(".urlbarView");

  Assert.equal(
    BrowserTestUtils.isVisible(urlbarView),
    shouldBeVisible,
    `Suggestions view element should be visible: ${shouldBeVisible}`
  );
  Assert.equal(
    smartbarElement.getAttribute("suggestions-position"),
    expectedPosition,
    `Suggestions position should be: ${expectedPosition}`
  );
}

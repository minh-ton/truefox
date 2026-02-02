/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
import {
  createParserState,
  consumeStreamChunk,
  flushTokenRemainder,
} from "chrome://browser/content/aiwindow/modules/TokenStreamParser.mjs";

const { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  Chat: "moz-src:///browser/components/aiwindow/models/Chat.sys.mjs",
  generateChatTitle:
    "moz-src:///browser/components/aiwindow/models/TitleGeneration.sys.mjs",
  AIWindow:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindow.sys.mjs",
  ChatConversation:
    "moz-src:///browser/components/aiwindow/ui/modules/ChatConversation.sys.mjs",
  MEMORIES_FLAG_SOURCE:
    "moz-src:///browser/components/aiwindow/ui/modules/ChatEnums.sys.mjs",
  MESSAGE_ROLE:
    "moz-src:///browser/components/aiwindow/ui/modules/ChatEnums.sys.mjs",
  AssistantRoleOpts:
    "moz-src:///browser/components/aiwindow/ui/modules/ChatMessage.sys.mjs",
  UserRoleOpts:
    "moz-src:///browser/components/aiwindow/ui/modules/ChatMessage.sys.mjs",
  getRoleLabel:
    "moz-src:///browser/components/aiwindow/ui/modules/ChatUtils.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "log", function () {
  return console.createInstance({
    prefix: "ChatStore",
    maxLogLevelPref: "browser.smartwindow.chatStore.loglevel",
  });
});

const FULLPAGE = "fullpage";
const SIDEBAR = "sidebar";
const PREF_MEMORIES = "browser.smartwindow.memories";

/**
 * A custom element for managing AI Window
 *
 * @todo Bug2007583
 * Tests follow up for re-opening conversations
 */
export class AIWindow extends MozLitElement {
  static properties = {
    mode: { type: String }, // sidebar | fullpage
  };

  #browser;
  #smartbar;
  #conversation;
  #memoriesButton = null;
  #memoriesToggled = null;
  #visibilityChangeHandler;

  /**
   * Flags whether the #conversation reference has been updated but the messages
   * have not been delivered via the actor.
   *
   * @type {bool}
   */
  #pendingMessageDelivery;

  #detectModeFromContext() {
    return window.browsingContext?.embedderElement?.id === "ai-window-browser"
      ? SIDEBAR
      : FULLPAGE;
  }

  #syncSmartbarMemoriesStateFromConversation() {
    if (!this.#smartbar) {
      return;
    }

    const lastUserMessage =
      this.#conversation?.messages?.findLast?.(m => m.role === "user") ?? null;
    if (
      lastUserMessage?.memoriesFlagSource ===
      lazy.MEMORIES_FLAG_SOURCE.CONVERSATION
    ) {
      this.#memoriesToggled = lastUserMessage.memoriesEnabled;
    }
    this.#syncMemoriesButtonUI();
  }

  #syncMemoriesButtonUI() {
    this.#memoriesButton.disabled = !this.memoriesPref;
    this.#memoriesButton.pressed =
      this.memoriesPref && (this.#memoriesToggled ?? this.memoriesPref);
  }

  constructor() {
    super();

    XPCOMUtils.defineLazyPreferenceGetter(
      this,
      "memoriesPref",
      PREF_MEMORIES,
      null,
      () => this.#syncMemoriesButtonUI()
    );

    this.userPrompt = "";
    this.#browser = null;
    this.#smartbar = null;
    this.#conversation = new lazy.ChatConversation({});
    this.mode = this.#detectModeFromContext();
  }

  connectedCallback() {
    super.connectedCallback();

    this.ownerDocument.addEventListener("OpenConversation", this);
    this.ownerDocument.addEventListener(
      "smartbar-commit",
      this.#handleSmartbarCommit,
      true
    );

    this.#loadPendingConversation();
  }

  handleEvent(event) {
    this.openConversation(event.detail);
  }

  disconnectedCallback() {
    // Clean up visibility change handler
    if (this.#visibilityChangeHandler) {
      this.ownerDocument.removeEventListener(
        "visibilitychange",
        this.#visibilityChangeHandler
      );
      this.#visibilityChangeHandler = null;
    }

    // Clean up smartbar
    this.ownerDocument.removeEventListener(
      "smartbar-commit",
      this.#handleSmartbarCommit,
      true
    );
    if (this.#smartbar) {
      this.#smartbar.removeEventListener(
        "aiwindow-memories-toggle:on-change",
        this.#handleMemoriesToggle
      );
      this.#smartbar.remove();
      this.#smartbar = null;
      this.#memoriesButton = null;
    }

    // Clean up browser
    if (this.#browser) {
      this.#browser.remove();
      this.#browser = null;
    }

    // Clean up conversation
    this.#conversation = null;

    this.ownerDocument.removeEventListener("OpenConversation", this);

    super.disconnectedCallback();
  }

  /**
   * Loads a conversation if one is set on the data-conversation-id attribute
   * on connectedCallback()
   */
  async #loadPendingConversation() {
    const hostBrowser = window.browsingContext?.embedderElement;
    const conversationId = hostBrowser?.getAttribute("data-conversation-id");
    if (!conversationId) {
      return;
    }

    const conversation =
      await lazy.AIWindow.chatStore.findConversationById(conversationId);
    if (conversation) {
      this.openConversation(conversation);
    }
  }

  firstUpdated() {
    // Create a real XUL <browser> element from the chrome document
    const doc = this.ownerDocument; // browser.xhtml
    const browser = doc.createXULElement("browser");

    browser.setAttribute("id", "aichat-browser");
    browser.setAttribute("type", "content");
    browser.setAttribute("maychangeremoteness", "true");
    browser.setAttribute("disableglobalhistory", "true");
    browser.setAttribute("transparent", "true");
    browser.setAttribute("src", "about:aichatcontent");

    const container = this.renderRoot.querySelector("#browser-container");
    container.appendChild(browser);

    this.#browser = browser;

    // Defer Smartbar initialization for preloaded documents
    if (doc.hidden) {
      this.#visibilityChangeHandler = () => {
        if (!doc.hidden && !this.#smartbar) {
          this.#getOrCreateSmartbar(doc, container);
        }
      };
      doc.addEventListener("visibilitychange", this.#visibilityChangeHandler, {
        once: true,
      });
    } else {
      this.#getOrCreateSmartbar(doc, container);
    }
  }

  /**
   * Helper method to get or create the smartbar element
   *
   * @param {Document} doc - The document
   * @param {Element} container - The container element
   */
  #getOrCreateSmartbar(doc, container) {
    // Find existing Smartbar or create it when we init the AI Window.
    let smartbar = container.querySelector("#ai-window-smartbar");

    if (!smartbar) {
      // The Smartbar can’t be initialized in the shadow DOM and needs
      // to be created from the chrome document.
      smartbar = doc.createElement("moz-smartbar");
      smartbar.id = "ai-window-smartbar";
      smartbar.setAttribute("sap-name", "smartbar");
      smartbar.setAttribute("pageproxystate", "invalid");
      smartbar.setAttribute("popover", "manual");
      smartbar.classList.add("smartbar", "urlbar");
      container.append(smartbar);

      smartbar.addEventListener("smartbar-commit", this.#handleSmartbarCommit);
      smartbar.addEventListener(
        "aiwindow-memories-toggle:on-change",
        this.#handleMemoriesToggle
      );
    }
    this.#smartbar = smartbar;
    this.#memoriesButton = smartbar.querySelector("memories-icon-button");
    this.#syncSmartbarMemoriesStateFromConversation();
  }

  /**
   * Handles the smartbar-commit action for the user prompt
   *
   * @param {CustomEvent} event - The smartbar-commit event
   * @private
   */
  #handleSmartbarCommit = event => {
    const { value, action } = event.detail;
    if (action === "chat") {
      const userOpts = new lazy.UserRoleOpts({
        memoriesEnabled: this.#memoriesToggled ?? this.memoriesPref,
        memoriesFlagSource:
          this.#memoriesToggled == null
            ? lazy.MEMORIES_FLAG_SOURCE.GLOBAL
            : lazy.MEMORIES_FLAG_SOURCE.CONVERSATION,
      });

      this.#fetchAIResponse(value, userOpts);
    }
  };

  #handleMemoriesToggle = event => {
    this.#memoriesToggled = event.detail.pressed;
    this.#syncMemoriesButtonUI();
  };

  /**
   * Persists the current conversation state to the database.
   *
   * @private
   */
  async #updateConversation() {
    await lazy.AIWindow.chatStore
      .updateConversation(this.#conversation)
      .catch(updateError => {
        lazy.log.error(`Error updating conversation: ${updateError.message}`);
      });
  }

  /**
   * Generates and sets a title for the conversation if one doesn't exist.
   *
   * @private
   */
  async #addConversationTitle() {
    if (this.#conversation.title) {
      return;
    }

    const firstUserMessage = this.#conversation.messages.find(
      m => m.role === lazy.MESSAGE_ROLE.USER
    );

    const title = await lazy.generateChatTitle(
      firstUserMessage?.content?.body,
      {
        url: firstUserMessage?.pageUrl?.href || "",
        title: this.#conversation.pageMeta?.title || "",
        description: this.#conversation.pageMeta?.description || "",
      }
    );

    this.#conversation.title = title;
    this.#updateConversation();
  }

  /**
   * Processes tokens from the AI response stream and updates the message.
   * Adds all tokens to their respective arrays in the tokens object and
   * builds the memoriesApplied array for existing_memory tokens.
   *
   * @param {Array<{key: string, value: string}>} tokens - Array of parsed tokens from the stream
   * @param {ChatMessage} currentMessage - The message object being updated
   */
  handleTokens = (tokens, currentMessage) => {
    tokens.forEach(({ key, value }) => {
      currentMessage.tokens[key].push(value);

      // Build Applied Memories Array
      if (key === "existing_memory") {
        currentMessage.memoriesApplied.push(value);
      }
    });
  };

  #setBrowserContainerActiveState(isActive) {
    const container = this.renderRoot.querySelector("#browser-container");
    if (!container) {
      return;
    }

    if (isActive) {
      container.classList.add("chat-active");
      return;
    }

    container.classList.remove("chat-active");
  }

  /**
   * Fetches an AI response based on the current user prompt.
   * Validates the prompt, updates conversation state, streams the response,
   * and dispatches updates to the browser actor.
   *
   * @private
   */

  #fetchAIResponse = async (inputText, userOpts = undefined) => {
    const formattedPrompt = (inputText || "").trim();
    if (!formattedPrompt) {
      return;
    }

    this.#setBrowserContainerActiveState(true);

    const nextTurnIndex = this.#conversation.currentTurnIndex() + 1;
    try {
      const pageUrl = URL.fromURI(
        window.browsingContext.topChromeWindow.gBrowser.currentURI
      );
      const stream = lazy.Chat.fetchWithHistory(
        await this.#conversation.generatePrompt(
          formattedPrompt,
          pageUrl,
          userOpts
        )
      );
      this.#updateConversation();
      this.#addConversationTitle();

      // Handle User Prompt
      this.#dispatchMessageToChatContent(this.#conversation.messages.at(-1));

      // @todo
      // fill out these assistant message flags
      const assistantRoleOpts = new lazy.AssistantRoleOpts();
      this.#conversation.addAssistantMessage(
        "text",
        "",
        nextTurnIndex,
        assistantRoleOpts
      );

      const parserState = createParserState();
      const currentMessage = this.#conversation.messages
        .filter(message => message.role === lazy.MESSAGE_ROLE.ASSISTANT)
        .at(-1);

      for await (const chunk of stream) {
        const { plainText, tokens } = consumeStreamChunk(chunk, parserState);

        if (!currentMessage.tokens) {
          currentMessage.tokens = {
            search: [],
            existing_memory: [],
          };
        }

        if (!currentMessage.memoriesApplied) {
          currentMessage.memoriesApplied = [];
        }

        if (plainText) {
          currentMessage.content.body += plainText;
        }

        if (tokens?.length) {
          this.handleTokens(tokens, currentMessage);
        }
        this.#updateConversation();
        this.#dispatchMessageToChatContent(currentMessage);
        this.requestUpdate?.();
      }

      // End of stream: if there was an unclosed §... treat as literal text
      const remainder = flushTokenRemainder(parserState);

      if (remainder) {
        currentMessage.content.body += remainder;
        this.#updateConversation();
        this.#dispatchMessageToChatContent(currentMessage);
        this.requestUpdate?.();
      }
    } catch (e) {
      // TODO - handle error properly
      this.requestUpdate?.();
    }
  };

  /**
   * Retrieves the AIChatContent actor from the browser's window global.
   *
   * @returns {Promise<object|null>} The AIChatContent actor, or null if unavailable.
   * @private
   */

  #getAIChatContentActor() {
    if (!this.#browser) {
      lazy.log.warn("AI browser not set, cannot get AIChatContent actor");
      return null;
    }

    const windowGlobal = this.#browser.browsingContext?.currentWindowGlobal;

    if (!windowGlobal) {
      lazy.log.warn("No window global found for AI browser");
      return null;
    }
    try {
      return windowGlobal.getActor("AIChatContent");
    } catch (error) {
      lazy.log.error("Failed to get AIChatContent actor:", error);
      return null;
    }
  }

  /**
   * Dispatches a message to the AIChatContent actor.
   *
   * @param {ChatMessage} message - message to dispatch to chat content actor
   * @returns
   */

  #dispatchMessageToActor(actor, message) {
    const newMessage = { ...message };
    if (typeof message.role !== "string") {
      const roleLabel = lazy.getRoleLabel(newMessage.role).toLowerCase();
      newMessage.role = roleLabel;
    }

    return actor.dispatchMessageToChatContent(newMessage);
  }

  #dispatchMessageToChatContent(message) {
    const actor = this.#getAIChatContentActor();
    return actor ? this.#dispatchMessageToActor(actor, message) : null;
  }

  /**
   * Delivers messages to the child process if there are some pending when the
   * parent actor receives AIChatContent:Ready event from the child process.
   */
  onContentReady() {
    if (!this.#pendingMessageDelivery) {
      return;
    }

    const actor = this.#getAIChatContentActor();
    if (actor) {
      this.#deliverConversationMessages(actor);
    }
  }

  /**
   * Delivers all of the messages of a conversation to the child process
   *
   * @param {JSActor} actor
   */
  #deliverConversationMessages(actor) {
    this.#pendingMessageDelivery = false;

    if (!this.#conversation || !this.#conversation.messages.length) {
      return;
    }

    this.#setBrowserContainerActiveState(true);

    // @todo Bug2013096
    // Add way to batch these messages to the actor in one message
    this.#conversation.messages.forEach(message => {
      if (
        message.role === lazy.MESSAGE_ROLE.USER ||
        message.role === lazy.MESSAGE_ROLE.ASSISTANT
      ) {
        this.#dispatchMessageToActor(actor, message);
      }
    });
  }

  /**
   * Opens a new conversation and renders the conversation in the child process.
   *
   * @param {ChatConversation} conversation
   */
  openConversation(conversation) {
    this.#conversation = conversation;

    const actor = this.#getAIChatContentActor();
    if (this.#browser && actor) {
      this.#deliverConversationMessages(actor);
    } else {
      this.#pendingMessageDelivery = true;
    }
  }

  #onCreateNewChatclick() {
    // Clear the conversation state locally
    this.#conversation = new lazy.ChatConversation({});

    // Reset memories toggle state
    this.#memoriesToggled = null;
    this.#syncMemoriesButtonUI();

    // Submitting a message with a new convoId here.
    // This will clear the chat content area in the child process via side effect.
    this.#dispatchMessageToChatContent({
      role: "", // wont be checked.
      content: { body: "" },
    });

    // Hide chat-active state
    this.#setBrowserContainerActiveState(false);
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/aiwindow/components/ai-window.css"
      />
      <!-- TODO (Bug 2008938): Make in-page Smartbar styling not dependent on chrome styles -->
      <link rel="stylesheet" href="chrome://browser/skin/smartbar.css" />
      ${this.mode === SIDEBAR
        ? html`<div class="sidebar-header">
            <moz-button
              data-l10n-id="aiwindow-new-chat"
              data-l10n-attrs="tooltiptext,aria-label"
              class="new-chat-icon-button"
              size="default"
              iconsrc="chrome://browser/content/aiwindow/assets/new-chat.svg"
              @click=${this.#onCreateNewChatclick}
            ></moz-button>
          </div>`
        : ""}
      <div id="browser-container"></div>
      <!-- TODO : Example of mode-based rendering -->
      ${this.mode === FULLPAGE ? html`<div>Fullpage Footer Content</div>` : ""}
    `;
  }
}

customElements.define("ai-window", AIWindow);

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, nothing } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/aiwindow/components/assistant-message-footer.mjs";

/**
 * A custom element for managing AI Chat Content
 */
export class AIChatContent extends MozLitElement {
  static properties = {
    conversationState: { type: Array },
    tokens: { type: Object },
  };

  constructor() {
    super();
    this.conversationState = [];
  }

  connectedCallback() {
    super.connectedCallback();
    this.#initEventListeners();

    this.dispatchEvent(
      new CustomEvent("AIChatContent:Ready", { bubbles: true })
    );
  }

  /**
   * Initialize event listeners for AI chat content events
   */

  #initEventListeners() {
    this.addEventListener(
      "aiChatContentActor:message",
      this.messageEvent.bind(this)
    );
  }

  messageEvent(event) {
    const message = event.detail;
    this.#checkConversationState(message);

    switch (message.role) {
      case "assistant":
        this.handleAIResponseEvent(event);
        break;
      case "user":
        this.handleUserPromptEvent(event);
        break;
    }
  }

  /**
   * Check if conversationState needs to be cleared
   *
   * @param {ChatMessage} message
   */
  #checkConversationState(message) {
    const lastMessage = this.conversationState.at(-1);
    const firstMessage = this.conversationState.at(0);
    const isReloadingSameConvo =
      firstMessage &&
      firstMessage.convId === message.convId &&
      firstMessage.ordinal === message.ordinal;
    const convIdChanged = message.convId !== lastMessage?.convId;

    if (convIdChanged || isReloadingSameConvo) {
      this.conversationState = [];
    }
  }

  /**
   *  Handle user prompt events
   *
   * @param {CustomEvent} event - The custom event containing the user prompt
   */

  handleUserPromptEvent(event) {
    const { convId, content, ordinal } = event.detail;
    this.conversationState[ordinal] = {
      role: "user",
      body: content.body,
      convId,
      ordinal,
    };
    this.requestUpdate();
    this.#scrollToBottom();
  }

  /**
   * Handle AI response events
   *
   * @param {CustomEvent} event - The custom event containing the response
   */

  handleAIResponseEvent(event) {
    const {
      convId,
      ordinal,
      id: messageId,
      content,
      memoriesApplied,
      tokens,
    } = event.detail;

    this.conversationState[ordinal] = {
      role: "assistant",
      convId,
      messageId,
      body: content.body,
      appliedMemories: memoriesApplied ?? [],
      searchTokens: tokens?.search || [],
    };

    this.requestUpdate();
  }

  #scrollToBottom() {
    this.updateComplete.then(() => {
      const wrapper = this.shadowRoot?.querySelector(".chat-content-wrapper");
      if (wrapper) {
        wrapper.scrollTop = wrapper.scrollHeight;
      }
    });
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/aiwindow/components/ai-chat-content.css"
      />
      <div class="chat-content-wrapper">
        ${this.conversationState.map(msg => {
          return html`
            <div class=${`chat-bubble chat-bubble-${msg.role}`}>
              <ai-chat-message
                .message=${msg.body}
                .role=${msg.role}
                .searchTokens=${msg.searchTokens || []}
              ></ai-chat-message>

              ${msg.role === "assistant"
                ? html`
                    <assistant-message-footer
                      .messageId=${msg.messageId}
                      .appliedMemories=${msg.appliedMemories}
                    ></assistant-message-footer>
                  `
                : nothing}
            </div>
          `;
        })}
      </div>
    `;
  }
}

customElements.define("ai-chat-content", AIChatContent);

import type { PublicChatClient } from '../../lib/chatTypes';
import * as api from '../../lib/publicApi';

/** Widget client for the local demo: simulated replies, data in localStorage. */
export const localChatClient: PublicChatClient = {
  simulated: true,
  async getConfig(widgetKey) {
    return api.getWidgetConfig(widgetKey);
  },
  async start(widgetKey, pageUrl) {
    return api.startConversation(widgetKey, pageUrl);
  },
  async getTranscript(widgetKey, ref) {
    return api.getVisitorTranscript(widgetKey, ref);
  },
  sendMessage(widgetKey, ref, text) {
    return api.sendVisitorMessage(widgetKey, ref, text);
  },
  async submitHandoff(widgetKey, ref, input) {
    api.submitHandoff(widgetKey, ref, input);
  },
};

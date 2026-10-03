import { createRoot } from 'react-dom/client';
import { createHttpChatClient } from '../backend/http/chatClient';
import { ChatWidget } from '../components/ChatWidget';
import css from './widget.css?inline';

/**
 * Standalone embed (dist/widget.js), built with Preact in place of React:
 *
 *   <script src="https://YOUR-AMPLIFY-DOMAIN/widget.js" data-widget-key="pk_..." async></script>
 *
 * Optional data-api-url overrides the public chat URL baked in at build time.
 */

declare const __DEFAULT_CHAT_URL__: string;

const HOST_TAG = 'aos-support-widget';
const script = (document.currentScript as HTMLScriptElement | null) ?? document.querySelector<HTMLScriptElement>('script[data-widget-key]');

/**
 * Rem units would follow the host page's root font size, so they are pinned to
 * 16px. @property rules are ignored inside shadow roots, so they are registered
 * on the document instead; Tailwind's shadow and ring utilities depend on them.
 */
function prepareCss(source: string): { shadow: string; document: string } {
  // Only inside declaration blocks: escaped class names such as .h-\[calc\(100dvh-8rem\)\] contain "rem" too.
  const pinned = source.replace(/\{[^{}]*\}/g, (block) => block.replace(/(\d*\.?\d+)rem\b/g, (_, n: string) => `${parseFloat(n) * 16}px`));
  const properties: string[] = [];
  const shadow = pinned.replace(/@property\s+[\w-]+\s*\{[^}]*\}/g, (rule) => {
    properties.push(rule);
    return '';
  });
  return { shadow, document: properties.join('\n') };
}

function mount() {
  const widgetKey = script?.dataset.widgetKey;
  const endpoint = script?.dataset.apiUrl || __DEFAULT_CHAT_URL__;
  if (!widgetKey || !endpoint) {
    console.warn('[support widget] Add data-widget-key (and data-api-url if this build has no default chat URL) to the script tag.');
    return;
  }
  if (document.querySelector(HOST_TAG)) return;

  const styles = prepareCss(css);
  if (styles.document) {
    const registered = document.createElement('style');
    registered.dataset.supportWidget = '';
    registered.textContent = styles.document;
    document.head.appendChild(registered);
  }

  const host = document.createElement(HOST_TAG);
  host.style.cssText = 'all: initial; position: fixed; z-index: 2147483000; top: 0; left: 0; width: 0; height: 0;';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = styles.shadow;
  const container = document.createElement('div');
  container.className = 'widget-root';
  shadow.append(style, container);
  document.body.appendChild(host);

  createRoot(container).render(<ChatWidget client={createHttpChatClient(endpoint)} widgetKey={widgetKey} />);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
else mount();

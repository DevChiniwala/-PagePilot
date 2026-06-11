// Content Script for PagePilot - Extracts clean content from web pages

interface ExtractContentMessage {
  type: 'EXTRACT_CONTENT';
  url: string;
}

interface ExtractedContent {
  title: string;
  text: string;
  html: string;
  favicon?: string;
  metaDescription?: string;
  headings: Array<{ level: number; text: string; id: string }>;
}

interface ContentScriptMessage {
  type: 'EXTRACT_CONTENT' | 'PING';
}

function cleanHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  
  // Remove unwanted elements
  const selectorsToRemove = [
    'script', 'style', 'noscript', 'iframe', 'embed', 'object',
    'nav', 'footer', 'header', 'aside', '.ad', '.ads', '.advertisement',
    '[class*="cookie"]', '[id*="cookie"]', '[class*="banner"]',
    '[class*="popup"]', '[class*="modal"]', '[class*="overlay"]',
    'button', 'input', 'form', 'select', 'textarea'
  ];
  
  selectorsToRemove.forEach(selector => {
    doc.querySelectorAll(selector).forEach(el => el.remove());
  });

  // Remove elements with common ad/tracking classes
  doc.querySelectorAll('[class*="track"], [id*="track"], [class*="analytics"], [id*="analytics"]').forEach(el => el.remove());

  return doc.documentElement.outerHTML;
}

function extractText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  
  // Get main content area - try common selectors
  const mainSelectors = [
    'main', 'article', '[role="main"]', '.main-content', '.content', 
    '#content', '.post', '.entry-content', '.article-body'
  ];
  
  let contentElement: Element | null = null;
  for (const selector of mainSelectors) {
    contentElement = doc.querySelector(selector);
    if (contentElement) break;
  }
  
  // Fallback to body
  if (!contentElement) {
    contentElement = doc.body;
  }
  
  // Clean the content element
  contentElement.querySelectorAll('script, style, noscript, iframe, nav, footer, header, aside, button, input, form').forEach(el => el.remove());
  
  // Get text with preserved structure
  return contentElement.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function extractHeadings(html: string): Array<{ level: number; text: string; id: string }> {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const headings: Array<{ level: number; text: string; id: string }> = [];
  
  doc.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
    const level = parseInt(heading.tagName[1], 10);
    const text = heading.textContent?.trim() || '';
    const id = heading.id || '';
    if (text) headings.push({ level, text, id });
  });
  
  return headings;
}

function extractFavicon(): string | undefined {
  const iconLink = document.querySelector<HTMLLinkElement>('link[rel*="icon"]');
  if (iconLink?.href) return iconLink.href;
  
  // Try default favicon
  return `${window.location.origin}/favicon.ico`;
}

function extractMetaDescription(): string | undefined {
  const meta = document.querySelector('meta[name="description"], meta[property="og:description"]');
  return meta?.getAttribute('content') || undefined;
}

function extractContent(): ExtractedContent {
  const html = document.documentElement.outerHTML;
  const clean = cleanHtml(html);
  const text = extractText(clean);
  
  return {
    title: document.title,
    text,
    html: clean,
    favicon: extractFavicon(),
    metaDescription: extractMetaDescription(),
    headings: extractHeadings(clean),
  };
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message: ContentScriptMessage, _sender, sendResponse) => {
  if (message.type === 'EXTRACT_CONTENT') {
    try {
      const content = extractContent();
      sendResponse(content);
    } catch (error) {
      sendResponse({ error: error instanceof Error ? error.message : 'Extraction failed' });
    }
    return true; // Async response
  }
  
  if (message.type === 'PING') {
    sendResponse({ pong: true });
    return true;
  }
});

// Expose extraction function globally for manual triggering
(window as unknown as Window & { PagePilot: { extract: () => ExtractedContent } }).PagePilot = {
  extract: extractContent,
};

console.log('[PagePilot] Content script loaded');
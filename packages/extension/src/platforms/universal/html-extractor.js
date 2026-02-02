/**
 * HTML Extractor
 * Injected into ATS pages via chrome.scripting.executeScript()
 * Captures and cleans page HTML for LLM-powered form field analysis
 */

(function extractPageHtml() {
  const MAX_HTML_LENGTH = 80000;

  /**
   * Tags to remove entirely (content + element)
   */
  const REMOVE_TAGS = [
    "script",
    "style",
    "svg",
    "img",
    "video",
    "audio",
    "noscript",
    "iframe",
    "link",
    "meta",
    "picture",
    "source",
    "canvas",
  ];

  /**
   * Selectors for elements to remove
   */
  const REMOVE_SELECTORS = [
    "[hidden]",
    "[aria-hidden='true']",
    "footer",
    "nav",
    "header:not(:has(form))",
  ];

  /**
   * Clone the document body and clean it
   */
  function cleanHtml(root) {
    const clone = root.cloneNode(true);

    // Remove unwanted tags
    for (const tag of REMOVE_TAGS) {
      const els = clone.querySelectorAll(tag);
      for (const el of els) {
        el.remove();
      }
    }

    // Remove unwanted selectors
    for (const sel of REMOVE_SELECTORS) {
      try {
        const els = clone.querySelectorAll(sel);
        for (const el of els) {
          el.remove();
        }
      } catch {
        // Some selectors may not be supported, skip
      }
    }

    // Strip inline style attributes and data-* attributes (keep data-testid)
    const allElements = clone.querySelectorAll("*");
    for (const el of allElements) {
      el.removeAttribute("style");

      // Remove data-* attributes except data-testid
      const attrs = Array.from(el.attributes);
      for (const attr of attrs) {
        if (
          attr.name.startsWith("data-") &&
          attr.name !== "data-testid"
        ) {
          el.removeAttribute(attr.name);
        }
      }

      // Remove event handler attributes
      for (const attr of Array.from(el.attributes)) {
        if (attr.name.startsWith("on")) {
          el.removeAttribute(attr.name);
        }
      }
    }

    return clone;
  }

  /**
   * Collapse whitespace in HTML string
   */
  function collapseWhitespace(html) {
    return html
      .replace(/\s+/g, " ")
      .replace(/>\s+</g, "> <")
      .replace(/\s+>/g, ">")
      .replace(/<\s+/g, "<")
      .trim();
  }

  /**
   * Try to isolate form or main content if HTML is too large
   */
  function isolateContent(cleaned) {
    let html = cleaned.innerHTML;
    html = collapseWhitespace(html);

    if (html.length <= MAX_HTML_LENGTH) {
      return html;
    }

    // Try to find the main form
    const form = cleaned.querySelector("form");
    if (form) {
      const formHtml = collapseWhitespace(form.outerHTML);
      if (formHtml.length <= MAX_HTML_LENGTH) {
        return formHtml;
      }
    }

    // Try <main> element
    const main = cleaned.querySelector("main");
    if (main) {
      const mainHtml = collapseWhitespace(main.outerHTML);
      if (mainHtml.length <= MAX_HTML_LENGTH) {
        return mainHtml;
      }
    }

    // Try [role="main"]
    const roleMain = cleaned.querySelector('[role="main"]');
    if (roleMain) {
      const roleMainHtml = collapseWhitespace(roleMain.outerHTML);
      if (roleMainHtml.length <= MAX_HTML_LENGTH) {
        return roleMainHtml;
      }
    }

    // Hard cap
    return html.substring(0, MAX_HTML_LENGTH);
  }

  // Execute extraction
  const cleaned = cleanHtml(document.body);
  const html = isolateContent(cleaned);

  return {
    html,
    pageTitle: document.title,
    pageUrl: window.location.href,
    charCount: html.length,
  };
})();

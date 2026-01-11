/**
 * Network Interceptor - Injected into page's main world
 * Monkey-patches fetch and XMLHttpRequest to capture HH.ru API calls
 *
 * This script runs in the PAGE context (not content script isolated world)
 * to access the actual fetch/XHR used by the website
 */

(() => {
  // Only run on HH.ru
  if (!window.location.hostname.includes("hh.ru")) {
    return;
  }

  // Patterns to capture (focus on resume and application endpoints)
  const CAPTURE_PATTERNS = [
    "/shards/",
    "/resume",
    "/resumes",
    "/negotiations",
    "/vacancy",
    "/applicant",
    "/employer",
    "/account",
    "/profile",
  ];

  // Check if URL should be captured
  function shouldCapture(url) {
    if (!url) return false;
    const urlLower = url.toLowerCase();
    return CAPTURE_PATTERNS.some((pattern) => urlLower.includes(pattern));
  }

  // Send captured data to content script via postMessage
  function sendToContentScript(data) {
    window.postMessage(
      {
        type: "HH_NETWORK_CAPTURE",
        payload: data,
      },
      "*",
    );
  }

  // Parse headers from Headers object or plain object
  function parseHeaders(headers) {
    if (!headers) return {};

    if (headers instanceof Headers) {
      const result = {};
      headers.forEach((value, key) => {
        result[key] = value;
      });
      return result;
    }

    return { ...headers };
  }

  // Try to parse response body
  async function tryParseBody(response) {
    try {
      const cloned = response.clone();
      const contentType = cloned.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        return await cloned.json();
      } else if (contentType.includes("text/")) {
        const text = await cloned.text();
        return text.substring(0, 5000); // Limit text size
      }
      return "[Binary or non-text response]";
    } catch (e) {
      return "[Failed to parse body]";
    }
  }

  // ========== FETCH INTERCEPTOR ==========
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const [resource, options = {}] = args;
    const url = typeof resource === "string" ? resource : resource.url;
    const method =
      options.method ||
      (typeof resource === "object" ? resource.method : "GET") ||
      "GET";

    // Always call original fetch
    const startTime = Date.now();
    let response;
    let error = null;

    try {
      response = await originalFetch.apply(this, args);
    } catch (e) {
      error = e;
      throw e;
    } finally {
      // Only capture matching URLs
      if (shouldCapture(url)) {
        const captureData = {
          timestamp: new Date().toISOString(),
          type: "fetch",
          method: method.toUpperCase(),
          url: url,
          requestHeaders: parseHeaders(options.headers),
          requestBody: null,
          status: response?.status || null,
          statusText: response?.statusText || null,
          responseHeaders: response ? parseHeaders(response.headers) : {},
          responseBody: null,
          duration: Date.now() - startTime,
          error: error ? error.message : null,
        };

        // Parse request body
        if (options.body) {
          try {
            if (typeof options.body === "string") {
              captureData.requestBody = JSON.parse(options.body);
            } else if (options.body instanceof FormData) {
              const formObj = {};
              options.body.forEach((value, key) => {
                formObj[key] =
                  value instanceof File ? `[File: ${value.name}]` : value;
              });
              captureData.requestBody = formObj;
            } else {
              captureData.requestBody = "[Non-string body]";
            }
          } catch {
            captureData.requestBody = options.body;
          }
        }

        // Parse response body (async, but we don't await in finally)
        if (response) {
          tryParseBody(response).then((body) => {
            captureData.responseBody = body;
            sendToContentScript(captureData);
          });
        } else {
          sendToContentScript(captureData);
        }
      }
    }

    return response;
  };

  // ========== XHR INTERCEPTOR ==========
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  const originalXHRSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._hhCapture = {
      method: method,
      url: url,
      requestHeaders: {},
      startTime: null,
    };
    return originalXHROpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
    if (this._hhCapture) {
      this._hhCapture.requestHeaders[name] = value;
    }
    return originalXHRSetRequestHeader.call(this, name, value);
  };

  XMLHttpRequest.prototype.send = function (body) {
    if (this._hhCapture && shouldCapture(this._hhCapture.url)) {
      this._hhCapture.startTime = Date.now();
      this._hhCapture.requestBody = null;

      // Parse request body
      if (body) {
        try {
          if (typeof body === "string") {
            this._hhCapture.requestBody = JSON.parse(body);
          } else if (body instanceof FormData) {
            const formObj = {};
            body.forEach((value, key) => {
              formObj[key] =
                value instanceof File ? `[File: ${value.name}]` : value;
            });
            this._hhCapture.requestBody = formObj;
          } else {
            this._hhCapture.requestBody = "[Non-string body]";
          }
        } catch {
          this._hhCapture.requestBody = body;
        }
      }

      // Listen for completion
      this.addEventListener("loadend", () => {
        const captureData = {
          timestamp: new Date().toISOString(),
          type: "xhr",
          method: this._hhCapture.method.toUpperCase(),
          url: this._hhCapture.url,
          requestHeaders: this._hhCapture.requestHeaders,
          requestBody: this._hhCapture.requestBody,
          status: this.status,
          statusText: this.statusText,
          responseHeaders: {},
          responseBody: null,
          duration: Date.now() - this._hhCapture.startTime,
          error: null,
        };

        // Parse response headers
        const headerString = this.getAllResponseHeaders();
        if (headerString) {
          headerString.split("\r\n").forEach((line) => {
            const parts = line.split(": ");
            if (parts.length === 2) {
              captureData.responseHeaders[parts[0]] = parts[1];
            }
          });
        }

        // Parse response body
        try {
          const contentType = this.getResponseHeader("content-type") || "";
          if (contentType.includes("application/json")) {
            captureData.responseBody = JSON.parse(this.responseText);
          } else if (contentType.includes("text/")) {
            captureData.responseBody = this.responseText.substring(0, 5000);
          } else {
            captureData.responseBody = "[Binary or non-text response]";
          }
        } catch {
          captureData.responseBody =
            this.responseText?.substring(0, 5000) || "[Failed to parse]";
        }

        sendToContentScript(captureData);
      });
    }

    return originalXHRSend.call(this, body);
  };

  // Signal that interceptor is loaded
  console.log("[HH AutoApply] Network interceptor loaded");
  window.postMessage({ type: "HH_INTERCEPTOR_READY" }, "*");
})();

/**
 * HH.ru Network Injector - Content Script
 *
 * This content script runs in the isolated world and:
 * 1. Injects network-interceptor.js into the page's main world
 * 2. Listens for captured network requests via postMessage
 * 3. Forwards them to the background script for storage
 */

(() => {
  let researchModeEnabled = false;
  let interceptorReady = false;

  // Check if research mode is enabled
  async function checkResearchMode() {
    try {
      const result = await chrome.storage.local.get("researchMode");
      researchModeEnabled = result.researchMode === true;
      return researchModeEnabled;
    } catch (e) {
      console.error("[ApplyHawk] Failed to check research mode:", e);
      return false;
    }
  }

  // Inject the interceptor script into page's main world
  function injectInterceptor() {
    if (document.querySelector("script[data-hh-interceptor]")) {
      console.log("[ApplyHawk] Interceptor already injected");
      return;
    }

    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("core/utils/network-interceptor.js");
    script.dataset.hhInterceptor = "true";
    script.onload = () => {
      console.log("[ApplyHawk] Interceptor script loaded");
    };
    script.onerror = (e) => {
      console.error("[ApplyHawk] Failed to load interceptor:", e);
    };

    (document.head || document.documentElement).appendChild(script);
  }

  // Listen for messages from injected script
  function setupMessageListener() {
    window.addEventListener("message", async (event) => {
      // Only accept messages from our interceptor
      if (event.source !== window) return;
      if (!event.data || typeof event.data !== "object") return;

      if (event.data.type === "HH_INTERCEPTOR_READY") {
        interceptorReady = true;
        console.log("[ApplyHawk] Interceptor is ready");
        return;
      }

      if (event.data.type === "HH_NETWORK_CAPTURE" && researchModeEnabled) {
        const capturedRequest = event.data.payload;

        // Add page context
        capturedRequest.pageUrl = window.location.href;
        capturedRequest.pageTitle = document.title;

        // Send to background script
        try {
          await chrome.runtime.sendMessage({
            type: "CAPTURE_REQUEST",
            data: capturedRequest,
          });
        } catch (e) {
          // Background script might not be ready yet
          console.warn("[ApplyHawk] Failed to send capture:", e);
        }
      }
    });
  }

  // Listen for research mode changes
  function setupStorageListener() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === "local" && changes.researchMode) {
        researchModeEnabled = changes.researchMode.newValue === true;
        console.log(
          "[ApplyHawk] Research mode:",
          researchModeEnabled ? "ON" : "OFF",
        );

        // Inject interceptor if just enabled and not yet injected
        if (
          researchModeEnabled &&
          !document.querySelector("script[data-hh-interceptor]")
        ) {
          injectInterceptor();
        }
      }
    });
  }

  // Initialize
  async function init() {
    // Check if research mode is enabled
    await checkResearchMode();

    // Always set up listeners
    setupMessageListener();
    setupStorageListener();

    // Inject interceptor if research mode is on
    if (researchModeEnabled) {
      injectInterceptor();
    }

    console.log(
      "[ApplyHawk] Injector initialized, research mode:",
      researchModeEnabled,
    );
  }

  // Run when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

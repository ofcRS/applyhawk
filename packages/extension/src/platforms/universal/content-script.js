/**
 * Universal Job Page Content Script
 * Adds ApplyHawk button to detected job pages
 */

import { detectJobPage, extractJobContent } from "./detector.js";

// Don't run on HH.ru - it has its own optimized integration
if (window.location.hostname.includes("hh.ru")) {
  console.log("[ApplyHawk] HH.ru detected, using dedicated integration");
} else {
  // Detect job page after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    // Small delay to let dynamic content load
    setTimeout(init, 1000);
  }

  // Handle SPA navigation (LinkedIn, etc.) - detect URL changes
  let lastUrl = location.href;
  const urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      console.log("[ApplyHawk] URL changed, re-initializing...");
      // Delay to let new content load
      setTimeout(init, 1500);
    }
  });
  urlObserver.observe(document.body, { subtree: true, childList: true });
}

function init() {
  const detection = detectJobPage();

  if (!detection.isJobPage || detection.confidence < 0.4) {
    console.log("[ApplyHawk] Not a job page or low confidence:", detection);
    return;
  }

  console.log("[ApplyHawk] Job page detected:", detection);
  injectApplyHawkButton(detection);
}

function injectApplyHawkButton(detection) {
  // Check if button already exists
  if (document.getElementById("applyhawk-button")) {
    return;
  }

  // Create floating button
  const button = document.createElement("button");
  button.id = "applyhawk-button";
  button.innerHTML = `
    <span class="applyhawk-icon">🦅</span>
    <span class="applyhawk-text">ApplyHawk</span>
  `;

  // Add styles
  const styles = document.createElement("style");
  styles.textContent = `
    #applyhawk-button {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: linear-gradient(135deg, #2563eb, #7c3aed);
      color: white;
      border: none;
      border-radius: 50px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
      transition: all 0.2s ease;
      animation: applyhawk-slide-in 0.4s ease;
    }

    #applyhawk-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.5);
    }

    #applyhawk-button:active {
      transform: translateY(0);
    }

    #applyhawk-button .applyhawk-icon {
      font-size: 18px;
    }

    #applyhawk-button.applyhawk-loading {
      pointer-events: none;
      opacity: 0.8;
    }

    #applyhawk-button.applyhawk-loading .applyhawk-text::after {
      content: '...';
      animation: applyhawk-dots 1.5s infinite;
    }

    @keyframes applyhawk-slide-in {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes applyhawk-dots {
      0%, 20% { content: '.'; }
      40% { content: '..'; }
      60%, 100% { content: '...'; }
    }

    /* Modal styles */
    #applyhawk-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 9999999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.5);
      animation: applyhawk-fade-in 0.2s ease;
    }

    #applyhawk-modal-content {
      background: white;
      border-radius: 12px;
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      overflow: auto;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      animation: applyhawk-scale-in 0.2s ease;
    }

    #applyhawk-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid #e5e7eb;
    }

    #applyhawk-modal-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    #applyhawk-modal-close {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      border-radius: 6px;
      font-size: 20px;
      color: #6b7280;
      cursor: pointer;
    }

    #applyhawk-modal-close:hover {
      background: #f3f4f6;
      color: #1f2937;
    }

    #applyhawk-modal-body {
      padding: 20px;
    }

    @keyframes applyhawk-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes applyhawk-scale-in {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `;

  document.head.appendChild(styles);
  document.body.appendChild(button);

  // Handle click
  button.addEventListener("click", async () => {
    button.classList.add("applyhawk-loading");
    button.querySelector(".applyhawk-text").textContent = "Processing";

    try {
      const jobContent = extractJobContent();

      // Send to background script
      const response = await chrome.runtime.sendMessage({
        type: "UNIVERSAL_JOB_DETECTED",
        payload: {
          ...jobContent,
          detection,
        },
      });

      if (response?.success) {
        if (!response.panelOpened) {
          // Side panel couldn't be opened programmatically
          showModal({
            title: "Job Saved!",
            content: `
              <p style="margin-bottom: 12px;">Job details captured successfully.</p>
              <p>Click the <strong>ApplyHawk extension icon</strong> in your toolbar to open the side panel and generate your resume.</p>
            `,
          });
        }
      } else {
        showModal({
          title: "Configure ApplyHawk",
          content: `
            <p style="margin-bottom: 16px;">To use ApplyHawk, please configure your settings:</p>
            <ol style="margin-left: 20px; margin-bottom: 16px;">
              <li>Click the ApplyHawk extension icon</li>
              <li>Go to Settings</li>
              <li>Enter your OpenRouter API key</li>
              <li>Fill in your base resume</li>
            </ol>
            <p style="color: #6b7280; font-size: 14px;">
              Get an API key at <a href="https://openrouter.ai/keys" target="_blank" style="color: #2563eb;">openrouter.ai/keys</a>
            </p>
          `,
        });
      }
    } catch (error) {
      console.error("[ApplyHawk] Error:", error);
      showModal({
        title: "Error",
        content: `<p style="color: #dc2626;">${error.message}</p>`,
      });
    } finally {
      button.classList.remove("applyhawk-loading");
      button.querySelector(".applyhawk-text").textContent = "ApplyHawk";
    }
  });
}

function showModal({ title, content }) {
  // Remove existing modal
  const existing = document.getElementById("applyhawk-modal");
  if (existing) {
    existing.remove();
  }

  const modal = document.createElement("div");
  modal.id = "applyhawk-modal";
  modal.innerHTML = `
    <div id="applyhawk-modal-content">
      <div id="applyhawk-modal-header">
        <h2>🦅 ${title}</h2>
        <button id="applyhawk-modal-close">✕</button>
      </div>
      <div id="applyhawk-modal-body">
        ${content}
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close handlers
  modal
    .querySelector("#applyhawk-modal-close")
    .addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
}

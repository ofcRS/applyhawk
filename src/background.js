/**
 * JobGenius Background Service Worker
 * Entry point that initializes the message router and platform handlers
 */

import { initMessageRouter } from "./core/background/message-router.js";
import { registerHHHandlers } from "./platforms/hh/handlers/hh-handlers.js";

// Initialize core message router
initMessageRouter();

// Register platform-specific handlers
registerHHHandlers();

// Future platforms can be registered here:
// registerLinkedInHandlers();
// registerIndeedHandlers();

console.log("JobGenius background service worker started");

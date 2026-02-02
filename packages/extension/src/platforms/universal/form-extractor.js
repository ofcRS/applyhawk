/**
 * Form Field Extractor
 * Injected into ATS pages via chrome.scripting.executeScript()
 * Extracts all form fields with their metadata for AI-powered form filling
 */

(function extractFormFields() {
  /**
   * Generate a unique CSS selector for an element
   */
  function getUniqueSelector(el) {
    if (el.id) {
      return `#${CSS.escape(el.id)}`;
    }

    if (el.name) {
      const tag = el.tagName.toLowerCase();
      const nameSelector = `${tag}[name="${CSS.escape(el.name)}"]`;
      if (document.querySelectorAll(nameSelector).length === 1) {
        return nameSelector;
      }
    }

    // Build path from element to a unique ancestor
    const parts = [];
    let current = el;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector = `#${CSS.escape(current.id)}`;
        parts.unshift(selector);
        break;
      }

      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (c) => c.tagName === current.tagName,
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }

      parts.unshift(selector);
      current = parent;
    }

    return parts.join(" > ");
  }

  /**
   * Find the label text for a form element
   */
  function getLabel(el) {
    // 1. Check for associated <label> via "for" attribute
    if (el.id) {
      const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (label) return label.textContent.trim();
    }

    // 2. Check parent <label>
    const parentLabel = el.closest("label");
    if (parentLabel) {
      // Get text content excluding the input itself
      const clone = parentLabel.cloneNode(true);
      const inputs = clone.querySelectorAll("input, select, textarea");
      inputs.forEach((i) => i.remove());
      const text = clone.textContent.trim();
      if (text) return text;
    }

    // 3. Check aria-label / aria-labelledby
    if (el.getAttribute("aria-label")) {
      return el.getAttribute("aria-label").trim();
    }

    if (el.getAttribute("aria-labelledby")) {
      const labelEl = document.getElementById(
        el.getAttribute("aria-labelledby"),
      );
      if (labelEl) return labelEl.textContent.trim();
    }

    // 4. Look for preceding sibling or parent label-like elements
    const prev = el.previousElementSibling;
    if (
      prev &&
      (prev.tagName === "LABEL" ||
        prev.tagName === "SPAN" ||
        prev.tagName === "DIV")
    ) {
      const text = prev.textContent.trim();
      if (text && text.length < 100) return text;
    }

    // 5. Check parent for common label patterns
    const parent = el.parentElement;
    if (parent) {
      const labelEl = parent.querySelector(
        "label, .label, [class*='label'], [class*='Label']",
      );
      if (labelEl && labelEl !== el) {
        const text = labelEl.textContent.trim();
        if (text && text.length < 100) return text;
      }
    }

    // 6. Use placeholder as fallback
    if (el.placeholder) return el.placeholder;

    // 7. Use name attribute as last resort
    if (el.name) {
      return el.name
        .replace(/([A-Z])/g, " $1")
        .replace(/[_-]/g, " ")
        .trim();
    }

    return "";
  }

  /**
   * Check if element is visible and interactable
   */
  function isVisible(el) {
    if (el.offsetParent === null && el.style.position !== "fixed") return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (style.opacity === "0") return false;
    return true;
  }

  /**
   * Get options for select elements and radio groups
   */
  function getOptions(el) {
    if (el.tagName === "SELECT") {
      return Array.from(el.options)
        .filter((opt) => opt.value !== "")
        .map((opt) => ({
          value: opt.value,
          text: opt.textContent.trim(),
          selected: opt.selected,
        }));
    }

    // Radio group
    if (el.type === "radio" && el.name) {
      return Array.from(document.querySelectorAll(`input[name="${CSS.escape(el.name)}"]`))
        .map((radio) => ({
          value: radio.value,
          text: getLabel(radio) || radio.value,
          selected: radio.checked,
        }));
    }

    return null;
  }

  // Collect all form fields
  const fields = [];
  const processedRadioGroups = new Set();

  // Query all input-like elements
  const selectors = [
    "input:not([type='hidden']):not([type='submit']):not([type='button']):not([type='reset']):not([type='image'])",
    "textarea",
    "select",
    "[contenteditable='true']",
  ];

  const allElements = document.querySelectorAll(selectors.join(", "));

  for (const el of allElements) {
    // Skip hidden/disabled
    if (el.disabled) continue;
    if (!isVisible(el)) continue;

    const type = el.tagName === "SELECT"
      ? "select"
      : el.tagName === "TEXTAREA"
        ? "textarea"
        : el.getAttribute("contenteditable")
          ? "contenteditable"
          : el.type || "text";

    // Skip duplicate radio buttons (group by name)
    if (type === "radio" && el.name) {
      if (processedRadioGroups.has(el.name)) continue;
      processedRadioGroups.add(el.name);
    }

    // Mark file inputs
    if (type === "file") {
      fields.push({
        id: el.id || null,
        name: el.name || null,
        type: "file",
        label: getLabel(el),
        placeholder: null,
        required: el.required || false,
        options: null,
        currentValue: null,
        selector: getUniqueSelector(el),
        note: "Manual upload required",
      });
      continue;
    }

    const options = getOptions(el);
    const currentValue =
      type === "contenteditable"
        ? el.textContent?.trim() || ""
        : type === "checkbox"
          ? el.checked
          : el.value || "";

    fields.push({
      id: el.id || null,
      name: el.name || null,
      type,
      label: getLabel(el),
      placeholder: el.placeholder || null,
      required: el.required || el.getAttribute("aria-required") === "true",
      options,
      currentValue,
      selector: getUniqueSelector(el),
    });
  }

  return {
    pageTitle: document.title,
    pageUrl: window.location.href,
    fields,
  };
})();

/**
 * Vacancy page parser
 * Extracts vacancy data from HH.ru DOM
 */

/**
 * Parse vacancy data from page DOM
 */
export function parseVacancy(doc = document) {
  try {
    const vacancy = {
      name: parseVacancyTitle(doc),
      company: parseCompanyName(doc),
      description: parseDescription(doc),
      keySkills: parseKeySkills(doc),
      salary: parseSalary(doc),
      experience: parseExperience(doc),
      employment: parseEmployment(doc),
      responseLetterRequired: parseResponseLetterRequired(doc),
    };

    return vacancy;
  } catch (error) {
    console.error("Failed to parse vacancy:", error);
    return null;
  }
}

/**
 * Parse vacancy title
 */
function parseVacancyTitle(doc) {
  const titleEl =
    doc.querySelector('[data-qa="vacancy-title"]') ||
    doc.querySelector("h1.bloko-header-section-1");

  return titleEl?.textContent?.trim() || "";
}

/**
 * Parse company name
 */
function parseCompanyName(doc) {
  const companyEl =
    doc.querySelector('[data-qa="vacancy-company-name"]') ||
    doc.querySelector(".vacancy-company-name");

  return companyEl?.textContent?.trim() || "";
}

/**
 * Parse vacancy description
 */
function parseDescription(doc) {
  const descEl =
    doc.querySelector('[data-qa="vacancy-description"]') ||
    doc.querySelector(".vacancy-description");

  return descEl?.innerHTML || "";
}

/**
 * Parse key skills
 */
function parseKeySkills(doc) {
  const skillsContainer = doc.querySelector(
    '[data-qa="skills-element"]',
  )?.parentElement;
  if (!skillsContainer) return [];

  const skillEls = skillsContainer.querySelectorAll(
    '[data-qa="skills-element"]',
  );
  return Array.from(skillEls)
    .map((el) => el.textContent?.trim())
    .filter(Boolean);
}

/**
 * Parse salary
 */
function parseSalary(doc) {
  const salaryEl = doc.querySelector('[data-qa="vacancy-salary"]');
  if (!salaryEl) return null;

  const text = salaryEl.textContent?.trim() || "";

  // Try to extract numbers from salary string
  const numbers = text.match(/\d[\d\s]*\d|\d/g);
  if (!numbers) return { text };

  const cleanNumbers = numbers.map((n) =>
    Number.parseInt(n.replace(/\s/g, ""), 10),
  );

  return {
    text,
    from: cleanNumbers[0] || null,
    to: cleanNumbers[1] || null,
  };
}

/**
 * Parse experience requirement
 */
function parseExperience(doc) {
  const expEl = doc.querySelector('[data-qa="vacancy-experience"]');
  return expEl?.textContent?.trim() || "";
}

/**
 * Parse employment type
 */
function parseEmployment(doc) {
  const employmentEl = doc.querySelector(
    '[data-qa="vacancy-view-employment-mode"]',
  );
  return employmentEl?.textContent?.trim() || "";
}

/**
 * Check if response letter is required
 */
function parseResponseLetterRequired(doc) {
  // Look for text indicating cover letter is required
  const pageText = doc.body?.textContent || "";
  return (
    pageText.includes("сопроводительное письмо обязательно") ||
    pageText.includes("Сопроводительное письмо обязательно")
  );
}

/**
 * Strip HTML tags from text
 */
export function stripHtml(html) {
  if (!html) return "";
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || "";
}

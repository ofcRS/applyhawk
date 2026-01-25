/**
 * PDF Resume Generator
 * Generates professional PDF resumes using pdf-lib with Cyrillic support
 * Template based on professional CV format with centered header and clean section styling
 */

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// A4 page dimensions in points (72 points = 1 inch)
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// Colors - clean black/gray palette
const COLORS = {
  text: rgb(0, 0, 0), // Pure black for text
  secondary: rgb(0.4, 0.4, 0.4), // Gray for dates/meta
  divider: rgb(0, 0, 0), // Black for divider lines
};

// Font sizes - adjusted to match template
const SIZES = {
  name: 26, // Larger name
  title: 11, // Subtitle/position
  sectionHeader: 11, // Section headers
  body: 10, // Body text
  small: 9, // Dates and meta
};

// Line heights (multiplier of font size)
const LINE_HEIGHT = 1.4;

// Bullet character
const BULLET = "•";

/**
 * Load Noto Sans fonts for Cyrillic support
 * @param {PDFDocument} pdfDoc - PDF document instance
 * @returns {Promise<{regular: PDFFont, bold: PDFFont}>}
 */
async function loadFonts(pdfDoc) {
  pdfDoc.registerFontkit(fontkit);

  try {
    // Load custom fonts from extension's fonts folder
    const regularUrl = chrome.runtime.getURL("fonts/NotoSans-Regular.ttf");
    const boldUrl = chrome.runtime.getURL("fonts/NotoSans-Bold.ttf");

    const [regularBytes, boldBytes] = await Promise.all([
      fetch(regularUrl).then((res) => res.arrayBuffer()),
      fetch(boldUrl).then((res) => res.arrayBuffer()),
    ]);

    const regular = await pdfDoc.embedFont(regularBytes);
    const bold = await pdfDoc.embedFont(boldBytes);

    return { regular, bold };
  } catch (error) {
    console.warn(
      "[PDF Generator] Failed to load Noto Sans fonts, falling back to Helvetica:",
      error,
    );
    // Fallback to standard fonts (no Cyrillic support)
    const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    return { regular, bold };
  }
}

/**
 * Get text width for centering calculations
 */
function getTextWidth(text, font, fontSize) {
  return font.widthOfTextAtSize(text, fontSize);
}

/**
 * Draw centered text
 */
function drawCenteredText(page, text, y, font, fontSize, color) {
  const textWidth = getTextWidth(text, font, fontSize);
  const x = (PAGE_WIDTH - textWidth) / 2;
  page.drawText(text, {
    x,
    y,
    size: fontSize,
    font,
    color,
  });
}

/**
 * Wrap text to fit within a specified width
 * @param {string} text - Text to wrap
 * @param {PDFFont} font - Font to use
 * @param {number} fontSize - Font size
 * @param {number} maxWidth - Maximum width in points
 * @returns {string[]} - Array of lines
 */
function wrapText(text, font, fontSize, maxWidth) {
  if (!text) return [];

  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Draw text with automatic wrapping
 * @returns {number} - New Y position after drawing
 */
function drawWrappedText(page, text, x, y, font, fontSize, maxWidth, color) {
  const lines = wrapText(text, font, fontSize, maxWidth);
  let currentY = y;

  for (const line of lines) {
    page.drawText(line, {
      x,
      y: currentY,
      size: fontSize,
      font,
      color,
    });
    currentY -= fontSize * LINE_HEIGHT;
  }

  return currentY;
}

/**
 * Draw a horizontal divider line (full width, black)
 */
function drawDivider(page, y, thickness = 0.5) {
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness,
    color: COLORS.divider,
  });
}

/**
 * Draw section header with underline
 * Format: BOLD UPPERCASE TEXT with horizontal line underneath
 * @returns {number} - New Y position
 */
function drawSectionHeader(page, title, y, fonts) {
  // Draw title in bold uppercase
  page.drawText(title.toUpperCase(), {
    x: MARGIN,
    y,
    size: SIZES.sectionHeader,
    font: fonts.bold,
    color: COLORS.text,
  });

  // Draw underline
  const underlineY = y - 4;
  drawDivider(page, underlineY, 0.5);

  return y - 20;
}

/**
 * Format date in abbreviated format: "Feb '25"
 * @param {string} date - Date string (YYYY-MM-DD or similar)
 * @returns {string} - Formatted date
 */
function formatDateShort(date) {
  if (!date) return "Present";

  try {
    const d = new Date(date);
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const year = d.getFullYear().toString().slice(-2);
    return `${months[d.getMonth()]} '${year}`;
  } catch {
    return date;
  }
}

/**
 * Parse description into bullet points
 * Splits by newlines, periods followed by capital letters, or existing bullet markers
 * @param {string} description - Description text
 * @returns {string[]} - Array of bullet points
 */
function parseBulletPoints(description) {
  if (!description) return [];

  // First, split by explicit newlines or bullet markers
  let points = description
    .split(/[\n\r]+|(?:^|\s)[•\-\*]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // If we only got one long paragraph, try to split by sentences
  if (points.length === 1 && points[0].length > 100) {
    // Split by period followed by space and capital letter
    points = points[0]
      .split(/\.\s+(?=[A-ZА-ЯЁ])/)
      .map((s) => s.trim().replace(/\.$/, ""))
      .filter((s) => s.length > 0);
  }

  return points;
}

/**
 * Draw bullet points list
 * @returns {number} - New Y position after drawing
 */
function drawBulletPoints(page, points, x, y, font, fontSize, maxWidth, color) {
  const bulletIndent = 15;
  let currentY = y;

  for (const point of points) {
    // Draw bullet
    page.drawText(BULLET, {
      x,
      y: currentY,
      size: fontSize,
      font,
      color,
    });

    // Draw text with wrapping, indented after bullet
    const lines = wrapText(point, font, fontSize, maxWidth - bulletIndent);
    for (let i = 0; i < lines.length; i++) {
      page.drawText(lines[i], {
        x: x + bulletIndent,
        y: currentY,
        size: fontSize,
        font,
        color,
      });
      currentY -= fontSize * LINE_HEIGHT;
    }
  }

  return currentY;
}

/**
 * Generate a PDF resume from personalized resume data
 *
 * @param {Object} personalizedResume - Personalized resume data (experience, keySkills, title)
 * @param {Object} baseResume - Base resume data (fullName, education, contacts, summary)
 * @returns {Promise<Uint8Array>} - PDF file as byte array
 */
export async function generatePdfResume(personalizedResume, baseResume) {
  const pdfDoc = await PDFDocument.create();
  const fonts = await loadFonts(pdfDoc);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  // ========== HEADER: Centered Name ==========
  const fullName = baseResume.fullName || "Name Not Specified";
  drawCenteredText(page, fullName, y, fonts.bold, SIZES.name, COLORS.text);
  y -= SIZES.name + 10;

  // ========== CONTACTS: Centered line ==========
  const contacts = [];
  if (baseResume.contacts?.email) contacts.push(baseResume.contacts.email);
  if (baseResume.contacts?.phone) contacts.push(baseResume.contacts.phone);
  if (baseResume.contacts?.linkedin)
    contacts.push(baseResume.contacts.linkedin);
  if (baseResume.contacts?.telegram)
    contacts.push(baseResume.contacts.telegram);

  if (contacts.length > 0) {
    const contactLine = contacts.join("  |  ");
    drawCenteredText(
      page,
      contactLine,
      y,
      fonts.regular,
      SIZES.small,
      COLORS.secondary,
    );
    y -= SIZES.small + 25;
  }

  // ========== PROFILE (Summary) ==========
  if (baseResume.summary) {
    y = drawSectionHeader(page, "Profile", y, fonts);
    y = drawWrappedText(
      page,
      baseResume.summary,
      MARGIN,
      y,
      fonts.regular,
      SIZES.body,
      CONTENT_WIDTH,
      COLORS.text,
    );
    y -= 20;
  }

  // ========== KEY SKILLS ==========
  const skills = personalizedResume.keySkills || baseResume.skills || [];
  if (skills.length > 0) {
    y = drawSectionHeader(page, "Key Skills", y, fonts);

    // Render skills as comma-separated list
    const skillsText = skills.join(", ");
    y = drawWrappedText(
      page,
      skillsText,
      MARGIN,
      y,
      fonts.regular,
      SIZES.body,
      CONTENT_WIDTH,
      COLORS.text,
    );
    y -= 20;
  }

  // ========== CAREER HISTORY (Experience) ==========
  const experience =
    personalizedResume.experience || baseResume.experience || [];
  if (experience.length > 0) {
    y = drawSectionHeader(page, "Career History", y, fonts);

    for (const exp of experience) {
      // Check if we need a new page
      if (y < 120) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
      }

      // Format: "Feb '25 – Present: Company Name (description) – Position"
      const startDate = formatDateShort(exp.startDate);
      const endDate = exp.endDate ? formatDateShort(exp.endDate) : "Present";
      const company = exp.companyName || exp.company || "Company";
      const position = exp.position || "Position";
      const companyDesc = exp.companyDescription || "";

      // Build the header line
      const headerLine = `${startDate} – ${endDate}: `;
      const headerLineWidth = getTextWidth(
        headerLine,
        fonts.regular,
        SIZES.body,
      );

      // Draw date range in regular font
      page.drawText(headerLine, {
        x: MARGIN,
        y,
        size: SIZES.body,
        font: fonts.regular,
        color: COLORS.text,
      });

      // Draw company name in bold
      let xOffset = MARGIN + headerLineWidth;
      const companyText = companyDesc ? `${company} ` : company;
      page.drawText(companyText, {
        x: xOffset,
        y,
        size: SIZES.body,
        font: fonts.bold,
        color: COLORS.text,
      });
      xOffset += getTextWidth(companyText, fonts.bold, SIZES.body);

      // Draw company description in regular if present
      if (companyDesc) {
        const descText = `(${companyDesc}) `;
        page.drawText(descText, {
          x: xOffset,
          y,
          size: SIZES.body,
          font: fonts.regular,
          color: COLORS.text,
        });
        xOffset += getTextWidth(descText, fonts.regular, SIZES.body);
      }

      // Draw separator and position
      const separator = "– ";
      page.drawText(separator, {
        x: xOffset,
        y,
        size: SIZES.body,
        font: fonts.regular,
        color: COLORS.text,
      });
      xOffset += getTextWidth(separator, fonts.regular, SIZES.body);

      page.drawText(position, {
        x: xOffset,
        y,
        size: SIZES.body,
        font: fonts.bold,
        color: COLORS.text,
      });

      y -= SIZES.body * LINE_HEIGHT + 3;

      // Description as bullet points
      if (exp.description) {
        const bulletPoints = parseBulletPoints(exp.description);
        if (bulletPoints.length > 0) {
          y = drawBulletPoints(
            page,
            bulletPoints,
            MARGIN,
            y,
            fonts.regular,
            SIZES.body,
            CONTENT_WIDTH,
            COLORS.text,
          );
        }
      }

      y -= 10;
    }
  }

  // ========== QUALIFICATIONS (Education) ==========
  const education = baseResume.education || [];
  if (education.length > 0) {
    // Check if we need a new page
    if (y < 100) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }

    // Draw divider line above qualifications section
    y -= 5;
    drawDivider(page, y, 0.5);
    y -= 15;

    y = drawSectionHeader(page, "Qualifications", y, fonts);

    for (const edu of education) {
      const institution = edu.institution || edu.name || "Institution";
      const degree = edu.degree || edu.faculty || "";
      const year = edu.year || edu.graduationYear || "";

      // Format: "Year – Degree, University"
      let eduLine = "";
      if (year) {
        eduLine = `${year} – `;
      }

      // Draw year in regular
      if (year) {
        page.drawText(eduLine, {
          x: MARGIN,
          y,
          size: SIZES.body,
          font: fonts.regular,
          color: COLORS.text,
        });
      }

      const yearWidth = year
        ? getTextWidth(eduLine, fonts.regular, SIZES.body)
        : 0;

      // Draw degree in bold if present
      if (degree) {
        page.drawText(degree, {
          x: MARGIN + yearWidth,
          y,
          size: SIZES.body,
          font: fonts.bold,
          color: COLORS.text,
        });
        const degreeWidth = getTextWidth(degree, fonts.bold, SIZES.body);

        // Draw institution
        const instText = `, ${institution}`;
        page.drawText(instText, {
          x: MARGIN + yearWidth + degreeWidth,
          y,
          size: SIZES.body,
          font: fonts.regular,
          color: COLORS.text,
        });
      } else {
        // Just institution
        page.drawText(institution, {
          x: MARGIN + yearWidth,
          y,
          size: SIZES.body,
          font: fonts.bold,
          color: COLORS.text,
        });
      }

      y -= SIZES.body * LINE_HEIGHT + 5;
    }
  }

  // Generate PDF bytes
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

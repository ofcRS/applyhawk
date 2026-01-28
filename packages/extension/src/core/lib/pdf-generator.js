/**
 * PDF Resume Generator
 * Generates professional PDF resumes using pdf-lib with Cyrillic support
 * Template based on professional CV format with centered header and clean section styling
 */

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFName, PDFString, StandardFonts, rgb } from "pdf-lib";

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
 * Load Noto Serif fonts for Cyrillic support (professional serif look)
 * @param {PDFDocument} pdfDoc - PDF document instance
 * @returns {Promise<{regular: PDFFont, bold: PDFFont}>}
 */
async function loadFonts(pdfDoc) {
  pdfDoc.registerFontkit(fontkit);

  try {
    // Load custom fonts from extension's fonts folder (Serif for professional look with Cyrillic support)
    const regularUrl = chrome.runtime.getURL("fonts/NotoSerif-Regular.ttf");
    const boldUrl = chrome.runtime.getURL("fonts/NotoSerif-Bold.ttf");

    const [regularBytes, boldBytes] = await Promise.all([
      fetch(regularUrl).then((res) => res.arrayBuffer()),
      fetch(boldUrl).then((res) => res.arrayBuffer()),
    ]);

    const regular = await pdfDoc.embedFont(regularBytes);
    const bold = await pdfDoc.embedFont(boldBytes);

    return { regular, bold };
  } catch (error) {
    console.warn(
      "[PDF Generator] Failed to load Noto Serif fonts, falling back to Times Roman:",
      error,
    );
    // Fallback to Times Roman (serif, but no Cyrillic support)
    const regular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const bold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
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
 * Draw justified text (both edges aligned)
 * Last line of each paragraph is left-aligned (standard justification)
 * @returns {number} - New Y position after drawing
 */
function drawJustifiedText(page, text, x, y, font, fontSize, maxWidth, color) {
  const lines = wrapText(text, font, fontSize, maxWidth);
  let currentY = y;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isLastLine = i === lines.length - 1;

    if (isLastLine || line.trim().length === 0) {
      // Last line: left-aligned
      page.drawText(line, {
        x,
        y: currentY,
        size: fontSize,
        font,
        color,
      });
    } else {
      // Other lines: justified
      const words = line.split(" ").filter((w) => w.length > 0);
      if (words.length <= 1) {
        page.drawText(line, {
          x,
          y: currentY,
          size: fontSize,
          font,
          color,
        });
      } else {
        // Calculate total width of words without spaces
        let wordsWidth = 0;
        for (const word of words) {
          wordsWidth += font.widthOfTextAtSize(word, fontSize);
        }

        // Calculate space width to distribute
        const totalSpaceWidth = maxWidth - wordsWidth;
        const spaceWidth = totalSpaceWidth / (words.length - 1);

        // Draw each word with calculated spacing
        let xPos = x;
        for (let j = 0; j < words.length; j++) {
          page.drawText(words[j], {
            x: xPos,
            y: currentY,
            size: fontSize,
            font,
            color,
          });
          xPos += font.widthOfTextAtSize(words[j], fontSize);
          if (j < words.length - 1) {
            xPos += spaceWidth;
          }
        }
      }
    }
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
 * Splits by newlines first, then strips bullet markers from each line
 * Deduplicates entries to avoid repetition
 * @param {string} description - Description text
 * @returns {string[]} - Array of bullet points
 */
function parseBulletPoints(description) {
  if (!description) return [];

  // Split by newlines first
  let points = description
    .split(/[\n\r]+/)
    .map((line) => {
      // Strip leading bullet markers (•, -, *) from each line
      return line.replace(/^[\s]*[•\-\*][\s]+/, "").trim();
    })
    .filter((s) => s.length > 0);

  // If we only got one long paragraph, try to split by sentences
  if (points.length === 1 && points[0].length > 100) {
    // Split by period followed by space and capital letter
    points = points[0]
      .split(/\.\s+(?=[A-ZА-ЯЁ])/)
      .map((s) => s.trim().replace(/\.$/, ""))
      .filter((s) => s.length > 0);
  }

  // Deduplicate entries (case-insensitive comparison)
  const seen = new Set();
  points = points.filter((point) => {
    const normalized = point.toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });

  return points;
}

/**
 * Draw bullet points list with justified text
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

    // Draw text with wrapping and justification, indented after bullet
    const lines = wrapText(point, font, fontSize, maxWidth - bulletIndent);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isLastLine = i === lines.length - 1;

      if (isLastLine || line.trim().length === 0) {
        // Last line: left-aligned
        page.drawText(line, {
          x: x + bulletIndent,
          y: currentY,
          size: fontSize,
          font,
          color,
        });
      } else {
        // Other lines: justified
        const words = line.split(" ").filter((w) => w.length > 0);
        if (words.length <= 1) {
          page.drawText(line, {
            x: x + bulletIndent,
            y: currentY,
            size: fontSize,
            font,
            color,
          });
        } else {
          let wordsWidth = 0;
          for (const word of words) {
            wordsWidth += font.widthOfTextAtSize(word, fontSize);
          }
          const totalSpaceWidth = maxWidth - bulletIndent - wordsWidth;
          const spaceWidth = totalSpaceWidth / (words.length - 1);

          let xPos = x + bulletIndent;
          for (let j = 0; j < words.length; j++) {
            page.drawText(words[j], {
              x: xPos,
              y: currentY,
              size: fontSize,
              font,
              color,
            });
            xPos += font.widthOfTextAtSize(words[j], fontSize);
            if (j < words.length - 1) {
              xPos += spaceWidth;
            }
          }
        }
      }
      currentY -= fontSize * LINE_HEIGHT;
    }
  }

  return currentY;
}

/**
 * Get URL for a contact type
 * @param {string} type - Contact type (email, phone, linkedin, telegram)
 * @param {string} value - Contact value
 * @returns {string} - URL for the contact
 */
function getContactUrl(type, value) {
  switch (type) {
    case "email":
      return `mailto:${value}`;
    case "phone":
      // Clean phone number for tel: URL
      const cleanPhone = value.replace(/[^\d+]/g, "");
      return `tel:${cleanPhone}`;
    case "linkedin":
      // Handle both full URLs and just usernames
      if (value.startsWith("http")) return value;
      return `https://linkedin.com/in/${value.replace(/^@/, "")}`;
    case "telegram":
      // Handle both full URLs and just usernames
      if (value.startsWith("http")) return value;
      return `https://t.me/${value.replace(/^@/, "")}`;
    default:
      return value;
  }
}

/**
 * Draw text with a clickable link annotation
 * @param {PDFPage} page - PDF page to draw on
 * @param {PDFDocument} pdfDoc - PDF document instance
 * @param {string} text - Text to display
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {PDFFont} font - Font to use
 * @param {number} fontSize - Font size
 * @param {Object} color - Text color
 * @param {string} url - URL to link to
 */
function drawTextWithLink(
  page,
  pdfDoc,
  text,
  x,
  y,
  font,
  fontSize,
  color,
  url,
) {
  // Draw the text
  page.drawText(text, {
    x,
    y,
    size: fontSize,
    font,
    color,
  });

  // Calculate text dimensions for the link annotation
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const textHeight = fontSize;

  // Create link annotation
  const linkAnnotation = pdfDoc.context.obj({
    Type: PDFName.of("Annot"),
    Subtype: PDFName.of("Link"),
    Rect: [x, y - 2, x + textWidth, y + textHeight],
    Border: [0, 0, 0], // No visible border
    A: {
      Type: PDFName.of("Action"),
      S: PDFName.of("URI"),
      URI: PDFString.of(url),
    },
  });

  // Get or create the Annots array on the page
  const annots = page.node.get(PDFName.of("Annots"));
  if (annots) {
    annots.push(pdfDoc.context.register(linkAnnotation));
  } else {
    page.node.set(
      PDFName.of("Annots"),
      pdfDoc.context.obj([pdfDoc.context.register(linkAnnotation)]),
    );
  }

  return textWidth;
}

/**
 * Generate a PDF resume from personalized resume data
 *
 * @param {Object} personalizedResume - Personalized resume data (experience, keySkills, title)
 * @param {Object} baseResume - Base resume data (fullName, education, contacts, summary)
 * @returns {Promise<Uint8Array>} - PDF file as byte array
 */
export async function generatePdfResume(personalizedResume, baseResume) {
  console.log("[DEBUG:PDF] generatePdfResume called with:", {
    hasPersonalizedResume: !!personalizedResume,
    personalizedExperienceCount: personalizedResume?.experience?.length,
    personalizedKeySkillsCount: personalizedResume?.keySkills?.length,
    hasBaseResume: !!baseResume,
    baseExperienceCount: baseResume?.experience?.length,
    baseSkillsCount: baseResume?.skills?.length,
  });

  const pdfDoc = await PDFDocument.create();
  const fonts = await loadFonts(pdfDoc);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  // ========== HEADER: Centered Name (ALL CAPS) ==========
  const fullName = (baseResume.fullName || "Name Not Specified").toUpperCase();
  drawCenteredText(page, fullName, y, fonts.bold, SIZES.name, COLORS.text);
  y -= SIZES.name + 10;

  // ========== CONTACTS: Centered line with clickable links ==========
  const contactItems = [];
  if (baseResume.contacts?.email) {
    contactItems.push({ type: "email", value: baseResume.contacts.email });
  }
  if (baseResume.contacts?.phone) {
    contactItems.push({ type: "phone", value: baseResume.contacts.phone });
  }
  if (baseResume.contacts?.linkedin) {
    contactItems.push({
      type: "linkedin",
      value: baseResume.contacts.linkedin,
    });
  }
  if (baseResume.contacts?.telegram) {
    contactItems.push({
      type: "telegram",
      value: baseResume.contacts.telegram,
    });
  }

  if (contactItems.length > 0) {
    const separator = "  |  ";
    const separatorWidth = fonts.regular.widthOfTextAtSize(
      separator,
      SIZES.small,
    );

    // Calculate total width for centering
    let totalWidth = 0;
    for (let i = 0; i < contactItems.length; i++) {
      totalWidth += fonts.regular.widthOfTextAtSize(
        contactItems[i].value,
        SIZES.small,
      );
      if (i < contactItems.length - 1) {
        totalWidth += separatorWidth;
      }
    }

    // Start drawing from centered position
    let xPos = (PAGE_WIDTH - totalWidth) / 2;

    for (let i = 0; i < contactItems.length; i++) {
      const item = contactItems[i];
      const url = getContactUrl(item.type, item.value);

      // Draw contact with link
      const textWidth = drawTextWithLink(
        page,
        pdfDoc,
        item.value,
        xPos,
        y,
        fonts.regular,
        SIZES.small,
        COLORS.secondary,
        url,
      );
      xPos += textWidth;

      // Draw separator if not last item
      if (i < contactItems.length - 1) {
        page.drawText(separator, {
          x: xPos,
          y,
          size: SIZES.small,
          font: fonts.regular,
          color: COLORS.secondary,
        });
        xPos += separatorWidth;
      }
    }

    y -= SIZES.small + 25;
  }

  // ========== PROFILE (Summary) ==========
  const summary = personalizedResume?.summary || baseResume.summary;
  if (summary) {
    y = drawSectionHeader(page, "Profile", y, fonts);
    y = drawJustifiedText(
      page,
      summary,
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
  const skills = personalizedResume?.keySkills || baseResume.skills || [];
  console.log("[DEBUG:PDF] Using skills:", {
    source: personalizedResume?.keySkills?.length ? "personalized" : "base",
    count: skills.length,
    skills: skills.slice(0, 5),
  });
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
    personalizedResume?.experience || baseResume.experience || [];
  console.log("[DEBUG:PDF] Using experience:", {
    source: personalizedResume?.experience?.length ? "personalized" : "base",
    count: experience.length,
  });
  if (experience.length > 0 && experience[0]) {
    console.log("[DEBUG:PDF] First experience entry:", {
      position: experience[0].position,
      company: experience[0].companyName || experience[0].company,
      descriptionLength: experience[0].description?.length,
      descriptionPreview: experience[0].description?.substring(0, 200),
    });
  }
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

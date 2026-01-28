/**
 * PDF Resume Generator
 * Generates professional PDF resumes using pdf-lib with Cyrillic support
 * Works with both web and extension by accepting font URLs as configuration
 */

import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFName, PDFString, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { Experience, PersonalizedResume, Resume, PDFGeneratorConfig } from '../types';

// A4 page dimensions in points (72 points = 1 inch)
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// Colors - clean black/gray palette
const COLORS = {
  text: rgb(0, 0, 0),
  secondary: rgb(0.4, 0.4, 0.4),
  divider: rgb(0, 0, 0),
};

// Font sizes
const SIZES = {
  name: 26,
  title: 11,
  sectionHeader: 11,
  body: 10,
  small: 9,
};

const LINE_HEIGHT = 1.4;
const BULLET = '•';

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
}

/**
 * Load fonts for PDF generation
 */
async function loadFonts(pdfDoc: PDFDocument, config?: PDFGeneratorConfig): Promise<Fonts> {
  pdfDoc.registerFontkit(fontkit);

  if (config?.fontUrls) {
    try {
      const [regularBytes, boldBytes] = await Promise.all([
        fetch(config.fontUrls.regular).then((res) => res.arrayBuffer()),
        fetch(config.fontUrls.bold).then((res) => res.arrayBuffer()),
      ]);

      const regular = await pdfDoc.embedFont(regularBytes);
      const bold = await pdfDoc.embedFont(boldBytes);

      return { regular, bold };
    } catch (error) {
      console.warn('[PDF Generator] Failed to load custom fonts, falling back to Times Roman:', error);
    }
  }

  // Fallback to Times Roman
  const regular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const bold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  return { regular, bold };
}

function getTextWidth(text: string, font: PDFFont, fontSize: number): number {
  return font.widthOfTextAtSize(text, fontSize);
}

function drawCenteredText(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  fontSize: number,
  color: ReturnType<typeof rgb>
): void {
  const textWidth = getTextWidth(text, font, fontSize);
  const x = (PAGE_WIDTH - textWidth) / 2;
  page.drawText(text, { x, y, size: fontSize, font, color });
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  if (!text) return [];

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

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

function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
  color: ReturnType<typeof rgb>
): number {
  const lines = wrapText(text, font, fontSize, maxWidth);
  let currentY = y;

  for (const line of lines) {
    page.drawText(line, { x, y: currentY, size: fontSize, font, color });
    currentY -= fontSize * LINE_HEIGHT;
  }

  return currentY;
}

function drawJustifiedText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
  color: ReturnType<typeof rgb>
): number {
  const lines = wrapText(text, font, fontSize, maxWidth);
  let currentY = y;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isLastLine = i === lines.length - 1;

    if (isLastLine || line.trim().length === 0) {
      page.drawText(line, { x, y: currentY, size: fontSize, font, color });
    } else {
      const words = line.split(' ').filter((w) => w.length > 0);
      if (words.length <= 1) {
        page.drawText(line, { x, y: currentY, size: fontSize, font, color });
      } else {
        let wordsWidth = 0;
        for (const word of words) {
          wordsWidth += font.widthOfTextAtSize(word, fontSize);
        }

        const totalSpaceWidth = maxWidth - wordsWidth;
        const spaceWidth = totalSpaceWidth / (words.length - 1);

        let xPos = x;
        for (let j = 0; j < words.length; j++) {
          page.drawText(words[j], { x: xPos, y: currentY, size: fontSize, font, color });
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

function drawDivider(page: PDFPage, y: number, thickness = 0.5): void {
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness,
    color: COLORS.divider,
  });
}

function drawSectionHeader(page: PDFPage, title: string, y: number, fonts: Fonts): number {
  page.drawText(title.toUpperCase(), {
    x: MARGIN,
    y,
    size: SIZES.sectionHeader,
    font: fonts.bold,
    color: COLORS.text,
  });

  const underlineY = y - 4;
  drawDivider(page, underlineY, 0.5);

  return y - 20;
}

function formatDateShort(date: string | undefined): string {
  if (!date) return 'Present';

  try {
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const year = d.getFullYear().toString().slice(-2);
    return `${months[d.getMonth()]} '${year}`;
  } catch {
    return date;
  }
}

function parseBulletPoints(description: string | undefined): string[] {
  if (!description) return [];

  let points = description
    .split(/[\n\r]+/)
    .map((line) => line.replace(/^[\s]*[•\-\*][\s]+/, '').trim())
    .filter((s) => s.length > 0);

  if (points.length === 1 && points[0].length > 100) {
    points = points[0]
      .split(/\.\s+(?=[A-ZА-ЯЁ])/)
      .map((s) => s.trim().replace(/\.$/, ''))
      .filter((s) => s.length > 0);
  }

  const seen = new Set<string>();
  points = points.filter((point) => {
    const normalized = point.toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });

  return points;
}

function drawBulletPoints(
  page: PDFPage,
  points: string[],
  x: number,
  y: number,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
  color: ReturnType<typeof rgb>
): number {
  const bulletIndent = 15;
  let currentY = y;

  for (const point of points) {
    page.drawText(BULLET, { x, y: currentY, size: fontSize, font, color });

    const lines = wrapText(point, font, fontSize, maxWidth - bulletIndent);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isLastLine = i === lines.length - 1;

      if (isLastLine || line.trim().length === 0) {
        page.drawText(line, { x: x + bulletIndent, y: currentY, size: fontSize, font, color });
      } else {
        const words = line.split(' ').filter((w) => w.length > 0);
        if (words.length <= 1) {
          page.drawText(line, { x: x + bulletIndent, y: currentY, size: fontSize, font, color });
        } else {
          let wordsWidth = 0;
          for (const word of words) {
            wordsWidth += font.widthOfTextAtSize(word, fontSize);
          }
          const totalSpaceWidth = maxWidth - bulletIndent - wordsWidth;
          const spaceWidth = totalSpaceWidth / (words.length - 1);

          let xPos = x + bulletIndent;
          for (let j = 0; j < words.length; j++) {
            page.drawText(words[j], { x: xPos, y: currentY, size: fontSize, font, color });
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

function getContactUrl(type: string, value: string): string {
  switch (type) {
    case 'email':
      return `mailto:${value}`;
    case 'phone':
      return `tel:${value.replace(/[^\d+]/g, '')}`;
    case 'linkedin':
      if (value.startsWith('http')) return value;
      return `https://linkedin.com/in/${value.replace(/^@/, '')}`;
    case 'telegram':
      if (value.startsWith('http')) return value;
      return `https://t.me/${value.replace(/^@/, '')}`;
    default:
      return value;
  }
}

function drawTextWithLink(
  page: PDFPage,
  pdfDoc: PDFDocument,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  fontSize: number,
  color: ReturnType<typeof rgb>,
  url: string
): number {
  page.drawText(text, { x, y, size: fontSize, font, color });

  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const textHeight = fontSize;

  const linkAnnotation = pdfDoc.context.obj({
    Type: PDFName.of('Annot'),
    Subtype: PDFName.of('Link'),
    Rect: [x, y - 2, x + textWidth, y + textHeight],
    Border: [0, 0, 0],
    A: {
      Type: PDFName.of('Action'),
      S: PDFName.of('URI'),
      URI: PDFString.of(url),
    },
  });

  const annots = page.node.get(PDFName.of('Annots'));
  if (annots && typeof (annots as unknown as { push?: unknown }).push === 'function') {
    (annots as unknown as { push: (ref: unknown) => void }).push(pdfDoc.context.register(linkAnnotation));
  } else {
    page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([pdfDoc.context.register(linkAnnotation)]));
  }

  return textWidth;
}

/**
 * Generate a PDF resume from personalized resume data
 */
export async function generatePdfResume(
  personalizedResume: PersonalizedResume | null,
  baseResume: Resume,
  config?: PDFGeneratorConfig
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fonts = await loadFonts(pdfDoc, config);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  // Header: Name
  const fullName = (baseResume.fullName || 'Name Not Specified').toUpperCase();
  drawCenteredText(page, fullName, y, fonts.bold, SIZES.name, COLORS.text);
  y -= SIZES.name + 10;

  // Contacts
  const contactItems: Array<{ type: string; value: string }> = [];
  if (baseResume.contacts?.email) {
    contactItems.push({ type: 'email', value: baseResume.contacts.email });
  }
  if (baseResume.contacts?.phone) {
    contactItems.push({ type: 'phone', value: baseResume.contacts.phone });
  }
  if (baseResume.contacts?.linkedin) {
    contactItems.push({ type: 'linkedin', value: baseResume.contacts.linkedin });
  }
  if (baseResume.contacts?.telegram) {
    contactItems.push({ type: 'telegram', value: baseResume.contacts.telegram });
  }

  if (contactItems.length > 0) {
    const separator = '  |  ';
    const separatorWidth = fonts.regular.widthOfTextAtSize(separator, SIZES.small);

    let totalWidth = 0;
    for (let i = 0; i < contactItems.length; i++) {
      totalWidth += fonts.regular.widthOfTextAtSize(contactItems[i].value, SIZES.small);
      if (i < contactItems.length - 1) {
        totalWidth += separatorWidth;
      }
    }

    let xPos = (PAGE_WIDTH - totalWidth) / 2;

    for (let i = 0; i < contactItems.length; i++) {
      const item = contactItems[i];
      const url = getContactUrl(item.type, item.value);

      const textWidth = drawTextWithLink(
        page,
        pdfDoc,
        item.value,
        xPos,
        y,
        fonts.regular,
        SIZES.small,
        COLORS.secondary,
        url
      );
      xPos += textWidth;

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

  // Profile (Summary)
  const summary = personalizedResume?.summary || baseResume.summary;
  if (summary) {
    y = drawSectionHeader(page, 'Profile', y, fonts);
    y = drawJustifiedText(page, summary, MARGIN, y, fonts.regular, SIZES.body, CONTENT_WIDTH, COLORS.text);
    y -= 20;
  }

  // Key Skills
  const skills = personalizedResume?.keySkills || baseResume.skills || [];
  if (skills.length > 0) {
    y = drawSectionHeader(page, 'Key Skills', y, fonts);
    const skillsText = skills.join(', ');
    y = drawWrappedText(page, skillsText, MARGIN, y, fonts.regular, SIZES.body, CONTENT_WIDTH, COLORS.text);
    y -= 20;
  }

  // Career History
  const experience: Experience[] = personalizedResume?.experience || baseResume.experience || [];
  if (experience.length > 0) {
    y = drawSectionHeader(page, 'Career History', y, fonts);

    for (const exp of experience) {
      if (y < 120) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
      }

      const startDate = formatDateShort(exp.startDate);
      const endDate = exp.endDate ? formatDateShort(exp.endDate) : 'Present';
      const company = exp.companyName || exp.company || 'Company';
      const position = exp.position || 'Position';
      const companyDesc = exp.companyDescription || '';

      const headerLine = `${startDate} – ${endDate}: `;
      const headerLineWidth = getTextWidth(headerLine, fonts.regular, SIZES.body);

      page.drawText(headerLine, {
        x: MARGIN,
        y,
        size: SIZES.body,
        font: fonts.regular,
        color: COLORS.text,
      });

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

      const separatorText = '– ';
      page.drawText(separatorText, {
        x: xOffset,
        y,
        size: SIZES.body,
        font: fonts.regular,
        color: COLORS.text,
      });
      xOffset += getTextWidth(separatorText, fonts.regular, SIZES.body);

      page.drawText(position, {
        x: xOffset,
        y,
        size: SIZES.body,
        font: fonts.bold,
        color: COLORS.text,
      });

      y -= SIZES.body * LINE_HEIGHT + 3;

      if (exp.description) {
        const bulletPoints = parseBulletPoints(exp.description);
        if (bulletPoints.length > 0) {
          y = drawBulletPoints(page, bulletPoints, MARGIN, y, fonts.regular, SIZES.body, CONTENT_WIDTH, COLORS.text);
        }
      }

      y -= 10;
    }
  }

  // Qualifications (Education)
  const education = baseResume.education || [];
  if (education.length > 0) {
    if (y < 100) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }

    y -= 5;
    drawDivider(page, y, 0.5);
    y -= 15;

    y = drawSectionHeader(page, 'Qualifications', y, fonts);

    for (const edu of education) {
      const institution = edu.institution || edu.name || 'Institution';
      const degree = edu.degree || edu.faculty || '';
      const year = edu.year || edu.graduationYear || '';

      let eduLine = '';
      if (year) {
        eduLine = `${year} – `;
      }

      if (year) {
        page.drawText(eduLine, {
          x: MARGIN,
          y,
          size: SIZES.body,
          font: fonts.regular,
          color: COLORS.text,
        });
      }

      const yearWidth = year ? getTextWidth(eduLine, fonts.regular, SIZES.body) : 0;

      if (degree) {
        page.drawText(degree, {
          x: MARGIN + yearWidth,
          y,
          size: SIZES.body,
          font: fonts.bold,
          color: COLORS.text,
        });
        const degreeWidth = getTextWidth(degree, fonts.bold, SIZES.body);

        const instText = `, ${institution}`;
        page.drawText(instText, {
          x: MARGIN + yearWidth + degreeWidth,
          y,
          size: SIZES.body,
          font: fonts.regular,
          color: COLORS.text,
        });
      } else {
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

  return pdfDoc.save();
}

export { PAGE_WIDTH, PAGE_HEIGHT, MARGIN };

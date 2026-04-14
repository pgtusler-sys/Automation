import fs from 'fs';
import path from 'path';
import { logger } from '../shared/logger';

let mdToPdf: any = null;

async function getMdToPdf() {
  if (!mdToPdf) {
    try {
      const mod = await import('md-to-pdf');
      mdToPdf = mod.mdToPdf;
    } catch {
      logger.warn('md-to-pdf not installed — run: npm install md-to-pdf');
      return null;
    }
  }
  return mdToPdf;
}

export async function convertResumeToPdf(mdPath: string): Promise<string | null> {
  const converter = await getMdToPdf();
  if (!converter) return null;

  const pdfPath = mdPath.replace(/\.md$/, '.pdf');

  try {
    const result = await converter({ path: mdPath }, {
      stylesheet: [],
      css: `
        body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; line-height: 1.4; margin: 0.75in; color: #333; }
        h1 { font-size: 18pt; margin-bottom: 4pt; color: #111; }
        h2 { font-size: 13pt; border-bottom: 1px solid #ccc; padding-bottom: 2pt; margin-top: 14pt; color: #111; }
        h3 { font-size: 11pt; margin-bottom: 2pt; color: #222; }
        ul { margin: 4pt 0; padding-left: 18pt; }
        li { margin-bottom: 2pt; }
        p { margin: 4pt 0; }
      `,
      pdf_options: {
        format: 'Letter',
        margin: { top: '0.75in', bottom: '0.75in', left: '0.75in', right: '0.75in' },
        printBackground: false,
      },
    });

    if (result.content) {
      fs.writeFileSync(pdfPath, result.content);
      logger.info(`PDF generated: ${pdfPath}`);
      return pdfPath;
    }

    return null;
  } catch (err) {
    logger.error(`PDF generation failed for ${mdPath}: ${err}`);
    return null;
  }
}

export async function generatePdfsForApplication(companyDir: string): Promise<{
  resumePdf: string | null;
  coverLetterPdf: string | null;
}> {
  const resumeMd = path.join(companyDir, 'resume.md');
  const coverLetterMd = path.join(companyDir, 'cover-letter.md');

  const resumePdf = fs.existsSync(resumeMd) ? await convertResumeToPdf(resumeMd) : null;
  const coverLetterPdf = fs.existsSync(coverLetterMd) ? await convertResumeToPdf(coverLetterMd) : null;

  return { resumePdf, coverLetterPdf };
}

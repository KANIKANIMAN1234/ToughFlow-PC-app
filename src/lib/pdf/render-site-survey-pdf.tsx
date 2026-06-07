import { renderToBuffer } from "@react-pdf/renderer";
import { SiteSurveyDocument } from "./SiteSurveyDocument";
import { registerPdfFonts } from "./fonts";
import type { SiteSurveyPdfContext } from "./site-survey-context";

export async function renderSiteSurveyPdf(
  ctx: SiteSurveyPdfContext
): Promise<Buffer> {
  registerPdfFonts();
  const buffer = await renderToBuffer(<SiteSurveyDocument ctx={ctx} />);
  return Buffer.from(buffer);
}

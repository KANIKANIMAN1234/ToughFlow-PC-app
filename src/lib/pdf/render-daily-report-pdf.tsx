import { renderToBuffer } from "@react-pdf/renderer";
import { DailyReportDocument } from "./DailyReportDocument";
import { registerPdfFonts } from "./fonts";
import type { DailyReportPdfContext } from "./daily-report-context";

export async function renderDailyReportPdf(
  ctx: DailyReportPdfContext
): Promise<Buffer> {
  registerPdfFonts();
  const buffer = await renderToBuffer(<DailyReportDocument ctx={ctx} />);
  return Buffer.from(buffer);
}

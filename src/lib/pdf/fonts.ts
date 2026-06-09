import path from "path";
import { Font } from "@react-pdf/renderer";

let registered = false;

/** @fontsource/noto-sans-jp の woff を参照（CDN 404 回避） */
function fontPath(filename: string) {
  return path.join(
    process.cwd(),
    "node_modules/@fontsource/noto-sans-jp/files",
    filename
  );
}

export function registerPdfFonts() {
  if (registered) return;
  Font.register({
    family: "NotoSansJP",
    fonts: [
      {
        src: fontPath("noto-sans-jp-japanese-400-normal.woff"),
        fontWeight: 400,
      },
      {
        src: fontPath("noto-sans-jp-japanese-700-normal.woff"),
        fontWeight: 700,
      },
    ],
  });
  registered = true;
}

export const PDF_FONT = "NotoSansJP";

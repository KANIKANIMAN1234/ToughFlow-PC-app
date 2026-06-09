import path from "path";
import { Font } from "@react-pdf/renderer";

let registered = false;

/** public/fonts に配置（Vercel サーバーレスでも node_modules より確実に参照できる） */
function fontPath(filename: string) {
  return path.join(process.cwd(), "public/fonts", filename);
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

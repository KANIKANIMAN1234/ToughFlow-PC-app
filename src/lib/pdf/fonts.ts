import { Font } from "@react-pdf/renderer";

let registered = false;

export function registerPdfFonts() {
  if (registered) return;
  Font.register({
    family: "NotoSansJP",
    fonts: [
      {
        src: "https://cdn.jsdelivr.net/npm/@canvas-fonts/noto-sans-jp@1.0.4/NotoSansJP-Regular.otf",
        fontWeight: 400,
      },
      {
        src: "https://cdn.jsdelivr.net/npm/@canvas-fonts/noto-sans-jp@1.0.4/NotoSansJP-Bold.otf",
        fontWeight: 700,
      },
    ],
  });
  registered = true;
}

export const PDF_FONT = "NotoSansJP";

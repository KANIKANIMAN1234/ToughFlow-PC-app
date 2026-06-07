import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { PDF_FONT } from "./fonts";
import {
  formatSurveyDate,
  type SiteSurveyPdfContext,
} from "./site-survey-context";

const styles = StyleSheet.create({
  page: {
    fontFamily: PDF_FONT,
    fontSize: 8,
    padding: 28,
    color: "#111",
  },
  issuer: { fontSize: 7, color: "#555", marginBottom: 4 },
  title: {
    fontSize: 14,
    textAlign: "center",
    letterSpacing: 4,
    marginBottom: 8,
    fontWeight: 700,
  },
  row: { flexDirection: "row", borderWidth: 1, borderColor: "#333" },
  label: {
    width: 64,
    backgroundColor: "#f5f5f5",
    fontWeight: 700,
    padding: 3,
    borderRightWidth: 1,
    borderColor: "#333",
  },
  cell: {
    flex: 1,
    padding: 3,
    borderRightWidth: 1,
    borderColor: "#333",
  },
  section: { fontWeight: 700, marginTop: 6, marginBottom: 3 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#eee",
    borderWidth: 1,
    borderColor: "#333",
  },
  tableRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#333",
  },
  th: {
    textAlign: "center",
    padding: 2,
    borderRightWidth: 1,
    borderColor: "#333",
    fontWeight: 700,
  },
  td: { padding: 2, borderRightWidth: 1, borderColor: "#333" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#666",
  },
  photoBox: {
    borderWidth: 1,
    borderColor: "#333",
    padding: 4,
    marginBottom: 6,
    minHeight: 100,
  },
  photoImg: { maxHeight: 140, objectFit: "contain", marginBottom: 4 },
});

function mark(v: boolean): string {
  return v ? "●" : "○";
}

function yn(value: string | undefined): string {
  return value ?? "—";
}

function Footer({
  ctx,
  page,
  total,
}: {
  ctx: SiteSurveyPdfContext;
  page: number;
  total: number;
}) {
  return (
    <View style={styles.footer} fixed>
      <Text>{ctx.company.name}</Text>
      <Text>
        {page} / {total}
      </Text>
      <Text>{ctx.formId}</Text>
    </View>
  );
}

export function SiteSurveyDocument({ ctx }: { ctx: SiteSurveyPdfContext }) {
  const { survey } = ctx;
  const c = survey.content;
  const tools = [...c.tools];
  const toolPairs: Array<
    [typeof tools[0] | undefined, typeof tools[0] | undefined]
  > = [];
  for (let i = 0; i < tools.length; i += 2) {
    toolPairs.push([tools[i], tools[i + 1]]);
  }
  while (toolPairs.length < 18) {
    toolPairs.push([undefined, undefined]);
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.issuer}>{ctx.company.name}</Text>
        <Text style={styles.title}>現 地 調 査 報 告 書</Text>

        <View style={styles.row}>
          <Text style={styles.label}>お客様名</Text>
          <Text style={[styles.cell, { flex: 2 }]}>{c.customerName}</Text>
          <Text style={styles.label}>見積</Text>
          <Text style={styles.cell}>{c.hasEstimate ? "有" : "無"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>下見日</Text>
          <Text style={styles.cell}>{formatSurveyDate(c.surveyDate)}</Text>
          <Text style={styles.label}>調査担当</Text>
          <Text style={styles.cell}>{c.surveyorName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>住所</Text>
          <Text style={[styles.cell, { flex: 3 }]}>{c.siteAddress}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>電話</Text>
          <Text style={styles.cell}>{c.contactPhone ?? ""}</Text>
          <Text style={styles.label}>客先担当</Text>
          <Text style={styles.cell}>{c.customerContact ?? ""}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>作業日時</Text>
          <Text style={styles.cell}>{formatSurveyDate(c.workDatetime)}</Text>
          <Text style={styles.label}>作業内容</Text>
          <Text style={styles.cell}>{ctx.workTypeName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>機種</Text>
          <Text style={[styles.cell, { flex: 3 }]}>{c.machineModel}</Text>
        </View>

        <Text style={styles.section}>搬入状況</Text>
        <View style={styles.row}>
          <Text style={styles.label}>搬入口</Text>
          <Text style={[styles.cell, { flex: 3 }]}>
            H {c.entrance.heightMm ?? "—"}mm × W {c.entrance.widthMm ?? "—"}mm
            ／ ひさし{yn(c.entrance.eaves)} スロープ{yn(c.entrance.slope)}{" "}
            段差{yn(c.entrance.step)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>車両</Text>
          <Text style={[styles.cell, { flex: 3 }]}>
            {c.plannedVehicles.join("、") || "—"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>荷卸</Text>
          <Text style={[styles.cell, { flex: 3 }]}>
            床面 {c.unload.floor ?? "—"} ／ ブルーシート{" "}
            {c.unload.blueSheetM ?? "—"}m ／ 床養生{" "}
            {c.unload.floorProtection ?? "—"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>客先設備</Text>
          <Text style={[styles.cell, { flex: 3 }]}>
            天井クレーン{yn(c.facility.overheadCrane)} フォーク
            {yn(c.facility.forklift)} その他{c.facility.other ?? ""}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>機械移動</Text>
          <Text style={[styles.cell, { flex: 3 }]}>
            工場内 {yn(c.internalMove)}
          </Text>
        </View>
        {c.requiredToolsNote ? (
          <View style={styles.row}>
            <Text style={styles.label}>必要道具</Text>
            <Text style={[styles.cell, { flex: 3 }]}>{c.requiredToolsNote}</Text>
          </View>
        ) : null}

        <Text style={styles.section}>作業内容・注意点</Text>
        <View style={{ flexDirection: "row", gap: 4 }}>
          <View style={{ flex: 1, borderWidth: 1, borderColor: "#333", padding: 4 }}>
            <Text style={{ fontWeight: 700, marginBottom: 2 }}>作業内容</Text>
            {c.workSteps.filter(Boolean).map((s, i) => (
              <Text key={i}>
                {i + 1}. {s}
              </Text>
            ))}
          </View>
          <View style={{ flex: 1, borderWidth: 1, borderColor: "#333", padding: 4 }}>
            <Text style={{ fontWeight: 700, marginBottom: 2 }}>注意点</Text>
            {c.precautions.filter(Boolean).map((s, i) => (
              <Text key={i}>
                {i + 1}. {s}
              </Text>
            ))}
          </View>
        </View>

        <Text style={{ marginTop: 6 }}>
          予定作業者数：{c.plannedWorkers ?? "—"} 名
        </Text>

        {(ctx.mapCarryInSrc || ctx.siteLayoutSrc) && (
          <View style={{ flexDirection: "row", marginTop: 8, gap: 4 }}>
            {ctx.mapCarryInSrc && (
              <View style={{ flex: 1 }}>
                <Text style={{ textAlign: "center", fontSize: 7 }}>搬入場所地図</Text>
                <Image src={ctx.mapCarryInSrc} style={styles.photoImg} />
              </View>
            )}
            {ctx.siteLayoutSrc && (
              <View style={{ flex: 1 }}>
                <Text style={{ textAlign: "center", fontSize: 7 }}>
                  工場内敷地配置図
                </Text>
                <Image src={ctx.siteLayoutSrc} style={styles.photoImg} />
              </View>
            )}
          </View>
        )}

        <Footer ctx={ctx} page={1} total={3} />
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>必要道具チェックリスト</Text>
        <Text style={{ marginBottom: 6 }}>
          調査日：{formatSurveyDate(c.surveyDate)}
        </Text>

        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: 20 }]}>積</Text>
          <Text style={[styles.th, { width: 20 }]}>使</Text>
          <Text style={[styles.th, { flex: 1 }]}>道具</Text>
          <Text style={[styles.th, { width: 20 }]}>積</Text>
          <Text style={[styles.th, { width: 20 }]}>使</Text>
          <Text style={[styles.th, { flex: 1 }]}>道具</Text>
        </View>
        {toolPairs.map(([left, right], rowIdx) => (
          <View key={rowIdx} style={styles.tableRow}>
            <Text style={[styles.td, { width: 20, textAlign: "center" }]}>
              {left ? mark(left.load) : ""}
            </Text>
            <Text style={[styles.td, { width: 20, textAlign: "center" }]}>
              {left ? mark(left.use) : ""}
            </Text>
            <Text style={[styles.td, { flex: 1 }]}>{left?.name ?? ""}</Text>
            <Text style={[styles.td, { width: 20, textAlign: "center" }]}>
              {right ? mark(right.load) : ""}
            </Text>
            <Text style={[styles.td, { width: 20, textAlign: "center" }]}>
              {right ? mark(right.use) : ""}
            </Text>
            <Text style={[styles.td, { flex: 1 }]}>{right?.name ?? ""}</Text>
          </View>
        ))}

        <Footer ctx={ctx} page={2} total={3} />
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>現場調査写真</Text>
        {ctx.sitePhotos.length === 0 ? (
          <Text style={{ marginTop: 12, color: "#666" }}>写真なし</Text>
        ) : (
          ctx.sitePhotos.map((photo, i) => (
            <View key={i} style={styles.photoBox}>
              {photo.src ? (
                <Image src={photo.src} style={styles.photoImg} />
              ) : (
                <Text style={{ color: "#888", marginBottom: 4 }}>
                  （画像は Drive に保存済み）
                </Text>
              )}
              {photo.caption ? (
                <Text style={{ fontSize: 7 }}>{photo.caption}</Text>
              ) : null}
            </View>
          ))
        )}
        <Footer ctx={ctx} page={3} total={3} />
      </Page>
    </Document>
  );
}

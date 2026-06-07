import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { PDF_FONT } from "./fonts";
import {
  circledIndex,
  formatDateParts,
  formatYenValue,
  getMaterialDisplay,
  getSelectedVehicleLabels,
  type DailyReportPdfContext,
} from "./daily-report-context";

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
  cell: {
    borderRightWidth: 1,
    borderColor: "#333",
    padding: 3,
    flex: 1,
  },
  label: {
    width: 72,
    backgroundColor: "#f5f5f5",
    fontWeight: 700,
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
  tableRow: { flexDirection: "row", borderWidth: 1, borderTopWidth: 0, borderColor: "#333" },
  th: { flex: 1, textAlign: "center", padding: 2, borderRightWidth: 1, borderColor: "#333", fontWeight: 700 },
  td: { flex: 1, padding: 2, borderRightWidth: 1, borderColor: "#333" },
  remarks: { minHeight: 40, borderWidth: 1, borderColor: "#333", padding: 4 },
  footer: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#666",
  },
});

function yn(value: boolean, selected: boolean): string {
  return `${selected ? "●" : "○"}${value ? "有" : "無"}`;
}

export function DailyReportDocument({ ctx }: { ctx: DailyReportPdfContext }) {
  const { report, company, workTypes, formId } = ctx;
  const c = report.content;
  const start = formatDateParts(c.workDateStart);
  const end = c.workDateEnd ? formatDateParts(c.workDateEnd) : null;
  const machines = [...c.machines];
  while (machines.length < 5) {
    machines.push({ name: "", maker: "", model: "", qty: 0 });
  }
  const vehicleLabels = getSelectedVehicleLabels(ctx);
  const materialRows = getMaterialDisplay(ctx);
  const costs = c.costs;
  const issued = new Date(ctx.generatedAt).toLocaleDateString("ja-JP");

  const workTypeLine = workTypes
    .map((wt, i) => {
      const selected = c.workTypeIds.includes(wt.id);
      return `${circledIndex(i)}${wt.name}${selected ? "●" : ""}`;
    })
    .join("  ");

  return (
    <Document title={`作業日報 ${c.billingClient}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.issuer}>
          {company.name}
          {company.address ? `　${company.address}` : ""}
          {company.phone ? `　TEL ${company.phone}` : ""}
        </Text>
        <Text style={styles.title}>【 作 業 日 報 】</Text>

        <View style={styles.row}>
          <Text style={styles.label}>請求先名</Text>
          <Text style={[styles.cell, { flex: 3 }]}>{c.billingClient}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>担当者</Text>
          <Text style={styles.cell}>{c.clientContact ?? ""}</Text>
          <Text style={styles.label}>作業日</Text>
          <Text style={styles.cell}>
            {start.year}年{start.month}月{start.day}日
            {end ? ` ～ ${end.month}月${end.day}日` : ""}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>引取先住所</Text>
          <Text style={[styles.cell, { flex: 3 }]}>{c.pickup.address ?? ""}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>引取先会社</Text>
          <Text style={styles.cell}>{c.pickup.company ?? ""}</Text>
          <Text style={styles.label}>納入先住所</Text>
          <Text style={styles.cell}>{c.delivery.address}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>納入先会社</Text>
          <Text style={[styles.cell, { flex: 3 }]}>{c.delivery.company}</Text>
        </View>

        <Text style={styles.section}>作業内容</Text>
        <Text>{workTypeLine}</Text>

        <View style={[styles.tableHeader, { marginTop: 4 }]}>
          {["機械名", "メーカー", "型式", "台数", "号機"].map((h) => (
            <Text key={h} style={styles.th}>{h}</Text>
          ))}
        </View>
        {machines.slice(0, 5).map((m, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.td}>{m.name}</Text>
            <Text style={styles.td}>{m.maker}</Text>
            <Text style={styles.td}>{m.model}</Text>
            <Text style={styles.td}>{m.qty || ""}</Text>
            <Text style={styles.td}>{m.unitNo ?? ""}</Text>
          </View>
        ))}

        <Text style={styles.section}>車両・重機</Text>
        <Text>{vehicleLabels.join(" / ") || "—"}</Text>

        <Text style={styles.section}>資材・その他</Text>
        <Text>
          {materialRows.map((m) => `${m.name}: ${m.value}`).join("　") || "—"}
        </Text>

        <Text style={styles.section}>備考</Text>
        <Text style={styles.remarks}>{c.remarks ?? ""}</Text>

        <View style={[styles.row, { marginTop: 6 }]}>
          <Text style={styles.label}>現場作業時間</Text>
          <Text style={styles.cell}>
            {c.siteWorkTime.from ?? ""} ～ {c.siteWorkTime.to ?? ""}
          </Text>
          <Text style={styles.label}>高速・有料</Text>
          <Text style={styles.cell}>
            {formatYenValue(c.tollRoads[0])} / {formatYenValue(c.tollRoads[1])}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>下見</Text>
          <Text style={styles.cell}>
            {yn(true, c.siteInspection)} / {yn(false, !c.siteInspection)}
          </Text>
          <Text style={styles.label}>道路使用書</Text>
          <Text style={styles.cell}>
            {yn(true, c.roadPermit)} / {yn(false, !c.roadPermit)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>誘導員</Text>
          <Text style={[styles.cell, { flex: 3 }]}>{c.guidesCount ?? ""} 名</Text>
        </View>

        <View style={[styles.tableHeader, { marginTop: 6 }]}>
          {["人件費", "高速代", "消耗品", "経費", "総経費", "車輌", "ガソリン", "外部", "外注"].map((h) => (
            <Text key={h} style={styles.th}>{h}</Text>
          ))}
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.td}>{formatYenValue(costs.labor)}</Text>
          <Text style={styles.td}>{formatYenValue(costs.toll)}</Text>
          <Text style={styles.td}>{formatYenValue(costs.consumables)}</Text>
          <Text style={styles.td}>{formatYenValue(costs.expense)}</Text>
          <Text style={styles.td}>{formatYenValue(costs.total)}</Text>
          <Text style={styles.td}>{formatYenValue(costs.vehicle)}</Text>
          <Text style={styles.td}>{formatYenValue(costs.gasoline)}</Text>
          <Text style={styles.td}>{formatYenValue(costs.externalLabor)}</Text>
          <Text style={styles.td}>{formatYenValue(costs.outsource)}</Text>
        </View>
        <Text style={{ marginTop: 4 }}>
          担当：{c.reporterName ?? report.userName}
        </Text>

        <View style={styles.footer}>
          <Text>1 / 1</Text>
          <Text>{formId}</Text>
          <Text>発行日 {issued}　ToughFlow</Text>
        </View>
      </Page>
    </Document>
  );
}

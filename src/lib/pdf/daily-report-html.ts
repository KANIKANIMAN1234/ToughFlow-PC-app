import {
  circledIndex,
  formatDateParts,
  formatYenValue,
  getMaterialDisplay,
  getSelectedVehicleLabels,
  type DailyReportPdfContext,
} from "./daily-report-context";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function yn(value: boolean, selected: boolean): string {
  const mark = selected ? "●" : "○";
  return `${mark}${value ? "有" : "無"}`;
}

export function renderDailyReportHtml(ctx: DailyReportPdfContext): string {
  const { report, company, workTypes, formId } = ctx;
  const c = report.content;
  const start = formatDateParts(c.workDateStart);
  const end = c.workDateEnd ? formatDateParts(c.workDateEnd) : null;
  const machines = [...c.machines];
  while (machines.length < 5) {
    machines.push({ name: "", maker: "", model: "", qty: 0 });
  }

  const workTypeLine = workTypes
    .map((wt, i) => {
      const selected = c.workTypeIds.includes(wt.id);
      return `<span class="${selected ? "selected" : ""}">${circledIndex(i)}${escapeHtml(wt.name)}${selected ? "●" : ""}</span>`;
    })
    .join(" ");

  const vehicleLabels = getSelectedVehicleLabels(ctx);
  const materialRows = getMaterialDisplay(ctx);
  const costs = c.costs;
  const issued = new Date(ctx.generatedAt).toLocaleDateString("ja-JP");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <title>作業日報 - ${escapeHtml(c.billingClient)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: "Noto Sans JP", "Hiragino Sans", sans-serif; font-size: 11px; color: #111; margin: 0; padding: 16px; background: #f5f5f7; }
    .page { max-width: 210mm; margin: 0 auto; background: #fff; border: 1px solid #ccc; padding: 12mm 10mm; min-height: 277mm; }
    .issuer { font-size: 9px; color: #555; margin-bottom: 4px; }
    h1 { text-align: center; font-size: 18px; letter-spacing: 0.3em; margin: 0 0 10px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
    th, td { border: 1px solid #333; padding: 3px 5px; vertical-align: top; }
    th { background: #f0f0f0; font-weight: 600; text-align: center; }
    .label { width: 90px; background: #fafafa; white-space: nowrap; }
    .section-title { font-weight: 700; margin: 8px 0 4px; }
    .work-types span { margin-right: 6px; }
    .work-types .selected { font-weight: 700; }
    .vehicles { line-height: 1.6; }
    .vehicles .tag { display: inline-block; border: 1px solid #333; padding: 2px 6px; margin: 2px; border-radius: 3px; background: #eef6ff; }
    .remarks { min-height: 48px; white-space: pre-wrap; }
    .costs td { text-align: center; font-size: 10px; }
    .footer { margin-top: 10px; font-size: 9px; color: #666; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="page">
    <div class="issuer">${escapeHtml(company.name)}${company.address ? `　${escapeHtml(company.address)}` : ""}${company.phone ? `　TEL ${escapeHtml(company.phone)}` : ""}</div>
    <h1>【 作 業 日 報 】</h1>

    <table>
      <tr>
        <td class="label">請求先名</td>
        <td colspan="3">${escapeHtml(c.billingClient)}</td>
      </tr>
      <tr>
        <td class="label">担当者</td>
        <td>${escapeHtml(c.clientContact ?? "")}</td>
        <td class="label">作業日</td>
        <td>${start.year}年${start.month}月${start.day}日${end ? ` ～ ${end.month}月${end.day}日` : ""}</td>
      </tr>
      <tr>
        <td class="label">引取先 住所</td>
        <td colspan="3">${escapeHtml(c.pickup.address ?? "")}</td>
      </tr>
      <tr>
        <td class="label">引取先 会社</td>
        <td>${escapeHtml(c.pickup.company ?? "")}</td>
        <td class="label">納入先 住所</td>
        <td>${escapeHtml(c.delivery.address)}</td>
      </tr>
      <tr>
        <td class="label">納入先 会社</td>
        <td colspan="3">${escapeHtml(c.delivery.company)}</td>
      </tr>
    </table>

    <div class="section-title">作業内容</div>
    <div class="work-types">${workTypeLine}</div>

    <table>
      <thead>
        <tr><th>機械名</th><th>メーカー</th><th>型式</th><th>台数</th><th>号機</th></tr>
      </thead>
      <tbody>
        ${machines
          .slice(0, 5)
          .map(
            (m) =>
              `<tr><td>${escapeHtml(m.name)}</td><td>${escapeHtml(m.maker)}</td><td>${escapeHtml(m.model)}</td><td>${m.qty || ""}</td><td>${escapeHtml(m.unitNo ?? "")}</td></tr>`
          )
          .join("")}
      </tbody>
    </table>

    <div class="section-title">車両・重機</div>
    <div class="vehicles">${vehicleLabels.map((v) => `<span class="tag">${escapeHtml(v)}</span>`).join("")}</div>

    <div class="section-title">資材・その他</div>
    <div>${materialRows.map((m) => `${escapeHtml(m.name)}: ${escapeHtml(m.value)}`).join("　") || "—"}</div>

    <div class="section-title">備考</div>
    <div class="remarks">${escapeHtml(c.remarks ?? "")}</div>

    <table>
      <tr>
        <td class="label">現場作業時間</td>
        <td>${escapeHtml(c.siteWorkTime.from ?? "")} ～ ${escapeHtml(c.siteWorkTime.to ?? "")}</td>
        <td class="label">高速・有料道路</td>
        <td>${formatYenValue(c.tollRoads[0])} / ${formatYenValue(c.tollRoads[1])}</td>
      </tr>
      <tr>
        <td class="label">下見</td>
        <td>${yn(true, c.siteInspection)} / ${yn(false, !c.siteInspection)}</td>
        <td class="label">道路使用書</td>
        <td>${yn(true, c.roadPermit)} / ${yn(false, !c.roadPermit)}</td>
      </tr>
      <tr>
        <td class="label">誘導員</td>
        <td colspan="3">${c.guidesCount ?? ""} 名</td>
      </tr>
    </table>

    <table class="costs">
      <thead>
        <tr>
          <th>人件費</th><th>高速代</th><th>消耗品</th><th>経費</th><th>総経費</th>
          <th>車輌代</th><th>ガソリン</th><th>外部人工</th><th>外注費</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${formatYenValue(costs.labor)}</td>
          <td>${formatYenValue(costs.toll)}</td>
          <td>${formatYenValue(costs.consumables)}</td>
          <td>${formatYenValue(costs.expense)}</td>
          <td>${formatYenValue(costs.total)}</td>
          <td>${formatYenValue(costs.vehicle)}</td>
          <td>${formatYenValue(costs.gasoline)}</td>
          <td>${formatYenValue(costs.externalLabor)}</td>
          <td>${formatYenValue(costs.outsource)}</td>
        </tr>
      </tbody>
    </table>
    <div>担当：${escapeHtml(c.reporterName ?? report.userName)}</div>

    <div class="footer">
      <span>1 / 1</span>
      <span>${escapeHtml(formId)}</span>
      <span>発行日 ${issued}　ToughFlow</span>
    </div>
  </div>
</body>
</html>`;
}

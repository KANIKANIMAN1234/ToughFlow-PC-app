"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DetailSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { resolvePhotoDisplayUrl } from "@/lib/drive/photo-url";
import { formatDate } from "@/lib/utils";
import type { SiteSurvey, SiteSurveyPhotoEntry } from "@/lib/types";

function getPhotoEntries(
  photos: SiteSurvey["content"]["photos"]
): SiteSurveyPhotoEntry[] {
  if (photos.sitePhotoEntries?.length) {
    return photos.sitePhotoEntries.filter((e) => e.url);
  }
  const entries: SiteSurveyPhotoEntry[] = [];
  if (photos.mapCarryIn) {
    entries.push({ url: photos.mapCarryIn, caption: "搬入経路図" });
  }
  if (photos.siteLayout) {
    entries.push({ url: photos.siteLayout, caption: "現場配置図" });
  }
  if (photos.sitePhoto) {
    entries.push({ url: photos.sitePhoto, caption: "" });
  }
  return entries;
}

function PhotoGrid({ entries }: { entries: SiteSurveyPhotoEntry[] }) {
  if (!entries.length) {
    return <p className="text-caption text-apple-glyph">写真なし</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-4">
      {entries.map((entry, i) => (
        <div key={i} className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolvePhotoDisplayUrl(entry.url)}
            alt={entry.caption || `写真 ${i + 1}`}
            className="max-h-48 w-full rounded-card border border-surface-border object-contain"
          />
          {entry.caption && (
            <p className="text-caption text-apple-glyph">{entry.caption}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default function SiteSurveyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, authLoading } = useAuthGuard();
  const { data, isLoading } = useApi<{ survey: SiteSurvey }>(
    user && id ? `/api/site-surveys?id=${id}` : null
  );

  const survey = data?.survey;

  if (authLoading || !user) {
    return (
      <AppShell title="現場調査詳細" breadcrumbs={["ToughFlow", "現場調査結果"]}>
        <DetailSkeleton />
      </AppShell>
    );
  }

  if (isLoading && !survey) {
    return (
      <AppShell title="現場調査詳細" breadcrumbs={["ToughFlow", "現場調査結果"]}>
        <DetailSkeleton />
      </AppShell>
    );
  }

  if (!survey) return null;

  const c = survey.content;
  const photos = getPhotoEntries(c.photos);

  return (
    <AppShell
      title="現場調査詳細"
      breadcrumbs={[
        "ToughFlow",
        "現場調査結果",
        c.customerName,
      ]}
    >
      <div className="grid grid-cols-3 gap-6">
        <Card title="基本情報" className="col-span-2">
          <dl className="grid grid-cols-2 gap-4 text-caption">
            <div>
              <dt className="text-apple-glyph">案件</dt>
              <dd className="font-normal text-apple-text">{survey.projectName}</dd>
            </div>
            <div>
              <dt className="text-apple-glyph">状態</dt>
              <dd>
                <Badge tone={survey.status === "published" ? "success" : "default"}>
                  {survey.status === "published" ? "確定" : "下書き"}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-apple-glyph">顧客名</dt>
              <dd className="font-normal text-apple-text">{c.customerName}</dd>
            </div>
            <div>
              <dt className="text-apple-glyph">調査日</dt>
              <dd className="font-normal text-apple-text">
                {formatDate(c.surveyDate)}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-apple-glyph">現場住所</dt>
              <dd className="font-normal text-apple-text">{c.siteAddress}</dd>
            </div>
            <div>
              <dt className="text-apple-glyph">調査担当</dt>
              <dd className="font-normal text-apple-text">{c.surveyorName}</dd>
            </div>
            <div>
              <dt className="text-apple-glyph">登録者</dt>
              <dd className="font-normal text-apple-text">{survey.userName}</dd>
            </div>
            {c.contactPhone && (
              <div>
                <dt className="text-apple-glyph">連絡先</dt>
                <dd className="font-normal text-apple-text">{c.contactPhone}</dd>
              </div>
            )}
            {c.customerContact && (
              <div>
                <dt className="text-apple-glyph">客先担当</dt>
                <dd className="font-normal text-apple-text">{c.customerContact}</dd>
              </div>
            )}
            <div>
              <dt className="text-apple-glyph">見積</dt>
              <dd className="font-normal text-apple-text">
                {c.hasEstimate ? "あり" : "なし"}
              </dd>
            </div>
          </dl>
        </Card>

        <Card title="作業予定">
          <dl className="space-y-2 text-caption">
            <div>
              <dt className="text-apple-glyph">作業日時</dt>
              <dd className="font-normal text-apple-text">
                {formatDate(c.workDatetime)}
              </dd>
            </div>
            <div>
              <dt className="text-apple-glyph">機種</dt>
              <dd className="font-normal text-apple-text">
                {c.machineModel || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-apple-glyph">予定車両</dt>
              <dd className="font-normal text-apple-text">
                {c.plannedVehicles.join("、") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-apple-glyph">予定人数</dt>
              <dd className="font-normal text-apple-text">
                {c.plannedWorkers ?? "—"}
              </dd>
            </div>
          </dl>
        </Card>

        <Card title="搬入・設備" className="col-span-3">
          <dl className="grid grid-cols-3 gap-4 text-caption">
            <div>
              <dt className="text-apple-glyph">入口 高さ/幅</dt>
              <dd>
                {c.entrance.heightMm ?? "—"} mm / {c.entrance.widthMm ?? "—"} mm
              </dd>
            </div>
            <div>
              <dt className="text-apple-glyph">軒・段差</dt>
              <dd>
                {c.entrance.eaves || "—"} / {c.entrance.step || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-apple-glyph">荷降し階</dt>
              <dd>{c.unload.floor || "—"}</dd>
            </div>
            <div>
              <dt className="text-apple-glyph">クレーン</dt>
              <dd>{c.facility.overheadCrane || "—"}</dd>
            </div>
            <div>
              <dt className="text-apple-glyph">フォークリフト</dt>
              <dd>{c.facility.forklift || "—"}</dd>
            </div>
            <div>
              <dt className="text-apple-glyph">その他設備</dt>
              <dd>{c.facility.other || "—"}</dd>
            </div>
          </dl>
        </Card>

        <Card title="作業手順・注意" className="col-span-2">
          <p className="mb-2 text-xs font-medium text-apple-glyph">手順</p>
          <ul className="mb-4 list-inside list-disc text-caption">
            {c.workSteps.filter(Boolean).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
            {!c.workSteps.filter(Boolean).length && <li>—</li>}
          </ul>
          <p className="mb-2 text-xs font-medium text-apple-glyph">注意事項</p>
          <ul className="list-inside list-disc text-caption">
            {c.precautions.filter(Boolean).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
            {!c.precautions.filter(Boolean).length && <li>—</li>}
          </ul>
        </Card>

        <Card title="道具チェック">
          <ul className="space-y-1 text-caption">
            {c.tools.map((t) => (
              <li key={t.toolId ?? t.name}>
                {t.name}（積: {t.load ? "○" : "—"} / 使: {t.use ? "○" : "—"}）
              </li>
            ))}
            {!c.tools.length && <li>—</li>}
          </ul>
        </Card>

        <Card title="現場写真" className="col-span-3">
          <PhotoGrid entries={photos} />
        </Card>
      </div>
    </AppShell>
  );
}

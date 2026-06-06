"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/utils";
import type { CompanyInfo, MasterType } from "@/lib/types";

type MasterItem = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  label?: string;
  code?: string;
  contact?: string;
};

const MASTER_MENUS: { type: MasterType; label: string; group: string }[] = [
  { type: "daily_work_types", label: "作業種別", group: "作業日報" },
  { type: "daily_vehicles", label: "車両・重機", group: "作業日報" },
  { type: "daily_materials", label: "資材", group: "作業日報" },
  { type: "site_work_types", label: "作業種別", group: "現地調査" },
  { type: "site_tools", label: "必要道具", group: "現地調査" },
  { type: "expense_categories", label: "経費科目", group: "経費" },
  { type: "payees", label: "支払先", group: "支払・外注" },
];

export function MasterManager() {
  const [selected, setSelected] = useState<MasterType>("daily_work_types");
  const [newName, setNewName] = useState("");
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);

  const { data, isLoading, mutate } = useApi<{ items: MasterItem[] }>(
    `/api/admin/masters?type=${selected}&includeInactive=true`
  );
  const { data: companyData, mutate: mutateCompany } = useApi<{
    companyInfo: CompanyInfo;
  }>("/api/admin/masters");

  const items = data?.items ?? [];

  useEffect(() => {
    if (companyData?.companyInfo) {
      setCompanyInfo(companyData.companyInfo);
    }
  }, [companyData]);

  async function handleAdd() {
    if (!newName.trim()) return;
    await api.post("/api/admin/masters", {
      type: selected,
      item: { name: newName.trim(), label: newName.trim() },
    });
    setNewName("");
    await mutate();
  }

  async function toggleActive(item: MasterItem) {
    await api.patch("/api/admin/masters", {
      type: selected,
      id: item.id,
      patch: { isActive: !item.isActive },
    });
    await mutate();
  }

  async function handleReset() {
    if (!confirm("初期 seed に戻しますか？")) return;
    await api.post("/api/admin/masters", { type: selected, action: "reset" });
    await mutate();
  }

  async function saveCompany() {
    if (!companyInfo) return;
    await api.patch("/api/admin/masters", { companyInfo });
    await mutateCompany();
    alert("会社情報を保存しました");
  }

  const groups = [...new Set(MASTER_MENUS.map((m) => m.group))];

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-3 space-y-4">
        {groups.map((group) => (
          <div key={group}>
            <p className="mb-2 text-nav-link font-normal uppercase text-apple-glyph">
              {group}
            </p>
            <div className="space-y-1">
              {MASTER_MENUS.filter((m) => m.group === group).map((menu) => (
                <button
                  key={menu.type}
                  type="button"
                  onClick={() => setSelected(menu.type)}
                  className={`block w-full rounded-xl px-3 py-2 text-left text-caption font-normal focus-apple ${
                    selected === menu.type
                      ? "bg-brand-50 text-brand-600"
                      : "text-apple-glyph hover:bg-apple-section"
                  }`}
                >
                  {menu.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="col-span-9 space-y-6">
        <Card
          title={
            MASTER_MENUS.find((m) => m.type === selected)?.label ?? "マスタ"
          }
          action={
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleReset}>
                初期値に戻す
              </Button>
            </div>
          }
        >
          <div className="mb-4 flex gap-2">
            <Input
              placeholder="新規名称"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="max-w-xs"
            />
            <Button size="sm" onClick={handleAdd}>
              ＋ 追加
            </Button>
          </div>

          {isLoading && !data ? (
            <TableSkeleton rows={5} cols={4} />
          ) : (
            <DataTable
              columns={[
                { key: "sort", label: "順" },
                { key: "name", label: "名称" },
                { key: "status", label: "状態" },
                { key: "action", label: "操作" },
              ]}
              rows={items.map((item) => ({
                sort: item.sortOrder,
                name: item.label ?? item.name,
                status: (
                  <Badge tone={item.isActive ? "success" : "default"}>
                    {item.isActive ? "有効" : "無効"}
                  </Badge>
                ),
                action: (
                  <Button
                    size="sm"
                    variant={item.isActive ? "ghost" : "secondary"}
                    onClick={(e) => {
                      e.stopPropagation();
                      void toggleActive(item);
                    }}
                  >
                    {item.isActive ? "無効化" : "有効化"}
                  </Button>
                ),
              }))}
            />
          )}
        </Card>

        <Card title="会社・帳票情報（M11）">
          {companyInfo && (
            <div className="grid max-w-2xl grid-cols-2 gap-4">
              <Input
                label="社名"
                value={companyInfo.name}
                onChange={(e) =>
                  setCompanyInfo({ ...companyInfo, name: e.target.value })
                }
              />
              <Input
                label="電話"
                value={companyInfo.phone}
                onChange={(e) =>
                  setCompanyInfo({ ...companyInfo, phone: e.target.value })
                }
              />
              <Input
                label="住所"
                value={companyInfo.address}
                onChange={(e) =>
                  setCompanyInfo({ ...companyInfo, address: e.target.value })
                }
                className="col-span-2"
              />
              <Input
                label="振込先"
                value={companyInfo.bankInfo}
                onChange={(e) =>
                  setCompanyInfo({ ...companyInfo, bankInfo: e.target.value })
                }
                className="col-span-2"
              />
              <Button onClick={saveCompany}>保存</Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

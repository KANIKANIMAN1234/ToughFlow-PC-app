"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { VoiceInputTextarea } from "@/components/ui/VoiceInputTextarea";
import { ROLE_LABELS } from "@/lib/permissions/defaults";
import {
  applyParsedProjectEmail,
  customerDisplayName,
} from "@/lib/project/register-helpers";
import type {
  AssignableUser,
  CustomerOption,
  ProjectAssignmentRole,
} from "@/lib/types";
import { api, todayISO } from "@/lib/utils";

const ASSIGNMENT_ROLE_OPTIONS: { value: ProjectAssignmentRole; label: string }[] =
  [
    { value: "main", label: "メイン" },
    { value: "sub", label: "サブ" },
  ];

type AssignmentRow = {
  key: string;
  userId: string;
  assignmentRole: ProjectAssignmentRole;
};

function createAssignmentRow(
  assignmentRole: ProjectAssignmentRole = "main"
): AssignmentRow {
  return {
    key: crypto.randomUUID(),
    userId: "",
    assignmentRole,
  };
}

const selectClassName =
  "w-full rounded-xl border border-surface-border bg-white px-3 py-2.5 text-body text-apple-text focus-apple";

const textareaClassName =
  "w-full rounded-xl border border-surface-border bg-white px-3 py-2.5 text-body text-apple-text focus-apple min-h-[120px]";

export function ProjectRegisterForm() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [assignees, setAssignees] = useState<AssignableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [parsingEmail, setParsingEmail] = useState(false);
  const [emailPasteText, setEmailPasteText] = useState("");
  const [name, setName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [clientContactName, setClientContactName] = useState("");
  const [clientContactTitle, setClientContactTitle] = useState("");
  const [clientContactPhone, setClientContactPhone] = useState("");
  const [clientContactEmail, setClientContactEmail] = useState("");
  const [projectSummary, setProjectSummary] = useState("");
  const [workStartDate, setWorkStartDate] = useState(todayISO());
  const [assignmentRows, setAssignmentRows] = useState<AssignmentRow[]>([
    createAssignmentRow("main"),
  ]);

  useEffect(() => {
    api
      .get<{ customers: CustomerOption[]; assignees: AssignableUser[] }>(
        "/api/projects/register-meta"
      )
      .then((data) => {
        setCustomers(data.customers);
        setAssignees(data.assignees);
        if (data.customers[0]) {
          setCustomerId(data.customers[0].id);
          setCustomerName(data.customers[0].name);
          setAddress(data.customers[0].address ?? "");
        }
      })
      .catch((e) => {
        alert(e instanceof Error ? e.message : "データの取得に失敗しました");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCustomerChange = useCallback(
    (id: string) => {
      setCustomerId(id);
      const customer = customers.find((c) => c.id === id);
      if (customer) {
        setCustomerName(customer.name);
        setAddress(customer.address ?? "");
      }
    },
    [customers]
  );

  async function handleParseEmail() {
    if (!emailPasteText.trim()) {
      alert("メール本文を貼り付けてください");
      return;
    }
    setParsingEmail(true);
    try {
      const { parsed } = await api.post<{ parsed: import("@/lib/types").ParsedProjectEmail }>(
        "/api/projects/parse-email",
        { emailText: emailPasteText }
      );
      const applied = applyParsedProjectEmail(parsed, customers);
      if (applied.name) setName(applied.name);
      if (applied.customerId) handleCustomerChange(applied.customerId);
      if (applied.customerName) setCustomerName(applied.customerName);
      if (applied.address) setAddress(applied.address);
      if (applied.clientContactName) setClientContactName(applied.clientContactName);
      if (applied.clientContactTitle) setClientContactTitle(applied.clientContactTitle);
      if (applied.clientContactPhone) setClientContactPhone(applied.clientContactPhone);
      if (applied.clientContactEmail) setClientContactEmail(applied.clientContactEmail);
      if (applied.projectSummary) setProjectSummary(applied.projectSummary);
      if (applied.workStartDate) setWorkStartDate(applied.workStartDate);
      if (!applied.customerId && applied.customerName) {
        alert(
          `顧客名「${applied.customerName}」に一致するマスタが見つかりませんでした。顧客（マスタ）を手動で選択してください。`
        );
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "メール解析に失敗しました");
    } finally {
      setParsingEmail(false);
    }
  }

  function updateAssignmentRow(
    key: string,
    patch: Partial<Pick<AssignmentRow, "userId" | "assignmentRole">>
  ) {
    setAssignmentRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row))
    );
  }

  function addAssignmentRow() {
    setAssignmentRows((prev) => [...prev, createAssignmentRow("sub")]);
  }

  function removeAssignmentRow(key: string) {
    setAssignmentRows((prev) =>
      prev.length <= 1 ? prev : prev.filter((row) => row.key !== key)
    );
  }

  const usedUserIds = new Set(
    assignmentRows.map((row) => row.userId).filter(Boolean)
  );

  const isFormValid =
    name.trim() &&
    customerId &&
    assignmentRows.length > 0 &&
    assignmentRows.every((row) => row.userId) &&
    assignmentRows.some((row) => row.assignmentRole === "main");

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const result = await api.post<{
        project: { id: string; name: string };
        driveCreated: boolean;
        driveWarning?: string;
      }>("/api/projects", {
        name,
        customerId,
        workStartDate,
        address,
        clientContactName,
        clientContactTitle,
        clientContactPhone,
        clientContactEmail,
        projectSummary,
        assignments: assignmentRows.map((row) => ({
          userId: row.userId,
          assignmentRole: row.assignmentRole,
        })),
      });

      let message = `案件「${result.project.name}」を登録しました。`;
      if (result.driveCreated) {
        message += "\nGoogle Drive の案件フォルダを作成しました。";
      } else if (result.driveWarning) {
        message += `\n\nDriveフォルダ: ${result.driveWarning}`;
      }
      alert(message);
      router.replace("/projects");
    } catch (e) {
      alert(e instanceof Error ? e.message : "登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <TableSkeleton rows={6} cols={3} />;
  }

  return (
    <div className="space-y-6">
      <Card title="メールから取込">
        <p className="mb-3 text-caption text-apple-glyph">
          お客様から届いたメール本文を貼り付けて「AIで解析」を押すと、各項目へ自動反映します。
        </p>
        <textarea
          value={emailPasteText}
          onChange={(e) => setEmailPasteText(e.target.value)}
          placeholder="メール本文をここに貼り付け…"
          className={`${textareaClassName} mb-3`}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={parsingEmail || !emailPasteText.trim()}
          onClick={handleParseEmail}
        >
          {parsingEmail ? "解析中…" : "AIで解析"}
        </Button>
      </Card>

      <Card title="案件情報">
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="案件名"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: ガンドリル搬入"
          />
          <label className="block space-y-1.5">
            <span className="text-caption font-medium text-apple-text">
              顧客（マスタ）
            </span>
            <select
              value={customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              className={selectClassName}
            >
              {customers.length === 0 ? (
                <option value="">顧客が登録されていません</option>
              ) : (
                customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <Input
            label="顧客名"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            hint={
              customerId
                ? `マスタ: ${customerDisplayName(customers, customerId)}`
                : undefined
            }
          />
          <Input
            label="住所"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <Input
            label="担当者氏名"
            value={clientContactName}
            onChange={(e) => setClientContactName(e.target.value)}
            placeholder="お客様側の担当者"
          />
          <Input
            label="役職"
            value={clientContactTitle}
            onChange={(e) => setClientContactTitle(e.target.value)}
          />
          <Input
            label="連絡先"
            value={clientContactPhone}
            onChange={(e) => setClientContactPhone(e.target.value)}
            placeholder="電話番号"
          />
          <Input
            label="メールアドレス"
            type="email"
            value={clientContactEmail}
            onChange={(e) => setClientContactEmail(e.target.value)}
          />
          <Input
            label="作業開始日"
            type="date"
            value={workStartDate}
            onChange={(e) => setWorkStartDate(e.target.value)}
            hint="Driveフォルダ名に使用します"
          />
        </div>
        <div className="mt-4">
          <VoiceInputTextarea
            label="案件概要"
            value={projectSummary}
            onChange={setProjectSummary}
            placeholder="依頼内容・作業概要（電話メモは音声入力→AI整形が利用できます）"
            rows={5}
            formatContext="project_summary"
            autoFormatAfterRecord
          />
        </div>
      </Card>

      <Card title="担当者割り当て">
        <p className="mb-4 text-caption text-apple-glyph">
          管理者・部長・現場スタッフなど全スタッフから担当者を選び、メインまたはサブとして割り当てます。
        </p>
        {assignees.length === 0 ? (
          <p className="text-caption text-apple-glyph">
            割り当て可能なスタッフがいません。
          </p>
        ) : (
          <div className="space-y-3">
            {assignmentRows.map((row) => (
              <div
                key={row.key}
                className="grid gap-3 rounded-xl border border-surface-border p-4 md:grid-cols-[1fr_140px_auto]"
              >
                <label className="block space-y-1.5">
                  <span className="text-caption font-medium text-apple-text">
                    スタッフ
                  </span>
                  <select
                    value={row.userId}
                    onChange={(e) =>
                      updateAssignmentRow(row.key, { userId: e.target.value })
                    }
                    className={selectClassName}
                  >
                    <option value="">選択してください</option>
                    {assignees.map((user) => (
                      <option
                        key={user.id}
                        value={user.id}
                        disabled={
                          user.id !== row.userId && usedUserIds.has(user.id)
                        }
                      >
                        {user.name}（{ROLE_LABELS[user.role]}）
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-caption font-medium text-apple-text">
                    区分
                  </span>
                  <select
                    value={row.assignmentRole}
                    onChange={(e) =>
                      updateAssignmentRow(row.key, {
                        assignmentRole: e.target.value as ProjectAssignmentRole,
                      })
                    }
                    className={selectClassName}
                  >
                    {ASSIGNMENT_ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={assignmentRows.length <= 1}
                    onClick={() => removeAssignmentRow(row.key)}
                  >
                    削除
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={addAssignmentRow}>
              担当者を追加
            </Button>
          </div>
        )}
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.push("/projects")}>
          キャンセル
        </Button>
        <Button
          type="button"
          disabled={submitting || !isFormValid}
          onClick={handleSubmit}
        >
          {submitting ? "登録中…" : "案件を登録"}
        </Button>
      </div>
    </div>
  );
}

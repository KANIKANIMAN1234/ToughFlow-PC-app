import {
  evaluateAgreement36Alerts,
  formatAgreement36AlertMessage,
  type Agreement36Alert,
} from "@/lib/attendance/agreement-36-evaluate";
import { listTenantStaff } from "@/lib/db/repository";
import {
  isLineMessagingConfigured,
  pushTextMessage,
  type LinePushResult,
} from "@/lib/line/messaging";
import type { Agreement36Fiscal, TenantStaff } from "@/lib/types";

export type Agreement36LineDispatchResult = {
  enabled: boolean;
  workDate: string;
  alerts: Agreement36Alert[];
  skippedReason?: string;
  recipients: {
    lineUserId: string;
    staffName: string;
    messageCount: number;
  }[];
  sends: {
    lineUserId: string;
    staffName: string;
    ok: boolean;
    error?: string;
    messageId?: string;
  }[];
};

function hasLineNotifyTarget(fiscal: Agreement36Fiscal): boolean {
  return (
    fiscal.notifyEmployeeLine ||
    fiscal.notifyAdminLine ||
    fiscal.notifyCustomLine
  );
}

function staffById(staffList: TenantStaff[]): Map<string, TenantStaff> {
  return new Map(staffList.map((staff) => [staff.id, staff]));
}

function resolveLineRecipients(
  alert: Agreement36Alert,
  fiscal: Agreement36Fiscal,
  staffList: TenantStaff[]
): { lineUserId: string; staffName: string }[] {
  const byId = staffById(staffList);
  const recipients: { lineUserId: string; staffName: string }[] = [];
  const seen = new Set<string>();

  const add = (lineUserId: string | undefined, staffName: string) => {
    const id = lineUserId?.trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    recipients.push({ lineUserId: id, staffName });
  };

  if (fiscal.notifyEmployeeLine) {
    const staff = byId.get(alert.userId);
    add(staff?.lineUserId, staff?.name ?? alert.userName);
  }

  if (fiscal.notifyAdminLine) {
    for (const staff of staffList) {
      if (staff.role === "admin") {
        add(staff.lineUserId, staff.name);
      }
    }
  }

  if (fiscal.notifyCustomLine && fiscal.notifyCustomLineUserId) {
    const staff = byId.get(fiscal.notifyCustomLineUserId);
    add(staff?.lineUserId, staff?.name ?? "カスタム通知先");
  }

  return recipients;
}

function buildMessagesPerRecipient(
  alerts: Agreement36Alert[],
  fiscal: Agreement36Fiscal,
  staffList: TenantStaff[]
): Map<string, { staffName: string; messages: string[] }> {
  const map = new Map<string, { staffName: string; messages: string[] }>();

  for (const alert of alerts) {
    const recipients = resolveLineRecipients(alert, fiscal, staffList);
    const message = formatAgreement36AlertMessage(alert);
    for (const recipient of recipients) {
      const existing = map.get(recipient.lineUserId);
      if (existing) {
        existing.messages.push(message);
      } else {
        map.set(recipient.lineUserId, {
          staffName: recipient.staffName,
          messages: [message],
        });
      }
    }
  }

  return map;
}

export async function dispatchAgreement36LineAlerts(
  tenantId: string,
  options: { dryRun?: boolean; referenceDate?: Date } = {}
): Promise<Agreement36LineDispatchResult> {
  const evaluation = await evaluateAgreement36Alerts(
    tenantId,
    options.referenceDate
  );

  if (!evaluation.enabled) {
    return {
      enabled: false,
      workDate: evaluation.workDate,
      alerts: [],
      skippedReason: "36協定機能が無効です",
      recipients: [],
      sends: [],
    };
  }

  if (!hasLineNotifyTarget(evaluation.fiscal)) {
    return {
      enabled: true,
      workDate: evaluation.workDate,
      alerts: evaluation.alerts,
      skippedReason: "LINE 通知先が未設定です",
      recipients: [],
      sends: [],
    };
  }

  if (!evaluation.alerts.length) {
    return {
      enabled: true,
      workDate: evaluation.workDate,
      alerts: [],
      skippedReason: "アラート対象はありません",
      recipients: [],
      sends: [],
    };
  }

  const staffList = await listTenantStaff(tenantId);
  const messageMap = buildMessagesPerRecipient(
    evaluation.alerts,
    evaluation.fiscal,
    staffList
  );

  const recipients = [...messageMap.entries()].map(([lineUserId, value]) => ({
    lineUserId,
    staffName: value.staffName,
    messageCount: value.messages.length,
  }));

  if (options.dryRun) {
    return {
      enabled: true,
      workDate: evaluation.workDate,
      alerts: evaluation.alerts,
      recipients,
      sends: [],
    };
  }

  if (!isLineMessagingConfigured()) {
    return {
      enabled: true,
      workDate: evaluation.workDate,
      alerts: evaluation.alerts,
      skippedReason:
        "LINE Messaging API が未設定です（LINE_CHANNEL_ACCESS_TOKEN）",
      recipients,
      sends: [],
    };
  }

  const sends: Agreement36LineDispatchResult["sends"] = [];

  for (const [lineUserId, value] of messageMap) {
    const text = value.messages.join("\n\n");
    const result: LinePushResult = await pushTextMessage(lineUserId, text);
    sends.push({
      lineUserId,
      staffName: value.staffName,
      ok: result.ok,
      error: result.ok ? undefined : result.error,
      messageId: result.ok ? result.messageId : undefined,
    });
  }

  return {
    enabled: true,
    workDate: evaluation.workDate,
    alerts: evaluation.alerts,
    recipients,
    sends,
  };
}

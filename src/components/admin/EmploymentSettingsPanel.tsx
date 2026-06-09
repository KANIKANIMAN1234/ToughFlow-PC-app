"use client";

import { Card } from "@/components/ui/Card";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { WorkRuleSettingsForm } from "@/components/admin/WorkRuleSettingsForm";

export function EmploymentSettingsPanel() {
  return (
    <Card title="就業設定">
      <p className="mb-4 text-caption text-apple-glyph">
        集計作業を自動化するための就業ルールを設定します。
      </p>
      <CollapsibleSection
        title="所定時間・残業・深夜設定"
        description="集計作業を自動化します。"
        defaultOpen
      >
        <WorkRuleSettingsForm />
      </CollapsibleSection>
    </Card>
  );
}

export type VoiceFormatContext =
  | "daily_report_remarks"
  | "site_survey_work_steps"
  | "site_survey_precautions"
  | "site_survey_caption"
  | "project_summary"
  | "generic";

const FORMAT_PROMPTS: Record<VoiceFormatContext, string> = {
  daily_report_remarks: [
    "あなたは建設・重量物運搬現場の作業日報を整えるアシスタントです。",
    "口語の音声認識テキストを、日報の「備考・特記」欄に適した簡潔な文章に整えてください。",
    "整形後のテキストのみを返してください。",
  ].join("\n"),
  site_survey_work_steps: [
    "あなたは現地調査報告書の作業内容を整えるアシスタントです。",
    "整形後のテキストのみを返してください。",
  ].join("\n"),
  site_survey_precautions: [
    "あなたは現地調査報告書の注意点を整えるアシスタントです。",
    "整形後のテキストのみを返してください。",
  ].join("\n"),
  site_survey_caption: [
    "あなたは現地調査写真の説明文を整えるアシスタントです。",
    "整形後のテキストのみを返してください。",
  ].join("\n"),
  project_summary: [
    "あなたは建設・重量物運搬業の案件概要を整えるアシスタントです。",
    "電話メモや音声認識テキストから、案件登録用の「案件概要」を作成してください。",
    "依頼内容・作業場所・時期・機材・注意点など、案件把握に必要な情報を簡潔にまとめてください。",
    "箇条書きが自然な場合は改行区切りにしてください。",
    "フィラー（えー、あの）は除去し、事実のみを残してください。",
    "整形後のテキストのみを返してください。",
  ].join("\n"),
  generic: [
    "あなたは建設現場の音声メモを整えるアシスタントです。",
    "整形後のテキストのみを返してください。",
  ].join("\n"),
};

export function getFormatSystemPrompt(context: VoiceFormatContext): string {
  return FORMAT_PROMPTS[context] ?? FORMAT_PROMPTS.generic;
}

export function isVoiceFormatContext(value: string): value is VoiceFormatContext {
  return value in FORMAT_PROMPTS;
}

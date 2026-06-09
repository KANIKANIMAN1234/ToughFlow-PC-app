"use client";

type Props = {
  name: string;
  editing?: boolean;
};

/**
 * 地図上に常時表示する顧客名ラベル＋ピン。
 * CSS transform は使わない（AdvancedMarker のアンカー計算と競合しズーム時に位置ずれするため）。
 * 下端中央の赤丸が地理座標に一致するよう、親の AdvancedMarker で BOTTOM_CENTER を指定する。
 */
export function CustomerMapPin({ name, editing = false }: Props) {
  return (
    <div
      className={`flex w-max flex-col items-center ${
        editing ? "pointer-events-none select-none" : ""
      }`}
    >
      <div
        className={`max-w-[11rem] truncate rounded-md border px-2.5 py-1 text-xs font-semibold shadow-md ${
          editing
            ? "border-blue-400 bg-blue-50 text-blue-900"
            : "border-gray-200 bg-white text-gray-900"
        }`}
      >
        {editing ? `${name}（ドラッグ可）` : name}
      </div>
      <div
        className={`mt-1 shrink-0 rounded-full border-2 border-white shadow ${
          editing
            ? "h-4 w-4 animate-pulse bg-blue-600 ring-4 ring-blue-300/60"
            : "h-3 w-3 bg-red-600"
        }`}
      />
    </div>
  );
}

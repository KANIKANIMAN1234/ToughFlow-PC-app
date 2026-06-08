"use client";

type Props = {
  name: string;
};

/**
 * 地図上に常時表示する顧客名ラベル＋ピン。
 * CSS transform は使わない（AdvancedMarker のアンカー計算と競合しズーム時に位置ずれするため）。
 * 下端中央の赤丸が地理座標に一致するよう、親の AdvancedMarker で BOTTOM_CENTER を指定する。
 */
export function CustomerMapPin({ name }: Props) {
  return (
    <div className="flex w-max flex-col items-center">
      <div className="max-w-[11rem] truncate rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-900 shadow-md">
        {name}
      </div>
      <div className="mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-white bg-red-600 shadow" />
    </div>
  );
}

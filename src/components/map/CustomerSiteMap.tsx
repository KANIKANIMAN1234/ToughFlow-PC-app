"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AdvancedMarker,
  AdvancedMarkerAnchorPoint,
  APILoadingStatus,
  APIProvider,
  InfoWindow,
  Map,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { mutate } from "swr";
import { CustomerMapPin } from "@/components/map/CustomerMapPin";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/utils";
import type { MapMarker, ResolvedMapMarker } from "@/lib/map/types";

const MAP_ID =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() || "DEMO_MAP_ID";

const DEFAULT_CENTER = { lat: 36.1323, lng: 139.6014 };
const DEFAULT_ZOOM = 10;

/** 微調整ボタン1回あたりの移動量（約10m） */
const NUDGE_LAT = 0.00009;
const NUDGE_LNG = 0.00011;

function hasCoords(
  marker: MapMarker
): marker is MapMarker & { lat: number; lng: number } {
  return (
    marker.lat != null &&
    marker.lng != null &&
    Number.isFinite(marker.lat) &&
    Number.isFinite(marker.lng)
  );
}

async function geocodeAddress(
  geocoder: google.maps.Geocoder,
  address: string
): Promise<google.maps.LatLngLiteral | null> {
  return new Promise((resolve) => {
    geocoder.geocode({ address, region: "JP" }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        const loc = results[0].geometry.location;
        resolve({ lat: loc.lat(), lng: loc.lng() });
      } else {
        resolve(null);
      }
    });
  });
}

function GoogleMapsLoadGate({ children }: { children: React.ReactNode }) {
  const status = useApiLoadingStatus();
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  if (
    status === APILoadingStatus.NOT_LOADED ||
    status === APILoadingStatus.LOADING
  ) {
    return (
      <p className="text-caption text-apple-glyph">地図を読み込んでいます…</p>
    );
  }

  if (
    status === APILoadingStatus.FAILED ||
    status === APILoadingStatus.AUTH_FAILURE
  ) {
    return (
      <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p className="font-medium">Google マップを読み込めませんでした。</p>
        <p className="text-caption">以下をご確認ください。</p>
        <ul className="list-disc space-y-1 pl-5 text-caption">
          <li>
            Google Cloud の API キー「HTTP リファラー」にこのアプリの URL を追加する
            {origin ? `（例: ${origin}/*）` : ""}
          </li>
          <li>Maps JavaScript API が有効になっているか</li>
          <li>
            Vercel に NEXT_PUBLIC_GOOGLE_MAPS_API_KEY と
            NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID が設定済みか（設定後は再デプロイが必要）
          </li>
        </ul>
      </div>
    );
  }

  return <div className="flex h-full flex-col">{children}</div>;
}

function MapViewport({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const next = Math.floor(el.getBoundingClientRect().height);
      if (next > 0) setHeight(next);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener("resize", update);
    const timers = [100, 300, 600, 1000].map((ms) =>
      window.setTimeout(update, ms)
    );

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      for (const id of timers) window.clearTimeout(id);
    };
  }, []);

  return (
    <div ref={containerRef} className="h-full min-h-0 w-full flex-1">
      {height > 0 ? (
        <Map
          mapId={MAP_ID}
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          gestureHandling="greedy"
          disableDefaultUI={false}
          style={{ width: "100%", height: `${height}px` }}
        >
          {children}
        </Map>
      ) : null}
    </div>
  );
}

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const trigger = () => {
      google.maps.event.trigger(map, "resize");
    };
    trigger();
    const timers = [100, 400, 800].map((ms) => window.setTimeout(trigger, ms));
    window.addEventListener("resize", trigger);
    return () => {
      for (const id of timers) window.clearTimeout(id);
      window.removeEventListener("resize", trigger);
    };
  }, [map]);

  return null;
}

function MapBoundsFitter({
  markers,
  paused,
}: {
  markers: ResolvedMapMarker[];
  paused: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || markers.length === 0 || paused) return;
    if (markers.length === 1) {
      map.setCenter({ lat: markers[0].lat, lng: markers[0].lng });
      map.setZoom(14);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    for (const m of markers) bounds.extend({ lat: m.lat, lng: m.lng });
    map.fitBounds(bounds, 48);
  }, [map, markers, paused]);

  return null;
}

/** 編集モード中: 地図クリックでピン位置を移動 */
function MapClickPlacer({
  active,
  onPlace,
}: {
  active: boolean;
  onPlace: (pos: google.maps.LatLngLiteral) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !active) return;
    const listener = map.addListener(
      "click",
      (e: google.maps.MapMouseEvent) => {
        const latLng = e.latLng;
        if (!latLng) return;
        onPlace({ lat: latLng.lat(), lng: latLng.lng() });
      }
    );
    return () => listener.remove();
  }, [map, active, onPlace]);

  return null;
}

function CustomerSelectionBar({
  customerName,
  address,
  onStartEdit,
  onClose,
}: {
  customerName: string;
  address: string;
  onStartEdit: () => void;
  onClose: () => void;
}) {
  return (
    <div className="pointer-events-auto absolute inset-x-4 bottom-4 z-20 mx-auto max-w-lg rounded-xl border border-surface-border bg-white p-4 shadow-lg">
      <div className="mb-3">
        <p className="text-sm font-semibold text-gray-900">{customerName}</p>
        <p className="mt-0.5 text-xs text-gray-600">{address}</p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          onClick={onStartEdit}
        >
          位置を修正
        </button>
        <button
          type="button"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          onClick={onClose}
        >
          閉じる
        </button>
      </div>
    </div>
  );
}

function LocationEditBar({
  customerName,
  position,
  saving,
  saveError,
  onNudge,
  onSave,
  onCancel,
}: {
  customerName: string;
  position: { lat: number; lng: number };
  saving: boolean;
  saveError: string | null;
  onNudge: (delta: { lat: number; lng: number }) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="pointer-events-auto absolute inset-x-4 bottom-4 z-20 mx-auto max-w-lg rounded-xl border border-blue-200 bg-white p-4 shadow-lg">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-blue-900">
            位置修正モード — {customerName}
          </p>
          <p className="mt-1 text-xs text-gray-600">
            青い丸をドラッグするか、地図をクリックして位置を指定してください。
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800">
          編集中
        </span>
      </div>

      <p className="mb-3 font-mono text-[11px] text-gray-500">
        {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
      </p>

      <div className="mb-3 flex items-center justify-center gap-1">
        <span className="mr-2 text-xs text-gray-500">微調整</span>
        <button
          type="button"
          aria-label="北へ移動"
          className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
          disabled={saving}
          onClick={() => onNudge({ lat: NUDGE_LAT, lng: 0 })}
        >
          ↑
        </button>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            aria-label="西へ移動"
            className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
            disabled={saving}
            onClick={() => onNudge({ lat: 0, lng: -NUDGE_LNG })}
          >
            ←
          </button>
          <button
            type="button"
            aria-label="東へ移動"
            className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
            disabled={saving}
            onClick={() => onNudge({ lat: 0, lng: NUDGE_LNG })}
          >
            →
          </button>
        </div>
        <button
          type="button"
          aria-label="南へ移動"
          className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
          disabled={saving}
          onClick={() => onNudge({ lat: -NUDGE_LAT, lng: 0 })}
        >
          ↓
        </button>
      </div>

      {saveError && (
        <p className="mb-2 text-xs text-red-600" role="alert">
          {saveError}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          disabled={saving}
          onClick={onSave}
        >
          {saving ? "保存中…" : "この位置で保存"}
        </button>
        <button
          type="button"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          disabled={saving}
          onClick={onCancel}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

type Props = {
  enabled: boolean;
};

export function CustomerSiteMap({ enabled }: Props) {
  const { user } = useAuth();
  const canEditLocation =
    user?.role === "admin" || user?.role === "office";

  const { data, isLoading, error } = useApi<{ markers: MapMarker[] }>(
    enabled ? "/api/map/markers" : null
  );
  const markers = useMemo(() => data?.markers ?? [], [data?.markers]);
  const [resolved, setResolved] = useState<ResolvedMapMarker[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftPos, setDraftPos] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const geocodingLib = useMapsLibrary("geocoding");

  useEffect(() => {
    if (!geocodingLib || markers.length === 0) return;

    let cancelled = false;
    const geocoder = new geocodingLib.Geocoder();

    async function resolveMarkers() {
      const next: ResolvedMapMarker[] = [];

      for (const marker of markers) {
        if (hasCoords(marker)) {
          next.push({ ...marker, lat: marker.lat, lng: marker.lng });
          continue;
        }
        const coords = await geocodeAddress(geocoder, marker.address);
        if (cancelled) return;
        if (coords) next.push({ ...marker, lat: coords.lat, lng: coords.lng });
      }

      if (!cancelled) setResolved(next);
    }

    void resolveMarkers();
    return () => {
      cancelled = true;
    };
  }, [geocodingLib, markers]);

  const clearEditState = useCallback(() => {
    setEditingId(null);
    setDraftPos(null);
    setSaveError(null);
  }, []);

  const selectMarker = useCallback(
    (id: string) => {
      if (editingId) return;
      setSelectedId(id);
    },
    [editingId]
  );

  const startEdit = useCallback((marker: ResolvedMapMarker) => {
    setEditingId(marker.id);
    setSelectedId(marker.id);
    setDraftPos({ lat: marker.lat, lng: marker.lng });
    setSaveError(null);
  }, []);

  const updateDraftPos = useCallback((pos: google.maps.LatLngLiteral) => {
    setDraftPos({ lat: pos.lat, lng: pos.lng });
  }, []);

  const nudgeDraftPos = useCallback(
    (delta: { lat: number; lng: number }) => {
      setDraftPos((prev) =>
        prev
          ? { lat: prev.lat + delta.lat, lng: prev.lng + delta.lng }
          : prev
      );
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!editingId || !draftPos) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api.patch(`/api/customers/${editingId}/location`, draftPos);
      setResolved((prev) =>
        prev.map((m) =>
          m.id === editingId
            ? { ...m, lat: draftPos.lat, lng: draftPos.lng }
            : m
        )
      );
      await Promise.all([
        mutate("/api/map/markers"),
        mutate("/api/customers"),
      ]);
      clearEditState();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }, [clearEditState, draftPos, editingId]);

  const handleCancelEdit = useCallback(() => {
    clearEditState();
  }, [clearEditState]);

  const selected = resolved.find((m) => m.id === selectedId) ?? null;
  const editingMarker = resolved.find((m) => m.id === editingId) ?? null;
  const showSelectionBar =
    selected != null && editingId == null && canEditLocation;
  const showInfoWindow =
    selected != null && editingId == null && !canEditLocation;

  if (isLoading && !data) {
    return <TableSkeleton rows={6} cols={1} />;
  }

  if (error) {
    const detail = error instanceof Error ? error.message : "";
    return (
      <p className="text-caption text-red-600">
        地図データの取得に失敗しました。しばらくしてから再度お試しください。
        {detail ? `（${detail}）` : ""}
      </p>
    );
  }

  if (markers.length === 0) {
    return (
      <p className="text-caption text-apple-glyph">
        住所が登録された顧客がありません。顧客マスタに住所を登録すると地図に表示されます。
      </p>
    );
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden ring-1 ring-surface-border">
      <MapViewport>
        <MapResizeHandler />
        <MapBoundsFitter markers={resolved} paused={editingId != null} />
        {editingId != null && (
          <MapClickPlacer active onPlace={updateDraftPos} />
        )}
        {resolved.map((marker) => {
          const isEditing = editingId === marker.id;
          const position =
            isEditing && draftPos
              ? draftPos
              : { lat: marker.lat, lng: marker.lng };

          return (
            <AdvancedMarker
              key={marker.id}
              position={position}
              anchorPoint={AdvancedMarkerAnchorPoint.BOTTOM_CENTER}
              draggable={isEditing}
              onDrag={(e) => {
                const latLng = e.latLng;
                if (!latLng) return;
                updateDraftPos({ lat: latLng.lat(), lng: latLng.lng() });
              }}
              onDragEnd={(e) => {
                const latLng = e.latLng;
                if (!latLng) return;
                updateDraftPos({ lat: latLng.lat(), lng: latLng.lng() });
              }}
              onClick={() => selectMarker(marker.id)}
            >
              <CustomerMapPin
                name={marker.customerName}
                editing={isEditing}
              />
            </AdvancedMarker>
          );
        })}
        {showInfoWindow && selected && (
          <InfoWindow
            position={{ lat: selected.lat, lng: selected.lng }}
            onCloseClick={() => setSelectedId(null)}
          >
            <div className="max-w-xs space-y-1 text-sm text-gray-900">
              <p className="font-medium">{selected.customerName}</p>
              <p>{selected.address}</p>
              {selected.projects.length > 0 && (
                <ul className="list-disc pl-4">
                  {selected.projects.map((p) => (
                    <li key={p.id}>{p.name}</li>
                  ))}
                </ul>
              )}
            </div>
          </InfoWindow>
        )}
      </MapViewport>

      {showSelectionBar && selected && (
        <CustomerSelectionBar
          customerName={selected.customerName}
          address={selected.address}
          onStartEdit={() => startEdit(selected)}
          onClose={() => setSelectedId(null)}
        />
      )}

      {editingId && editingMarker && draftPos && (
        <LocationEditBar
          customerName={editingMarker.customerName}
          position={draftPos}
          saving={saving}
          saveError={saveError}
          onNudge={nudgeDraftPos}
          onSave={() => void handleSave()}
          onCancel={handleCancelEdit}
        />
      )}
    </div>
  );
}

export function CustomerSiteMapRoot({ enabled }: { enabled: boolean }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";

  if (!apiKey) {
    return (
      <p className="text-caption text-apple-glyph">
        Google Maps API キー（NEXT_PUBLIC_GOOGLE_MAPS_API_KEY）が未設定です。Vercel
        の環境変数を確認してください。
      </p>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <APIProvider
        apiKey={apiKey}
        language="ja"
        region="JP"
        libraries={["marker", "geocoding"]}
      >
        <GoogleMapsLoadGate>
          <CustomerSiteMap enabled={enabled} />
        </GoogleMapsLoadGate>
      </APIProvider>
    </div>
  );
}

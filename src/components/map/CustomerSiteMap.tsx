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

/** Google Maps は親の明示高さが必要なため、ResizeObserver で px 指定する */
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
      if (editingId && editingId !== id) return;
      clearEditState();
      setSelectedId(id);
    },
    [clearEditState, editingId]
  );

  const startEdit = useCallback((marker: ResolvedMapMarker) => {
    setEditingId(marker.id);
    setDraftPos({ lat: marker.lat, lng: marker.lng });
    setSaveError(null);
  }, []);

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

  const selected = resolved.find((m) => m.id === selectedId) ?? null;
  const infoPosition =
    selected && editingId === selected.id && draftPos
      ? draftPos
      : selected
        ? { lat: selected.lat, lng: selected.lng }
        : null;

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
    <div className="flex h-full flex-col overflow-hidden ring-1 ring-surface-border">
      <MapViewport>
        <MapResizeHandler />
        <MapBoundsFitter markers={resolved} paused={editingId != null} />
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
              onDragEnd={(e) => {
                const latLng = e.latLng;
                if (!latLng) return;
                setDraftPos({ lat: latLng.lat(), lng: latLng.lng() });
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
        {selected && infoPosition && (
          <InfoWindow
            position={infoPosition}
            onCloseClick={() => {
              clearEditState();
              setSelectedId(null);
            }}
          >
            <div className="max-w-xs space-y-2 text-sm text-gray-900">
              <p className="font-medium">{selected.customerName}</p>
              <p>{selected.address}</p>
              {selected.projects.length > 0 && (
                <ul className="list-disc pl-4">
                  {selected.projects.map((p) => (
                    <li key={p.id}>{p.name}</li>
                  ))}
                </ul>
              )}
              {canEditLocation && editingId !== selected.id && (
                <button
                  type="button"
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                  onClick={() => startEdit(selected)}
                >
                  位置を修正
                </button>
              )}
              {editingId === selected.id && (
                <div className="space-y-2 border-t border-gray-200 pt-2">
                  <p className="text-xs text-gray-600">
                    ピンをドラッグして位置を調整し、保存してください。
                  </p>
                  {saveError && (
                    <p className="text-xs text-red-600" role="alert">
                      {saveError}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      disabled={saving || !draftPos}
                      onClick={() => void handleSave()}
                    >
                      {saving ? "保存中…" : "保存"}
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      disabled={saving}
                      onClick={clearEditState}
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
            </div>
          </InfoWindow>
        )}
      </MapViewport>
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

export type MapProjectSummary = {
  id: string;
  name: string;
  status: string;
};

export type MapMarker = {
  id: string;
  customerName: string;
  address: string;
  lat: number | null;
  lng: number | null;
  projects: MapProjectSummary[];
};

export type ResolvedMapMarker = MapMarker & {
  lat: number;
  lng: number;
};

import type { SiteSurveyContent, SiteSurveyPhotoEntry } from "@/lib/types";

export function getSitePhotoEntries(
  photos: SiteSurveyContent["photos"]
): SiteSurveyPhotoEntry[] {
  if (photos.sitePhotoEntries?.length) {
    return photos.sitePhotoEntries;
  }
  if (photos.sitePhoto) {
    return [{ url: photos.sitePhoto, caption: "" }];
  }
  return [{ url: "", caption: "" }];
}

export function syncSitePhotoEntries(
  photos: SiteSurveyContent["photos"],
  entries: SiteSurveyPhotoEntry[]
): SiteSurveyContent["photos"] {
  const primary = entries.find((e) => e.url)?.url;
  return {
    ...photos,
    sitePhotoEntries: entries,
    sitePhoto: primary,
  };
}

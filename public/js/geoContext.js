const API_BASE = "https://one1eleven-backend.onrender.com";

const REGION_UNKNOWN = "unknown";

function inferRegionFromTimeZone(tz) {
  if (!tz || typeof tz !== "string") return REGION_UNKNOWN;

  if (tz.startsWith("America/")) return "americas";
  if (tz.startsWith("Europe/")) return "europe";
  if (tz.startsWith("Africa/")) return "africa";
  if (tz.startsWith("Asia/")) return "asia";
  if (tz.startsWith("Australia/") || tz.startsWith("Pacific/")) return "oceania";

  return REGION_UNKNOWN;
}

function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch (e) {
    return null;
  }
}

export function resolveGeoContext(currentGeo = {}) {
  const geo = {
    timeZone: null,
    region: REGION_UNKNOWN,
    source: "none",
    ...currentGeo,
  };

  if (geo.region && geo.region !== REGION_UNKNOWN) {
    return geo;
  }

  const tz = getBrowserTimeZone();
  if (!tz) return geo;

  geo.timeZone = tz;
  geo.region = inferRegionFromTimeZone(tz);
  geo.source = "timezone";
  return geo;
}

export { inferRegionFromTimeZone, getBrowserTimeZone };

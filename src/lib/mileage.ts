export type LatLng = { lat: number; lng: number };

export type MileageStop = {
  id: string;
  orderNumber: string;
  customerName: string;
  deliveryCity: string | null;
  deliveryAddress: string | null;
  deliveryMiles: number | null;
};

const UA = "AprilsRisingKitchen/1.0 (mileage; info@aprilsrisingkitchen.com)";

export function homeAddress(): string | null {
  const dedicated = (process.env.MILEAGE_HOME ?? "").trim();
  if (dedicated) return dedicated;
  const pickup = (process.env.PICKUP_ADDRESS ?? "").trim();
  return pickup || null;
}

export function formatDestination(
  address: string | null | undefined,
  city: string | null | undefined,
): string | null {
  const street = (address ?? "").trim();
  if (!street) return null;
  const place = (city ?? "").trim();
  return place ? `${street}, ${place}, ID` : `${street}, ID`;
}

function idahoExpand(query: string): string {
  let q = query.trim();
  q = q.replace(/,\s*ID\b/gi, ", Idaho");
  if (!/idaho/i.test(q)) q = `${q}, Idaho`;
  if (!/USA|United States/i.test(q)) q = `${q}, USA`;
  return q.replace(/,\s*,/g, ",").replace(/\s+/g, " ").trim();
}

function simplifyAddress(query: string): string {
  return query
    .replace(/\b(apt|apartment|unit|ste|suite|#)\s*\S+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseMiles(
  raw: unknown,
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (raw === null || raw === undefined || raw === "") {
    return { ok: true, value: null };
  }
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n) || n < 0 || n > 999.9) {
    return { ok: false, error: "Miles must be between 0 and 999.9." };
  }
  return { ok: true, value: Math.round(n * 10) / 10 };
}

export function mapsDirectionsUrl(origin: string, destination: string): string {
  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: "driving",
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

const geocodeCache = new Map<string, LatLng>();

async function fetchJson(
  url: string,
  headers: Record<string, string> = {},
): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: "application/json", ...headers },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new Error(`Lookup failed (${res.status}).`);
  }
  return res.json();
}

async function geocodeNominatim(query: string): Promise<LatLng> {
  const url =
    "https://nominatim.openstreetmap.org/search?" +
    new URLSearchParams({
      format: "json",
      limit: "1",
      countrycodes: "us",
      q: query,
    }).toString();
  const json = (await fetchJson(url, { "User-Agent": UA })) as Array<{
    lat?: string;
    lon?: string;
  }>;
  const hit = json[0];
  const lat = Number(hit?.lat);
  const lng = Number(hit?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("not found");
  }
  return { lat, lng };
}

async function geocodePhoton(query: string): Promise<LatLng> {
  const url =
    "https://photon.komoot.io/api/?" +
    new URLSearchParams({
      q: query,
      limit: "1",
      lat: "43.615",
      lon: "-116.202",
    }).toString();
  const json = (await fetchJson(url)) as {
    features?: Array<{ geometry?: { coordinates?: [number, number] } }>;
  };
  const coords = json.features?.[0]?.geometry?.coordinates;
  if (!coords || coords.length < 2) {
    throw new Error("not found");
  }
  return { lng: coords[0], lat: coords[1] };
}

async function geocodeMapbox(query: string, token: string): Promise<LatLng> {
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
    new URLSearchParams({
      access_token: token,
      country: "US",
      limit: "1",
    }).toString();
  const json = (await fetchJson(url)) as {
    features?: Array<{ center?: [number, number] }>;
  };
  const center = json.features?.[0]?.center;
  if (!center || center.length < 2) {
    throw new Error("not found");
  }
  return { lng: center[0], lat: center[1] };
}

async function geocode(query: string): Promise<LatLng> {
  const key = query.toLowerCase();
  const cached = geocodeCache.get(key);
  if (cached) return cached;

  const variants = [
    idahoExpand(query),
    simplifyAddress(idahoExpand(query)),
    query.trim(),
  ].filter((value, index, all) => value && all.indexOf(value) === index);

  const token = (process.env.MAPBOX_ACCESS_TOKEN ?? "").trim();
  let lastError: unknown;
  for (const variant of variants) {
    if (token) {
      try {
        const point = await geocodeMapbox(variant, token);
        geocodeCache.set(key, point);
        return point;
      } catch (err) {
        lastError = err;
      }
    }
    try {
      const point = await geocodePhoton(variant);
      geocodeCache.set(key, point);
      return point;
    } catch (err) {
      lastError = err;
    }
    try {
      const point = await geocodeNominatim(variant);
      geocodeCache.set(key, point);
      return point;
    } catch (err) {
      lastError = err;
    }
  }

  console.error("Geocode failed:", query, lastError);
  throw new Error(
    "Could not find that address on the map. Type the miles, or use Open Maps.",
  );
}

async function routeMiles(origin: LatLng, dest: LatLng): Promise<number> {
  const token = (process.env.MAPBOX_ACCESS_TOKEN ?? "").trim();
  if (token) {
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?` +
      new URLSearchParams({
        access_token: token,
        overview: "false",
      }).toString();
    const json = (await fetchJson(url)) as {
      routes?: Array<{ distance?: number }>;
    };
    const meters = json.routes?.[0]?.distance;
    if (typeof meters !== "number" || !Number.isFinite(meters)) {
      throw new Error("Could not estimate driving miles.");
    }
    return Math.round((meters / 1609.344) * 10) / 10;
  }

  const url =
    `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=false`;
  const json = (await fetchJson(url, { "User-Agent": UA })) as {
    routes?: Array<{ distance?: number }>;
  };
  const meters = json.routes?.[0]?.distance;
  if (typeof meters !== "number" || !Number.isFinite(meters)) {
    throw new Error("Could not estimate driving miles.");
  }
  return Math.round((meters / 1609.344) * 10) / 10;
}

export async function estimateDrivingMiles(
  originQuery: string,
  destQuery: string,
): Promise<number> {
  const origin = await geocode(originQuery);
  if (!(process.env.MAPBOX_ACCESS_TOKEN ?? "").trim()) {
    await new Promise((resolve) => setTimeout(resolve, 1100));
  }
  const dest = await geocode(destQuery);
  return routeMiles(origin, dest);
}

export function pickLastStop<T extends MileageStop>(
  peers: T[],
): T | null {
  if (peers.length === 0) return null;
  const withMiles = peers.filter(
    (row) => row.deliveryMiles != null && row.deliveryAddress,
  );
  const pool = withMiles.length ? withMiles : peers.filter((row) => row.deliveryAddress);
  return pool[0] ?? null;
}

export interface PlaceSuggestion {
  label: string;
  lat: number;
  lon: number;
}

/**
 * Search for places in Mauritius using the Nominatim OpenStreetMap API.
 * Scoped to countrycodes=mu so only Mauritius results are returned.
 */
export async function searchPlacesMu(query: string): Promise<PlaceSuggestion[]> {
  if (query.trim().length < 2) return [];

  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(query)}` +
    `&countrycodes=mu` +
    `&format=json` +
    `&limit=5` +
    `&addressdetails=0`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Alebus/1.0 (contact@alebusmu.com)' },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as Array<{
      display_name: string;
      lat: string;
      lon: string;
    }>;

    return data.map((item) => ({
      label: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
    }));
  } catch {
    return [];
  }
}

/**
 * Format distance for display
 * - < 1000m => "1420 m away" (rounded to nearest 10m)
 * - >= 1000m => "1.3 km away" (1 decimal)
 */
export function formatDistance(distanceMeters?: number | null): string {
  if (distanceMeters == null || Number.isNaN(distanceMeters)) return "--";

  const m = Math.max(0, distanceMeters);

  if (m < 1000) {
    const rounded = Math.round(m / 10) * 10;
    return `${rounded} m away`;
  }

  const km = m / 1000;
  const km1 = Math.round(km * 10) / 10;
  return `${km1} km away`;
}

/**
 * Format ETA for display
 * - estimatedArrival is in milliseconds
 * - Shows "~3 min (estimate)"
 * - Clamps to minimum 1 minute
 */
export function formatEta(ms?: number | null): string {
  if (ms == null || Number.isNaN(ms)) return "--";

  const safe = Math.max(0, ms);
  const minutes = Math.max(1, Math.round(safe / 60000));
  return `~${minutes} min (estimate)`;
}

/**
 * Format proximity label - title-case
 * e.g., "near" => "Near"
 */
export function formatProximityLabel(name?: string | null): string {
  if (!name) return "—";
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

/**
 * Get proximity badge color based on proximity name
 */
export function getProximityColor(name?: string | null): {
  bg: string;
  text: string;
} {
  const proximity = name?.toLowerCase();

  switch (proximity) {
    case "arriving":
      return { bg: "rgba(193,236,114,0.2)", text: "#c1ec72" }; // Green/Accent
    case "approaching":
      return { bg: "rgba(255,193,7,0.2)", text: "#ffc107" }; // Yellow/Warn
    case "near":
      return { bg: "rgba(33,150,243,0.2)", text: "#2196f3" }; // Blue/Info
    case "medium":
      return { bg: "rgba(255,255,255,0.1)", text: "rgba(255,255,255,0.65)" };
    case "far":
    default:
      return { bg: "rgba(255,255,255,0.05)", text: "rgba(255,255,255,0.5)" };
  }
}

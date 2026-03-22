import { createAuthenticatedClient } from './client';

export interface OperatorDTO {
  operatorId: string;
  companyName: string;
  email: string;
  phone?: string;
  status: string;
}

// Simple in-memory cache — operator names don't change at runtime
const nameCache = new Map<string, string>();

/**
 * Fetch the operator's company name by their ID.
 * Returns the raw operatorId string as fallback if the fetch fails.
 */
export async function fetchOperatorName(operatorId: string): Promise<string> {
  if (!operatorId) return '—';
  if (nameCache.has(operatorId)) return nameCache.get(operatorId)!;

  try {
    const client = createAuthenticatedClient();
    const op = await client.get<OperatorDTO>(`/operators/${encodeURIComponent(operatorId)}`);
    nameCache.set(operatorId, op.companyName);
    return op.companyName;
  } catch {
    // Fall back to the raw ID (it's human-readable in dev, e.g. "futurex")
    return operatorId;
  }
}

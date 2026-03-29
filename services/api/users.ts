import { createAuthenticatedClient } from './client';
import type { Shortcut } from '@/components/journey/ShortcutsSection';

export interface SavedLocationDTO {
  name: string;
  lat: number;
  lon: number;
  shortcutId?: string;
  icon?: string;
  origin?: string;
  destination?: string;
}

export interface MeProfileDTO {
  userId: string;
  email: string;
  supabaseUserId: string;
  savedLocations: SavedLocationDTO[];
  createdAt: string;
}

export async function getMeProfile(): Promise<MeProfileDTO> {
  const client = createAuthenticatedClient();
  return client.get<MeProfileDTO>('/users/me');
}

export async function setShortcuts(shortcuts: Shortcut[]): Promise<void> {
  const client = createAuthenticatedClient();
  await client.put('/users/me/shortcuts', shortcuts.map((sc) => ({
    id: sc.id,
    icon: sc.icon,
    label: sc.label,
    origin: sc.origin,
    destination: sc.destination,
  })));
}

export function savedLocationsToShortcuts(locs: SavedLocationDTO[]): Shortcut[] {
  return locs
    .filter((loc) => loc.shortcutId)
    .map((loc) => ({
      id: loc.shortcutId!,
      icon: (loc.icon ?? 'map-marker-path') as Shortcut['icon'],
      label: loc.name,
      origin: loc.origin ?? '',
      destination: loc.destination ?? '',
    }));
}

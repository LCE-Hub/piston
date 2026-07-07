import type { RegistryResponse } from './types';
const REGISTRY_URL = 'https://raw.githubusercontent.com/LCE-Hub/LCE-Workshop/refs/heads/main/registry.json';
const VERSIONS_URL = 'https://raw.githubusercontent.com/LCE-Hub/LCE-Workshop/refs/heads/main/versions.json';
export async function fetchRegistry(): Promise<RegistryResponse> {
  const response = await fetch(REGISTRY_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch registry');
  }
  return response.json();
}

export interface VersionListEntry {
  id: string;
  name: string;
  author: string;
  description: string;
  extended_description: string;
  category: string[];
  thumbnail: string;
  logo: string;
  url: string;
  version: string;
}

export interface VersionListResponse {
  generated_at: string;
  count: number;
  versionlist: VersionListEntry[];
}

export async function fetchVersionList(): Promise<VersionListResponse> {
  const response = await fetch(VERSIONS_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch versions');
  }
  return response.json();
}

export function getRawFileUrl(modId: string, filename: string): string {
  return `https://raw.githubusercontent.com/LCE-Hub/LCE-Workshop/refs/heads/main/${modId}/${filename}`;
}

export const BUILTIN_EDITIONS: { id: string; name: string }[] = [
  { id: 'revelations', name: 'Revelations' },
  { id: 'legacy_evolved', name: 'neoLegacy' },
  { id: '360revived', name: '360Revived' },
  { id: 'legacy_nether_fork', name: 'Hellish Ends' },
  { id: 'moon_edition', name: 'Minecraft: Moon Edition' },
];

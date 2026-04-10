import type { RegistryResponse } from './types';
const REGISTRY_URL = 'https://raw.githubusercontent.com/LCE-Hub/LCE-Workshop/refs/heads/main/registry.json';
export async function fetchRegistry(): Promise<RegistryResponse> {
  const response = await fetch(REGISTRY_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch registry');
  }
  return response.json();
}

export function getRawFileUrl(modId: string, filename: string): string {
  return `https://raw.githubusercontent.com/LCE-Hub/LCE-Workshop/refs/heads/main/${modId}/${filename}`;
}

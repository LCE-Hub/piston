export interface MetaJson {
  id: string;
  name: string;
  author: string;
  description: string;
  extended_description: string;
  category: string | string[];
  thumbnail: string;
  zips: Record<string, string>;
  version: string;
  dependencies?: string[];
  required_versions?: string[];
}

export interface RegistryResponse {
  generated_at: string;
  count: number;
  packages: MetaJson[];
}


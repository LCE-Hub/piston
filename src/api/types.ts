export interface MetaJson {
  id: string;
  name: string;
  author: string;
  description: string;
  category: string | string[];
  thumbnail: string;
  zips: Record<string, string>;
  version: string;
}

export interface RegistryResponse {
  generated_at: string;
  count: number;
  packages: MetaJson[];
}

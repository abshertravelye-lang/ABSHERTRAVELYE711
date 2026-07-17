/**
 * Converts an API object path or external URL to a displayable image URL.
 * Object paths like /objects/uploads/uuid → https://domain/api/storage/objects/uploads/uuid
 */
export function useImageUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) return undefined;
  // Object paths start with /objects/
  if (path.startsWith('/objects/')) {
    return `https://${domain}/api/storage${path}`;
  }
  return `https://${domain}${path.startsWith('/') ? path : '/' + path}`;
}

export function getImageUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) return undefined;
  if (path.startsWith('/objects/')) {
    return `https://${domain}/api/storage${path}`;
  }
  return `https://${domain}${path.startsWith('/') ? path : '/' + path}`;
}

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
export const INTERNAL_API_KEY = process.env.BACKEND_INTERNAL_API_KEY ?? "";

export const backendApiPath = (path: string) =>
  `${BACKEND_URL}/api/v1${path}`;

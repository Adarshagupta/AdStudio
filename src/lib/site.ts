export const SITE_NAME = "LiteMoov";
export const SITE_DOMAIN = "litemoov.com";
export const PRODUCTION_APP_URL = `https://www.${SITE_DOMAIN}`;
export const PRODUCTION_API_URL = `${PRODUCTION_APP_URL}/api`;

/** Origins allowed for uploads, realtime, and CORS in production. */
export const PRODUCTION_ALLOWED_ORIGINS = [
  PRODUCTION_APP_URL,
  `https://www.${SITE_DOMAIN}`,
] as const;

/** Shared API configuration for every dashboard and the Socket.IO client. */
const configuredUrl = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/+$/, '');
const pointsToLocalMachine = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configuredUrl);

// Never let a production build silently call the developer's own computer.
export const API_BASE_URL = process.env.NODE_ENV === 'production' && pointsToLocalMachine
  ? ''
  : configuredUrl || (process.env.NODE_ENV === 'development' ? 'http://localhost:5001' : '');

export const API_SETUP_MESSAGE = 'Backend URL is not configured for this deployment. Set NEXT_PUBLIC_API_URL in Netlify to your deployed backend HTTPS URL (not localhost), then trigger a new production deploy.';

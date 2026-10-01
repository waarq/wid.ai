/*
 * Isomorphic + browser auth helpers. Server-only reader lives in
 * "@/lib/auth/server-session" and is deliberately not re-exported here, as
 * is "@/lib/auth/bootstrap" (used only by the /auth/callback route handler).
 *
 * Everything in this folder is routing/UX only. The backend is the authority
 * for authentication and authorization.
 */
export {
  SESSION_HINT_COOKIE,
  SESSION_HINT_MAX_AGE_SECONDS,
  parseSessionHint,
  readSessionHintFromCookieString,
  serializeSessionHint,
  type SessionHintStage,
} from "./session-hint"
export { clearSessionHintCookie, readClientSessionStage, setSessionHintCookie } from "./client-session"
export {
  APP_HOME_PATH,
  APP_ROUTE_PREFIXES,
  AUTH_ROUTES,
  HOME_PATH_FOR_STAGE,
  LOGIN_PATH,
  NEXT_PARAM,
  ONBOARDING_PATH,
  REGISTER_PATH,
  classifyRoute,
  getPostAuthPath,
  getSafeNextPath,
  isAppRoute,
  resolveRouteAccess,
  type RouteDecision,
  type RouteKind,
} from "./routes"
export { APP_STAGE_CLAIM, stageFromClaims, type StageClaims } from "./claims"
export {
  AUTH_CALLBACK_ERRORS,
  AUTH_CALLBACK_ERROR_MESSAGES,
  AUTH_CALLBACK_PATH,
  AUTH_ERROR_PARAM,
  INTENT_PARAM,
  buildAuthCallbackUrl,
  callbackErrorFromProvider,
  getCallbackErrorPath,
  getCallbackSuccessPath,
  parseAuthCallbackError,
  parseIntent,
  resolveApiBaseUrl,
  type AuthCallbackError,
} from "./callback"

import type { Request, Response } from "express";
import { env } from "../config/env.js";

export const studentSessionCookie = "intrnd_session";
export const adminSessionCookie = "intrnd_admin_session";

const cookieDefaults = { httpOnly: true, secure: env.nodeEnv === "production", sameSite: "lax" as const, path: "/" };

export function setSessionCookie(response: Response, name: string, token: string, maxAgeMs: number) {
  response.cookie(name, token, { ...cookieDefaults, maxAge: maxAgeMs });
}

export function clearSessionCookie(response: Response, name: string) {
  response.clearCookie(name, cookieDefaults);
}

export function getCookie(request: Request, name: string) {
  const cookieHeader = request.header("cookie");

  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));

  if (!match) return null;

  try {
    return decodeURIComponent(match.slice(name.length + 1));
  } catch {
    return null;
  }
}

export function getBearerToken(request: Request) {
  const authHeader = request.header("authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
}

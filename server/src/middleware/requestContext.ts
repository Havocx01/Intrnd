import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    interface Locals {
      requestId: string;
    }
  }
}

export function attachRequestContext(_request: Request, response: Response, next: NextFunction) {
  const requestId = randomUUID();
  response.locals.requestId = requestId;
  response.setHeader("X-Request-Id", requestId);
  next();
}

export function requestIdFor(response: Response) {
  return response.locals.requestId || "unknown";
}

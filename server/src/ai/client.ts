import OpenAI from "openai";
import { env } from "../config/env.js";

let _client: OpenAI | null = null;

// The local endpoint accepts a placeholder API key required by the SDK.
export function getAIClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: env.aiApiKey, baseURL: env.aiBaseUrl });
  }
  return _client;
}

export function isAIAvailable(): boolean {
  return env.aiEnabled;
}

export function getAIModel(): string {
  return env.aiModel;
}

export function getAIReasonerModel(): string {
  return env.aiReasonerModel;
}

// Keep older imports working.
export const getOpenAIClient = getAIClient;

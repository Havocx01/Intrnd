type GoogleTokenResponse = { access_token?: string; error?: string; error_description?: string };

type GoogleTokenClient = { requestAccessToken: (overrideConfig?: { prompt?: string }) => void };

type GoogleAccountsOauth2 = {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: GoogleTokenResponse) => void;
    error_callback?: (error: unknown) => void;
  }) => GoogleTokenClient;
};

declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GoogleAccountsOauth2 } };
  }
}

let googleScriptPromise: Promise<void> | null = null;

export function getGoogleClientId() {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
}

export async function requestGoogleAccessToken() {
  const clientId = getGoogleClientId();

  if (!clientId) {
    throw new Error("Google sign-in is not configured yet.");
  }

  await loadGoogleIdentityScript();

  return new Promise<string>((resolve, reject) => {
    const googleOauth = window.google?.accounts?.oauth2;

    if (!googleOauth) {
      reject(new Error("Google sign-in did not load. Please try again."));
      return;
    }

    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      callback();
    };

    const tokenClient = googleOauth.initTokenClient({
      client_id: clientId,
      scope: "openid email profile",
      callback: (response) => {
        if (response.error) {
          finish(() => reject(new Error(response.error_description ?? "Google sign-in was cancelled. Please try again.")));
          return;
        }

        if (!response.access_token) {
          finish(() => reject(new Error("Google did not return an access token.")));
          return;
        }

        finish(() => resolve(response.access_token as string));
      },
      error_callback: () => {
        finish(() => reject(new Error("Google sign-in was closed or could not be shown. Please try again.")));
      },
    });

    tokenClient.requestAccessToken({ prompt: "select_account" });
  });
}

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  if (googleScriptPromise) {
    return googleScriptPromise;
  }

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Unable to load Google sign-in.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Google sign-in."));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

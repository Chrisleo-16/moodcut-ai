export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  appCheckSiteKey: string;
};

export function firebaseSetupIssue(): string | null {
  const config = readFirebaseConfig();
  if (!config.apiKey || !config.projectId || !config.appId || !config.messagingSenderId || !config.authDomain) {
    return "Add the Firebase web config from a Spark plan project. The browser needs NEXT_PUBLIC_FIREBASE_API_KEY, AUTH_DOMAIN, PROJECT_ID, MESSAGING_SENDER_ID, and APP_ID.";
  }
  if (!config.appCheckSiteKey) {
    return "App Check needs a reCAPTCHA Enterprise site key in NEXT_PUBLIC_FIREBASE_APPCHECK_RECAPTCHA_SITE_KEY. Do not add localhost to that key.";
  }
  return null;
}

export function readFirebaseConfig(): FirebaseWebConfig {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
    appCheckSiteKey: process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_RECAPTCHA_SITE_KEY ?? "",
  };
}

export function readDebugToken(): boolean | string | undefined {
  if (process.env.NODE_ENV !== "development") return undefined;
  const token = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN;
  if (!token) return undefined;
  return token === "true" ? true : token;
}

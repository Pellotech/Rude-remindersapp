import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App, URLOpenListenerEvent } from "@capacitor/app";

const CUSTOM_URL_SCHEME = "rudereminders";

class InAppOAuthService {
  private authCallbackPromise: {
    resolve: (value: { success: boolean; error?: string }) => void;
    reject: (reason: any) => void;
  } | null = null;

  private listenerRegistered = false;

  isNativeIOS(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
  }

  async initialize(): Promise<void> {
    if (this.listenerRegistered || !this.isNativeIOS()) {
      return;
    }

    App.addListener("appUrlOpen", async (event: URLOpenListenerEvent) => {
      await this.handleOAuthCallback(event.url);
    });

    this.listenerRegistered = true;
  }

  private async handleOAuthCallback(url: string): Promise<void> {
    try {
      await Browser.close();
    } catch (e) {
    }

    if (!url.startsWith(`${CUSTOM_URL_SCHEME}://`)) {
      return;
    }

    const urlObj = new URL(url);
    const path = urlObj.pathname || urlObj.host;
    const params = new URLSearchParams(urlObj.search);

    if (path === "auth-callback" || path === "//auth-callback") {
      const success = params.get("success") === "true";
      const error = params.get("error") || undefined;

      if (this.authCallbackPromise) {
        this.authCallbackPromise.resolve({ success, error });
        this.authCallbackPromise = null;
      }
    }
  }

  async signInWithGoogle(baseUrl: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isNativeIOS()) {
      window.location.href = "/api/auth/google";
      return { success: true };
    }

    await this.initialize();

    const callbackUrl = `${CUSTOM_URL_SCHEME}://auth-callback`;
    const oauthUrl = `${baseUrl}/api/auth/google/native?callback=${encodeURIComponent(callbackUrl)}`;

    return this.openOAuthBrowser(oauthUrl);
  }

  async signInWithFacebook(baseUrl: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isNativeIOS()) {
      window.location.href = "/api/auth/facebook";
      return { success: true };
    }

    await this.initialize();

    const callbackUrl = `${CUSTOM_URL_SCHEME}://auth-callback`;
    const oauthUrl = `${baseUrl}/api/auth/facebook/native?callback=${encodeURIComponent(callbackUrl)}`;

    return this.openOAuthBrowser(oauthUrl);
  }

  private async openOAuthBrowser(url: string): Promise<{ success: boolean; error?: string }> {
    return new Promise(async (resolve, reject) => {
      this.authCallbackPromise = { resolve, reject };
      let browserFinishedHandle: any = null;

      const cleanup = () => {
        if (browserFinishedHandle) {
          browserFinishedHandle.remove();
          browserFinishedHandle = null;
        }
      };

      const timeout = setTimeout(() => {
        cleanup();
        if (this.authCallbackPromise) {
          this.authCallbackPromise = null;
          resolve({ success: false, error: "Authentication timed out" });
        }
      }, 5 * 60 * 1000);

      try {
        await Browser.open({
          url,
          presentationStyle: "popover",
          toolbarColor: "#000000",
        });

        browserFinishedHandle = await Browser.addListener("browserFinished", () => {
          clearTimeout(timeout);
          cleanup();
          if (this.authCallbackPromise) {
            this.authCallbackPromise = null;
            resolve({ success: false, error: "cancelled" });
          }
        });
      } catch (error: any) {
        clearTimeout(timeout);
        cleanup();
        this.authCallbackPromise = null;
        reject(error);
      }
    });
  }
}

export const inAppOAuthService = new InAppOAuthService();

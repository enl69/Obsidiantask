import { createHash, randomBytes } from "crypto";
import { createServer, type Server } from "http";
import { shell } from "electron";
import { requestUrl } from "obsidian";

export interface AuthConfig {
  clientId: string;
  clientSecret: string;
  refreshToken?: string;
}

export interface TokenState {
  refreshToken: string;
  accessToken?: string;
  expiresAt?: number;
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  error?: string;
  error_description?: string;
}

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";
const TASKS_SCOPE = "https://www.googleapis.com/auth/tasks";

export class GoogleTasksAuth {
  private token: TokenState | null;
  private pendingServer: Server | null = null;

  constructor(
    private readonly config: AuthConfig,
    private readonly onToken: (token: TokenState | null) => Promise<void>,
  ) {
    this.token = config.refreshToken ? { refreshToken: config.refreshToken } : null;
  }

  isConnected(): boolean {
    return this.token !== null;
  }

  async connect(timeoutMs = 120_000): Promise<void> {
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error("Client ID dan Client Secret wajib diisi");
    }

    const verifier = base64Url(randomBytes(64));
    const challenge = base64Url(createHash("sha256").update(verifier).digest());
    const state = base64Url(randomBytes(32));
    const { server, redirectUri, callback } = await this.listenForCallback(timeoutMs);
    this.pendingServer = server;

    try {
      const authorizationUrl = new URL(AUTH_ENDPOINT);
      authorizationUrl.searchParams.set("client_id", this.config.clientId);
      authorizationUrl.searchParams.set("redirect_uri", redirectUri);
      authorizationUrl.searchParams.set("response_type", "code");
      authorizationUrl.searchParams.set("scope", TASKS_SCOPE);
      authorizationUrl.searchParams.set("access_type", "offline");
      authorizationUrl.searchParams.set("prompt", "consent");
      authorizationUrl.searchParams.set("state", state);
      authorizationUrl.searchParams.set("code_challenge", challenge);
      authorizationUrl.searchParams.set("code_challenge_method", "S256");
      await shell.openExternal(authorizationUrl.toString());

      const result = await callback;
      if (result.state !== state) throw new Error("OAuth state tidak cocok");
      if (result.error) throw new Error(result.errorDescription ?? result.error);
      if (!result.code) throw new Error("Authorization code tidak diterima");

      const body = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code: result.code,
        code_verifier: verifier,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      });
      const response = await requestUrl({
        url: TOKEN_ENDPOINT,
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      const tokens = parseTokenResponse(response.json as TokenResponse);
      if (!tokens.access_token) throw new Error(tokens.error_description ?? tokens.error ?? "Token exchange gagal");
      this.token = {
        refreshToken: tokens.refresh_token ?? this.token?.refreshToken ?? "",
        accessToken: tokens.access_token,
        expiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000,
      };
      if (!this.token.refreshToken) throw new Error("Google tidak mengembalikan refresh token");
      await this.onToken(this.token);
    } finally {
      await this.closeServer();
    }
  }

  async getAccessToken(): Promise<string> {
    if (!this.token?.refreshToken) throw new Error("Belum terhubung ke Google");
    if (this.token.accessToken && this.token.expiresAt && Date.now() < this.token.expiresAt - 60_000) {
      return this.token.accessToken;
    }
    return this.refreshAccessToken();
  }

  async refreshAccessToken(): Promise<string> {
    if (!this.token?.refreshToken) throw new Error("Belum terhubung ke Google");
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: this.token.refreshToken,
      grant_type: "refresh_token",
    });
    const response = await requestUrl({
      url: TOKEN_ENDPOINT,
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const tokens = parseTokenResponse(response.json as TokenResponse);
    if (!tokens.access_token) {
      if (tokens.error === "invalid_grant") await this.disconnect(false);
      throw new Error(tokens.error_description ?? tokens.error ?? "Refresh token gagal");
    }
    this.token.accessToken = tokens.access_token;
    this.token.expiresAt = Date.now() + (tokens.expires_in ?? 3600) * 1000;
    if (tokens.refresh_token) this.token.refreshToken = tokens.refresh_token;
    await this.onToken(this.token);
    return tokens.access_token;
  }

  async disconnect(revoke = true): Promise<void> {
    const refreshToken = this.token?.refreshToken;
    await this.closeServer();
    this.token = null;
    await this.onToken(null);
    if (revoke && refreshToken) {
      try {
        await requestUrl({
          url: `${REVOKE_ENDPOINT}?token=${encodeURIComponent(refreshToken)}`,
          method: "POST",
        });
      } catch {}
    }
  }

  private async listenForCallback(timeoutMs: number): Promise<{
    server: Server;
    redirectUri: string;
    callback: Promise<{ code?: string; state?: string; error?: string; errorDescription?: string }>;
  }> {
    const server = createServer();
    const callback = new Promise<{ code?: string; state?: string; error?: string; errorDescription?: string }>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("OAuth timeout")), timeoutMs);
      server.once("request", (request, response) => {
        try {
          const url = new URL(request.url ?? "/", "http://127.0.0.1");
          const result = {
            code: url.searchParams.get("code") ?? undefined,
            state: url.searchParams.get("state") ?? undefined,
            error: url.searchParams.get("error") ?? undefined,
            errorDescription: url.searchParams.get("error_description") ?? undefined,
          };
          clearTimeout(timer);
          response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          response.end("<html><body><p>Obsidiantask: autentikasi selesai. Kembali ke Obsidian.</p></body></html>");
          resolve(result);
        } catch (error) {
          clearTimeout(timer);
          reject(error);
        }
      });
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Port OAuth tidak tersedia");
    return { server, redirectUri: `http://127.0.0.1:${address.port}`, callback };
  }

  private async closeServer(): Promise<void> {
    const server = this.pendingServer;
    this.pendingServer = null;
    if (!server?.listening) return;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

function parseTokenResponse(value: TokenResponse): TokenResponse {
  return value ?? {};
}

function base64Url(value: Buffer): string {
  return value.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

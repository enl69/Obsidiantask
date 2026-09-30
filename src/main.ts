import { Notice, Plugin } from "obsidian";
import { GoogleTasksAuth, type TokenState } from "./auth";
import { DEFAULT_SETTINGS, ObsidiantaskSettingTab, type ObsidiantaskSettings } from "./settings";

export default class ObsidiantaskPlugin extends Plugin {
  settings: ObsidiantaskSettings = DEFAULT_SETTINGS;
  auth: GoogleTasksAuth | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.createAuth();
    this.addSettingTab(new ObsidiantaskSettingTab(this, this.app));
    this.addCommand({
      id: "open-panel",
      name: "Open Obsidiantask",
      callback: () => new Notice("Obsidiantask panel belum tersedia; masuk Fase 1"),
    });
  }

  onunload(): void {
    void this.auth?.disconnect(false);
  }

  async loadSettings(): Promise<void> {
    const data = await this.loadData() as Partial<ObsidiantaskSettings> | null;
    this.settings = { ...DEFAULT_SETTINGS, ...data };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.createAuth();
  }

  async connectGoogle(): Promise<void> {
    if (!this.auth) this.createAuth();
    await this.auth?.connect();
  }

  async disconnectGoogle(): Promise<void> {
    await this.auth?.disconnect();
  }

  private createAuth(): void {
    this.auth = new GoogleTasksAuth(
      {
        clientId: this.settings.clientId,
        clientSecret: this.settings.clientSecret,
        refreshToken: this.settings.refreshToken || undefined,
      },
      async (token: TokenState | null) => {
        this.settings.refreshToken = token?.refreshToken ?? "";
        await this.saveData(this.settings);
      },
    );
  }
}

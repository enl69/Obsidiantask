import { Notice, PluginSettingTab, Setting } from "obsidian";
import type ObsidiantaskPlugin from "./main";

export interface ObsidiantaskSettings {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export const DEFAULT_SETTINGS: ObsidiantaskSettings = {
  clientId: "",
  clientSecret: "",
  refreshToken: "",
};

export class ObsidiantaskSettingTab extends PluginSettingTab {
  constructor(private readonly plugin: ObsidiantaskPlugin, app: unknown) {
    super(app as never, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Obsidiantask" });
    new Setting(containerEl)
      .setName("Google Client ID")
      .setDesc("OAuth Desktop app Client ID dari Google Cloud Console.")
      .addText((text) => text
        .setPlaceholder("...apps.googleusercontent.com")
        .setValue(this.plugin.settings.clientId)
        .onChange(async (value) => {
          this.plugin.settings.clientId = value.trim();
          await this.plugin.saveSettings();
        }));
    new Setting(containerEl)
      .setName("Google Client Secret")
      .setDesc("Disimpan lokal di data plugin; jangan commit ke repository.")
      .addText((text) => text
        .setPlaceholder("GOCSPX-...")
        .setValue(this.plugin.settings.clientSecret)
        .onChange(async (value) => {
          this.plugin.settings.clientSecret = value.trim();
          await this.plugin.saveSettings();
        }));
    const status = this.plugin.auth?.isConnected() ? "Connected" : "Not connected";
    new Setting(containerEl).setName("Status").setDesc(status);
    new Setting(containerEl)
      .setName("Google account")
      .setDesc("Hubungkan plugin dengan Google Tasks.")
      .addButton((button) => button
        .setButtonText(this.plugin.auth?.isConnected() ? "Disconnect" : "Connect")
        .setCta()
        .onClick(async () => {
          try {
            if (this.plugin.auth?.isConnected()) {
              await this.plugin.disconnectGoogle();
              new Notice("Obsidiantask: Google disconnected");
            } else {
              await this.plugin.connectGoogle();
              new Notice("Obsidiantask: Google connected");
            }
            this.display();
          } catch (error) {
            new Notice(`Obsidiantask: ${error instanceof Error ? error.message : "OAuth gagal"}`);
          }
        }));
  }
}

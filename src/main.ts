import { Notice, Plugin, WorkspaceLeaf } from "obsidian";
import { GoogleTasksAuth, type TokenState } from "./auth";
import { GoogleTasksApi } from "./api";
import { DEFAULT_SETTINGS, ObsidiantaskSettingTab, type ObsidiantaskSettings } from "./settings";
import { TaskStore } from "./store";
import { TasksView, VIEW_TYPE } from "./view";

export default class ObsidiantaskPlugin extends Plugin {
  settings: ObsidiantaskSettings = DEFAULT_SETTINGS;
  auth: GoogleTasksAuth | null = null;
  api: GoogleTasksApi | null = null;
  store: TaskStore | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.createAuth();
    this.api = new GoogleTasksApi(this.auth!);
    this.store = new TaskStore(
      async () => (await this.loadData() as { cache?: unknown } | null)?.cache,
      (value) => this.saveData({ ...this.settings, cache: value }),
    );
    await this.store.init();
    this.registerView(VIEW_TYPE, (leaf) => new TasksView(leaf, this.api!, this.store!));
    this.addSettingTab(new ObsidiantaskSettingTab(this, this.app));
    this.addCommand({
      id: "open-panel",
      name: "Open Obsidiantask",
      callback: () => void this.activateView(),
    });
    this.addCommand({
      id: "create-task",
      name: "Create task",
      callback: () => {
        const view = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0]?.view;
        if (view instanceof TasksView) view.openAddTask();
        else void this.activateView();
      },
    });
  }

  onunload(): void {}

  async loadSettings(): Promise<void> {
    const data = await this.loadData() as Partial<ObsidiantaskSettings> | null;
    this.settings = { ...DEFAULT_SETTINGS, ...data };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.createAuth();
    this.api = new GoogleTasksApi(this.auth!);
  }

  async activateView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    if (existing.length > 0) {
      await this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
      await this.app.workspace.revealLeaf(leaf);
    }
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

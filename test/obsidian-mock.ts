export const registeredCommands: { id: string; name: string }[] = [];
export async function requestUrl() {
  throw new Error("requestUrl mock not configured");
}

export class Notice {
  static notices: string[] = [];
  constructor(public message: string, public timeout?: number) {
    Notice.notices.push(message);
  }
}

export class Modal {
  titleEl = { setText() {} };
  contentEl = { empty() {}, addClass() {}, createEl() { return { addEventListener() {}, value: "" }; }, createDiv() { return { createEl() { return { addEventListener() {}, value: "" }; } }; } };
  modalEl = { addClass() {} };
  constructor(public app: unknown) {}
  open() { this.onOpen(); }
  close() { this.onClose(); }
  onOpen() {}
  onClose() {}
}

export class WorkspaceLeaf {}

export class ItemView {
  containerEl = { empty() {}, createEl() { return { addEventListener() {} }; }, createDiv() { return { createEl() { return { addEventListener() {}, checked: false }; }, createSpan() {} }; } };
  constructor(public leaf: WorkspaceLeaf) {}
}

export class PluginSettingTab {
  containerEl = {
    empty() {},
    createEl() {},
  };
  constructor(public app: unknown, public plugin: unknown) {}
}

export class Setting {
  constructor(public containerEl: unknown) {}
  setName() { return this; }
  setDesc() { return this; }
  addText(callback: (text: any) => void) {
    callback({ setPlaceholder() { return this; }, setValue() { return this; }, onChange() { return this; } });
    return this;
  }
  addButton(callback: (button: any) => void) {
    callback({ setButtonText() { return this; }, setCta() { return this; }, onClick() { return this; } });
    return this;
  }
}

export class Plugin {
  manifest = { dir: ".obsidian/plugins/obsidiantask", version: "test" };
  app: unknown;
  commands = registeredCommands;
  async loadData() {
    return {};
  }
  async saveData() {}
  addCommand(cmd: { id: string; name: string }) {
    registeredCommands.push(cmd);
    return cmd;
  }
  addRibbonIcon() {}
  addSettingTab() {}
  registerEvent() {}
  register() {}
  registerDomEvent() {}
  registerInterval() {}
  registerView() {}
  addStatusBarItem() {
    return { setText() {}, setAttribute() {}, el: null };
  }
}

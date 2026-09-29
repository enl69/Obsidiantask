export const registeredCommands: { id: string; name: string }[] = [];

export class Notice {
  static notices: string[] = [];
  constructor(public message: string, public timeout?: number) {
    Notice.notices.push(message);
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
  addStatusBarItem() {
    return { setText() {}, setAttribute() {}, el: null };
  }
}

import { Plugin } from "obsidian";

export default class ObsidiantaskPlugin extends Plugin {
  async onload(): Promise<void> {
    this.addCommand({
      id: "open-panel",
      name: "Open Obsidiantask",
      callback: () => {},
    });
  }

  onunload(): void {}
}

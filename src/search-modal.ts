import { Modal } from "obsidian";

export class SearchModal extends Modal {
  constructor(app: unknown, private readonly initial: string, private readonly onSearch: (value: string) => void) { super(app as never); }
  onOpen(): void {
    this.titleEl.setText("Cari task");
    const input = this.contentEl.createEl("input", { type: "search", placeholder: "Cari task…" });
    input.value = this.initial;
    input.addEventListener("input", () => this.onSearch(input.value));
    input.focus();
  }
  onClose(): void { this.contentEl.empty(); }
}

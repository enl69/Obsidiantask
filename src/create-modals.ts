import { Modal } from "obsidian";
import type { TaskList } from "./api";

export class AddTaskModal extends Modal {
  constructor(app: unknown, private readonly lists: TaskList[], private readonly onSave: (listId: string, title: string, notes: string, due: string) => void) { super(app as never); }
  onOpen(): void {
    this.titleEl.setText("Tambah task");
    const form = this.contentEl; form.empty(); form.addClass("obsidiantask-editor-form");
    const list = form.createEl("select"); for (const item of this.lists) list.createEl("option", { text: item.title, value: item.id });
    const title = form.createEl("input", { type: "text", placeholder: "Judul task" });
    const notes = form.createEl("textarea", { placeholder: "Deskripsi / catatan (opsional)" });
    const due = form.createEl("input", { type: "date" });
    const actions = form.createDiv({ cls: "obsidiantask-editor-actions" });
    const cancel = actions.createEl("button", { text: "Batal" }); cancel.addEventListener("click", () => this.close());
    const save = actions.createEl("button", { text: "Tambah" }); save.addEventListener("click", () => { if (!title.value.trim() || !list.value) return; this.onSave(list.value, title.value.trim(), notes.value, due.value); this.close(); });
    title.focus();
  }
  onClose(): void { this.contentEl.empty(); }
}

export class AddListModal extends Modal {
  constructor(app: unknown, private readonly onSave: (title: string) => void) { super(app as never); }
  onOpen(): void {
    this.titleEl.setText("Tambah list"); const form = this.contentEl; form.empty(); form.addClass("obsidiantask-editor-form");
    const title = form.createEl("input", { type: "text", placeholder: "Nama list" });
    const save = form.createEl("button", { text: "Tambah" }); save.addEventListener("click", () => { if (title.value.trim()) { this.onSave(title.value.trim()); this.close(); } }); title.focus();
  }
  onClose(): void { this.contentEl.empty(); }
}

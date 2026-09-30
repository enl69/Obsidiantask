import { Modal } from "obsidian";
import type { Task } from "./api";

export class TaskEditorModal extends Modal {
  constructor(app: unknown, private readonly task: Task, private readonly onSave: (title: string, notes: string, due: string) => void) { super(app as never); }
  onOpen(): void {
    this.titleEl.setText("Edit task");
    const form = this.contentEl;
    form.empty();
    this.modalEl.addClass("obsidiantask-editor-modal");
    form.addClass("obsidiantask-editor-form");
    const title = form.createEl("input", { type: "text", placeholder: "Judul task" }); title.value = this.task.title;
    const notes = form.createEl("textarea", { placeholder: "Deskripsi / catatan" }); notes.value = this.task.notes ?? "";
    const due = form.createEl("input", { type: "date" }); due.value = this.task.due?.slice(0, 10) ?? "";
    const actions = form.createDiv({ cls: "obsidiantask-editor-actions" });
    const cancel = actions.createEl("button", { text: "Batal" }); cancel.addEventListener("click", () => this.close());
    const save = actions.createEl("button", { text: "Simpan" });
    save.addEventListener("click", () => { if (!title.value.trim()) return; this.onSave(title.value.trim(), notes.value, due.value); this.close(); });
  }
  onClose(): void { this.contentEl.empty(); }
}

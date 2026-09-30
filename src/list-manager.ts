import { Modal, Notice } from "obsidian";
import type { GoogleTasksApi, TaskList } from "./api";
import type { TaskStore } from "./store";

export class ListManagerModal extends Modal {
  constructor(app: unknown, private readonly api: GoogleTasksApi, private readonly store: TaskStore, private readonly onChange: () => Promise<void>) { super(app as never); }
  onOpen(): void { this.render(); }
  private render(): void {
    this.titleEl.setText("Manage lists"); const root = this.contentEl; root.empty(); root.addClass("obsidiantask-list-manager");
    const add = root.createEl("button", { text: "+ Tambah list" }); add.addEventListener("click", () => void this.addList());
    for (const list of this.store.cache.lists) {
      const row = root.createDiv({ cls: "obsidiantask-list-manager-row" });
      const visible = root.createEl("input", { type: "checkbox" }); visible.checked = this.store.cache.visibleLists.includes(list.id); visible.addEventListener("change", () => void this.toggleVisible(list.id, visible.checked));
      row.createSpan({ text: list.title });
      const edit = row.createEl("button", { text: "Edit" }); edit.addEventListener("click", () => void this.rename(list));
      const remove = row.createEl("button", { text: "Delete" }); remove.addEventListener("click", () => void this.remove(list));
    }
  }
  private async toggleVisible(id: string, visible: boolean): Promise<void> { this.store.cache.visibleLists = visible ? [...this.store.cache.visibleLists, id] : this.store.cache.visibleLists.filter((item) => item !== id); await this.store.persist(); await this.onChange(); }
  private async addList(): Promise<void> { const title = window.prompt("Nama list"); if (!title?.trim()) return; try { const list = await this.api.insertTaskList(title.trim()); this.store.cache.lists.push(list); this.store.cache.visibleLists.push(list.id); await this.store.persist(); await this.onChange(); this.render(); } catch (error) { new Notice(error instanceof Error ? error.message : "Gagal menambah list"); } }
  private async rename(list: TaskList): Promise<void> { const title = window.prompt("Nama list", list.title); if (!title?.trim() || title.trim() === list.title) return; try { const updated = await this.api.patchTaskList(list, title.trim()); this.store.cache.lists = this.store.cache.lists.map((item) => item.id === list.id ? updated : item); await this.store.persist(); await this.onChange(); this.render(); } catch (error) { new Notice(error instanceof Error ? error.message : "Gagal mengubah list"); } }
  private async remove(list: TaskList): Promise<void> { if (!window.confirm(`Hapus list “${list.title}”?`)) return; try { await this.api.deleteTaskList(list); this.store.cache.lists = this.store.cache.lists.filter((item) => item.id !== list.id); delete this.store.cache.tasks[list.id]; this.store.cache.visibleLists = this.store.cache.visibleLists.filter((id) => id !== list.id); await this.store.persist(); await this.onChange(); this.render(); } catch (error) { new Notice(error instanceof Error ? error.message : "Gagal menghapus list"); } }
  onClose(): void { this.contentEl.empty(); }
}

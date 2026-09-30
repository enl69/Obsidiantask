import { ItemView, Notice, WorkspaceLeaf } from "obsidian";
import type { GoogleTasksApi, Task, TaskList } from "./api";
import type { TaskStore } from "./store";

export const VIEW_TYPE = "obsidiantask-view";

export class TasksView extends ItemView {
  private lists: TaskList[] = [];
  private busy = false;
  constructor(leaf: WorkspaceLeaf, private readonly api: GoogleTasksApi, private readonly store: TaskStore) { super(leaf); }
  getViewType(): string { return VIEW_TYPE; }
  getDisplayText(): string { return "Obsidiantask"; }
  getIcon(): string { return "check-square"; }
  async onOpen(): Promise<void> { await this.refresh(); }
  async refresh(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.render("Loading Google Tasks…");
    try {
      this.lists = await this.api.listTaskLists();
      const tasks = (await Promise.all(this.lists.map((list) => this.api.listTasks(list.id)))).flat();
      await this.store.replace(this.lists, tasks);
      this.render();
    } catch (error) {
      this.render(`Error: ${error instanceof Error ? error.message : "sync gagal"}`);
    } finally { this.busy = false; }
  }
  private render(message?: string): void {
    const root = this.containerEl;
    root.empty();
    root.createEl("div", { cls: "obsidiantask-header", text: "Obsidiantask" });
    const refresh = root.createEl("button", { text: "Refresh" });
    refresh.addEventListener("click", () => void this.refresh());
    if (message) { root.createEl("p", { text: message }); if (message.startsWith("Error")) return; }
    for (const list of this.lists) this.renderList(root, list);
  }
  private renderList(root: HTMLElement, list: TaskList): void {
    const section = root.createDiv({ cls: "obsidiantask-list" });
    section.createEl("h3", { text: list.title });
    const add = section.createEl("input", { type: "text", placeholder: "Tambah task…" });
    add.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || !add.value.trim()) return;
      void this.addTask(list, add.value.trim()).then(() => { add.value = ""; });
    });
    for (const task of this.store.cache.tasks[list.id] ?? []) this.renderTask(section, task);
  }
  private renderTask(root: HTMLElement, task: Task): void {
    const row = root.createDiv({ cls: "obsidiantask-task" });
    const checkbox = row.createEl("input", { type: "checkbox" });
    checkbox.checked = task.status === "completed";
    checkbox.addEventListener("change", () => void this.toggleTask(task, checkbox.checked));
    row.createSpan({ text: task.title });
  }
  private async addTask(list: TaskList, title: string): Promise<void> {
    try { const task = await this.api.insertTask(list.id, title); await this.store.setTasks(list.id, [...(this.store.cache.tasks[list.id] ?? []), task]); this.render(); }
    catch (error) { new Notice(error instanceof Error ? error.message : "Gagal menambah task"); }
  }
  private async toggleTask(task: Task, completed: boolean): Promise<void> {
    try { const updated = await this.api.patchTask(task, { status: completed ? "completed" : "needsAction" }); await this.store.setTasks(task.listId, (this.store.cache.tasks[task.listId] ?? []).map((item) => item.id === task.id ? updated : item)); this.render(); }
    catch (error) { new Notice(error instanceof Error ? error.message : "Gagal mengubah task"); await this.refresh(); }
  }
}

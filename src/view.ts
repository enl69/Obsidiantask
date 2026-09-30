import { ItemView, Modal, Notice, WorkspaceLeaf } from "obsidian";
import type { GoogleTasksApi, Task, TaskList } from "./api";
import type { TaskStore } from "./store";
import { TaskEditorModal } from "./task-editor";
import { AddListModal, AddTaskModal } from "./create-modals";

export const VIEW_TYPE = "obsidiantask-view";

export class TasksView extends ItemView {
  private lists: TaskList[] = [];
  private busy = false;
  private readonly collapsed = new Set<string>();
  private showCompleted = false;
  private filter = "";
  constructor(leaf: WorkspaceLeaf, private readonly api: GoogleTasksApi, private readonly store: TaskStore) { super(leaf); }
  getViewType(): string { return VIEW_TYPE; }
  getDisplayText(): string { return "Obsidiantask"; }
  getIcon(): string { return "check-square"; }
  async onOpen(): Promise<void> { this.containerEl.addClass("obsidiantask-view"); await this.refresh(); }
  async refresh(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.renderLoading();
    try {
      this.lists = await this.api.listTaskLists();
      const tasks = (await Promise.all(this.lists.map((list) => this.api.listTasks(list.id)))).flat();
      await this.store.replace(this.lists, tasks);
      this.render();
    } catch (error) {
      this.renderError(error instanceof Error ? error.message : "Sinkronisasi gagal");
    } finally { this.busy = false; }
  }
  private renderLoading(): void { this.containerEl.empty(); this.containerEl.createDiv({ cls: "obsidiantask-loading", text: "Memuat task…" }); }
  private renderError(message: string): void { this.containerEl.empty(); this.containerEl.createDiv({ cls: "obsidiantask-error", text: message }); const retry = this.containerEl.createEl("button", { text: "Coba lagi" }); retry.addEventListener("click", () => void this.refresh()); }
  private render(): void {
    const root = this.containerEl;
    root.empty();
    const header = root.createDiv({ cls: "obsidiantask-header" });
    const title = header.createDiv({ cls: "obsidiantask-title" }); title.createEl("h2", { text: "Tasks" }); title.createSpan({ cls: "obsidiantask-count", text: `${this.activeCount()} aktif` });
    const actions = header.createDiv({ cls: "obsidiantask-actions" });
    const search = actions.createEl("input", { type: "search", placeholder: "Cari task…" }); search.value = this.filter; search.addEventListener("input", () => { this.filter = search.value; this.render(); });
    const add = actions.createEl("button", { text: "+" }); add.setAttribute("aria-label", "Tambah task"); add.addEventListener("click", () => this.openAddTask());
    const list = actions.createEl("button", { text: "List +" }); list.addEventListener("click", () => this.openAddList());
    const refresh = actions.createEl("button", { text: "↻" }); refresh.setAttribute("aria-label", "Refresh task"); refresh.addEventListener("click", () => void this.refresh());
    for (const list of this.lists) this.renderList(root, list);
    if (!this.lists.length) root.createDiv({ cls: "obsidiantask-empty", text: "Belum ada task list di Google Tasks." });
    const completedToggle = root.createDiv({ cls: "obsidiantask-completed-toggle" });
    const completedCount = Object.values(this.store.cache.tasks).flat().filter((task) => task.status === "completed").length;
    const completedButton = completedToggle.createEl("button", { text: `Completed (${completedCount})` }); completedButton.addEventListener("click", () => { this.showCompleted = !this.showCompleted; this.render(); });
  }
  private renderList(root: HTMLElement, list: TaskList): void {
    const all = this.store.cache.tasks[list.id] ?? [];
    const visible = all.filter((task) => (this.showCompleted || task.status !== "completed") && (!this.filter || `${task.title} ${task.notes ?? ""}`.toLowerCase().includes(this.filter.toLowerCase())));
    const section = root.createDiv({ cls: "obsidiantask-list" });
    const heading = section.createDiv({ cls: "obsidiantask-list-heading" });
    const collapsed = this.collapsed.has(list.id);
    const toggle = heading.createEl("button", { text: collapsed ? "›" : "⌄" }); toggle.setAttribute("aria-label", `Toggle ${list.title}`); toggle.addEventListener("click", () => { collapsed ? this.collapsed.delete(list.id) : this.collapsed.add(list.id); this.render(); });
    heading.createEl("h3", { text: list.title }); heading.createSpan({ cls: "obsidiantask-list-count", text: `${visible.length}` });
    if (collapsed) return;
    for (const task of visible) this.renderTask(section, task);
    if (!visible.length) section.createDiv({ cls: "obsidiantask-list-empty", text: this.showCompleted ? "Tidak ada task." : "Semua task selesai." });
  }
  private renderTask(root: HTMLElement, task: Task): void {
    const row = root.createDiv({ cls: `obsidiantask-task ${task.status === "completed" ? "is-completed" : ""}` });
    const checkbox = row.createEl("input", { type: "checkbox" }); checkbox.checked = task.status === "completed"; checkbox.addEventListener("change", () => void this.toggleTask(task, checkbox.checked));
    const content = row.createDiv({ cls: "obsidiantask-task-content" }); content.createDiv({ cls: "obsidiantask-task-title", text: task.title || "Tanpa judul" });
    if (task.notes) content.createDiv({ cls: "obsidiantask-task-notes", text: task.notes });
    const meta = content.createDiv({ cls: "obsidiantask-task-meta" });
    if (task.due) meta.createSpan({ text: `Jatuh tempo ${formatDate(task.due)}` });
    if (task.completed) meta.createSpan({ text: `Selesai ${formatDate(task.completed)}` });
    if (task.parent) meta.createSpan({ text: "Subtask" });
    const favorite = row.createEl("button", { text: this.store.cache.favorites.includes(task.id) ? "★" : "☆" }); favorite.setAttribute("aria-label", "Favorite"); favorite.addEventListener("click", () => void this.toggleFavorite(task.id));
    const edit = row.createEl("button", { text: "⋯" }); edit.setAttribute("aria-label", "Edit task"); edit.addEventListener("click", () => new TaskEditorModal(this.app, task, (title, notes, due) => void this.saveEdit(task, title, notes, due)).open());
  }
  openAddTask(): void {
    if (!this.lists.length) { new Notice("Buat task list terlebih dahulu"); return; }
    new AddTaskModal(this.app, this.lists, (listId, title, notes, due) => void this.addTask(listId, title, notes, due)).open();
  }
  private openAddList(): void { new AddListModal(this.app, (title) => void this.addTaskList(title)).open(); }
  private async addTaskList(title: string): Promise<void> {
    try { const list = await this.api.insertTaskList(title); this.lists.push(list); await this.store.replace(this.lists, Object.values(this.store.cache.tasks).flat()); this.render(); }
    catch (error) { new Notice(error instanceof Error ? error.message : "Gagal menambah list"); }
  }
  private async saveEdit(task: Task, title: string, notes: string, due: string): Promise<void> {
    if (!title) return;
    try {
      const updated = await this.api.patchTask(task, { title, notes, due: due ? `${due}T00:00:00.000Z` : undefined });
      await this.store.setTasks(task.listId, (this.store.cache.tasks[task.listId] ?? []).map((item) => item.id === task.id ? updated : item));
      this.render();
    } catch (error) { new Notice(error instanceof Error ? error.message : "Gagal menyimpan task"); }
  }
  private async addTask(listId: string, title: string, notes?: string, due?: string): Promise<void> {
    try { const task = await this.api.insertTask(listId, title, notes, due ? `${due}T00:00:00.000Z` : undefined); await this.store.setTasks(listId, [...(this.store.cache.tasks[listId] ?? []), task]); this.render(); }
    catch (error) { new Notice(error instanceof Error ? error.message : "Gagal menambah task"); }
  }
  private async toggleTask(task: Task, completed: boolean): Promise<void> { try { const updated = await this.api.patchTask(task, { status: completed ? "completed" : "needsAction" }); await this.store.setTasks(task.listId, (this.store.cache.tasks[task.listId] ?? []).map((item) => item.id === task.id ? updated : item)); this.render(); } catch (error) { new Notice(error instanceof Error ? error.message : "Gagal mengubah task"); await this.refresh(); } }
  private async toggleFavorite(id: string): Promise<void> { const favorites = this.store.cache.favorites.includes(id) ? this.store.cache.favorites.filter((item) => item !== id) : [...this.store.cache.favorites, id]; this.store.cache.favorites = favorites; await this.store.persist(); this.render(); }
  private activeCount(): number { return Object.values(this.store.cache.tasks).flat().filter((task) => task.status !== "completed").length; }
}

function formatDate(value: string): string { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)); }

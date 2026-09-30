import type { Task, TaskList } from "./api";

export interface TaskCache { lists: TaskList[]; tasks: Record<string, Task[]>; }
export const EMPTY_CACHE: TaskCache = { lists: [], tasks: {} };

export class TaskStore {
  cache: TaskCache = { lists: [], tasks: {} };
  constructor(private readonly load: () => Promise<unknown>, private readonly save: (value: TaskCache) => Promise<void>) {}
  async init(): Promise<void> {
    const value = await this.load();
    if (value && typeof value === "object") this.cache = { ...EMPTY_CACHE, ...(value as TaskCache) };
  }
  async replace(lists: TaskList[], tasks: Task[]): Promise<void> {
    const grouped: Record<string, Task[]> = {};
    for (const task of tasks) (grouped[task.listId] ??= []).push(task);
    this.cache = { lists, tasks: grouped };
    await this.save(this.cache);
  }
  async setTasks(listId: string, tasks: Task[]): Promise<void> {
    this.cache.tasks[listId] = tasks;
    await this.save(this.cache);
  }
}

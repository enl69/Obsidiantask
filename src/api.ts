import { requestUrl } from "obsidian";
import type { GoogleTasksAuth } from "./auth";

export interface TaskList { id: string; title: string; updated?: string; etag?: string; }
export interface Task { id: string; listId: string; title: string; notes?: string; status: "needsAction" | "completed"; due?: string; completed?: string; parent?: string; position?: string; updated?: string; deleted?: boolean; }
interface Page<T> { items?: T[]; nextPageToken?: string; nextSyncToken?: string; }

export class GoogleTasksApi {
  constructor(private readonly auth: GoogleTasksAuth) {}

  async listTaskLists(): Promise<TaskList[]> {
    const result: TaskList[] = [];
    let pageToken: string | undefined;
    do {
      const page = await this.request<Page<TaskList>>("/users/@me/lists", { pageToken });
      result.push(...(page.items ?? []));
      pageToken = page.nextPageToken;
    } while (pageToken);
    return result;
  }

  async listTasks(listId: string): Promise<Task[]> {
    const result: Task[] = [];
    let pageToken: string | undefined;
    do {
      const page = await this.request<Page<Task>>( `/lists/${encodeURIComponent(listId)}/tasks`, {
        pageToken, showCompleted: "true", showHidden: "true",
      });
      result.push(...(page.items ?? []).map((task) => ({ ...task, listId })));
      pageToken = page.nextPageToken;
    } while (pageToken);
    return result.filter((task) => !task.deleted);
  }

  async insertTask(listId: string, title: string, notes?: string): Promise<Task> {
    const task = await this.request<Task>(`/lists/${encodeURIComponent(listId)}/tasks`, {
      method: "POST", body: JSON.stringify({ title, notes }),
    });
    return { ...task, listId };
  }

  async patchTask(task: Task, patch: Partial<Pick<Task, "title" | "notes" | "status">>): Promise<Task> {
    const result = await this.request<Task>(`/lists/${encodeURIComponent(task.listId)}/tasks/${encodeURIComponent(task.id)}`, {
      method: "PATCH", body: JSON.stringify(patch),
    });
    return { ...result, listId: task.listId };
  }

  private async request<T>(path: string, options: { method?: string; body?: string; pageToken?: string; showCompleted?: string; showHidden?: string } = {}): Promise<T> {
    const token = await this.auth.getAccessToken();
    const url = new URL(`https://tasks.googleapis.com/tasks/v1${path}`);
    for (const [key, value] of Object.entries(options)) if (key !== "body" && value !== undefined) url.searchParams.set(key, value);
    const response = await requestUrl({
      url: url.toString(), method: options.method ?? "GET",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: options.body,
    });
    return response.json as T;
  }
}

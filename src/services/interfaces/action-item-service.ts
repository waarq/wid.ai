import type { ActionItem, ActionItemListParams, ListResponse, UpdateActionItemInput } from "@/types"

/** Action items are AI-extracted from meetings; users edit, complete or dismiss them. */
export interface ActionItemService {
  list(params?: ActionItemListParams): Promise<ListResponse<ActionItem>>
  getById(id: string): Promise<ActionItem>
  update(id: string, input: UpdateActionItemInput): Promise<ActionItem>
  /** open|in_progress -> completed, completed -> open. */
  toggleComplete(id: string): Promise<ActionItem>
  delete(id: string): Promise<void>
}

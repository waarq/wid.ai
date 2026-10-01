import type { SearchParams, SearchResult } from "@/types"

export interface SearchService {
  /**
   * Global search across meetings, transcripts, actions, decisions, deals
   * and people. Results arrive sorted by score; the UI groups them by `type`.
   * Command results are produced client-side by the command palette.
   */
  search(query: string, params?: SearchParams): Promise<SearchResult[]>
}

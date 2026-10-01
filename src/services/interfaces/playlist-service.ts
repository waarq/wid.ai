import type {
  AddPlaylistItemInput,
  ListResponse,
  PlaylistItem,
  PlaylistListParams,
  UpdatePlaylistItemInput,
} from "@/types"

export interface PlaylistService {
  list(params?: PlaylistListParams): Promise<ListResponse<PlaylistItem>>
  add(input: AddPlaylistItemInput): Promise<PlaylistItem>
  update(id: string, input: UpdatePlaylistItemInput): Promise<PlaylistItem>
  remove(id: string): Promise<void>
}

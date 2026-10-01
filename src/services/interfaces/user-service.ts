import type { UpdateProfileInput, User, WorkspaceMember } from "@/types"

export interface UserService {
  getProfile(): Promise<User>
  updateProfile(input: UpdateProfileInput): Promise<User>
  /** Uploads a new profile photo and returns the updated user. */
  uploadAvatar(file: Blob): Promise<User>
  /** Teammates for Team Calls filters, share pickers and assignees. */
  listWorkspaceMembers(): Promise<WorkspaceMember[]>
}

import { apiClient } from "@/lib/api/client"
import type { UserService } from "@/services/interfaces"
import type { UpdateProfileInput, User, WorkspaceMember } from "@/types"

/* docs/backend/04-api-spec.md 5.2 */
export class ApiUserService implements UserService {
  getProfile(): Promise<User> {
    return apiClient.get<User>("/v1/me")
  }

  updateProfile(input: UpdateProfileInput): Promise<User> {
    return apiClient.patch<User>("/v1/me", input)
  }

  uploadAvatar(file: Blob): Promise<User> {
    const form = new FormData()
    form.append("file", file)
    return apiClient.post<User>("/v1/me/avatar", form)
  }

  listWorkspaceMembers(): Promise<WorkspaceMember[]> {
    return apiClient.get<WorkspaceMember[]>("/v1/workspace/members")
  }
}

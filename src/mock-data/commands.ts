import type { CommandSearchResult } from "@/types"

/** Global commands for the command palette and search. */
export const searchableCommands: CommandSearchResult[] = [
  { id: "cmd_search_meetings", type: "command", commandId: "search_meetings", title: "Search meetings", subtitle: "Find meetings, decisions and actions", score: 100, shortcut: ["/"] },
  { id: "cmd_go_my_calls", type: "command", commandId: "go_my_calls", title: "Go to My Calls", subtitle: "Meetings you captured or have access to", score: 100, shortcut: ["G", "M"] },
  { id: "cmd_go_team_calls", type: "command", commandId: "go_team_calls", title: "Go to Team Calls", subtitle: "Meetings shared with your team", score: 100, shortcut: ["G", "T"] },
  { id: "cmd_go_playlist", type: "command", commandId: "go_playlist", title: "Go to Playlist", subtitle: "Your saved moments", score: 100, shortcut: ["G", "P"] },
  { id: "cmd_go_alerts", type: "command", commandId: "go_alerts", title: "Go to Alerts", subtitle: "Actions, mentions and decisions", score: 100, shortcut: ["G", "A"] },
  { id: "cmd_go_deals", type: "command", commandId: "go_deals", title: "Go to Deals", subtitle: "Meeting-driven deal workspace", score: 100, shortcut: ["G", "D"] },
  { id: "cmd_start_capture", type: "command", commandId: "start_capture", title: "Start capture", subtitle: "Begin capturing a meeting manually", score: 100, shortcut: ["C"] },
  { id: "cmd_open_settings", type: "command", commandId: "open_settings", title: "Open settings", subtitle: "Capture, sharing and notifications", score: 100, shortcut: ["G", "S"] },
  { id: "cmd_open_profile", type: "command", commandId: "open_profile", title: "Open profile", subtitle: "Your account details", score: 100 },
  { id: "cmd_toggle_theme", type: "command", commandId: "toggle_theme", title: "Toggle theme", subtitle: "Switch between light and dark", score: 100, shortcut: ["T"] },
]

import { getYourActions } from "../data"
import { ActionLine, FieldLabel } from "./preview-parts"

/** Action items, each tied to the meeting and moment it came from. */
export function ActionsPanel() {
  const rows = getYourActions()
  return (
    <figure aria-label="Your actions" className="rounded-xl border border-border bg-card p-5 shadow-float sm:p-7">
      <FieldLabel className="mb-1">Your actions</FieldLabel>
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <ActionLine key={row.id} row={row} showSource />
        ))}
      </ul>
    </figure>
  )
}

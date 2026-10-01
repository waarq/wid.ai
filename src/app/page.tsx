// Temporary root page so the build passes. Phase 1 replaces this with
// the marketing page under the (marketing) route group.
export default function Home() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <p className="text-sm text-muted-foreground">WIT</p>
    </main>
  )
}

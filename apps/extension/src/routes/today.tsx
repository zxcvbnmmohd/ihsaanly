import { createFileRoute, redirect } from '@tanstack/react-router'

// The shared screens link Today as `/today` (More → Show me around is `/today?tour=1`);
// in the popup Today is the index route, so this only forwards there.
export const Route = createFileRoute('/today')({
  validateSearch: (search: Record<string, unknown>): { tour?: 1 } =>
    search.tour === 1 || search.tour === '1' ? { tour: 1 } : {},
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/', search, replace: true })
  },
})

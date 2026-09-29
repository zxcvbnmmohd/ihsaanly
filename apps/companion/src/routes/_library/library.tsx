// The `/library` URL itself: at every layout its grid is rendered by the
// parent layout (routes/_library/route.tsx), which reads the same matched
// state this leaf would need. With nothing selected there is nothing this
// leaf must render on its own — see LibraryRoute's `hasChild` branch.
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_library/library')({ component: () => null })

Prototype, not a route.

This was reachable at /profile-setup-test in production — a public,
indexable page serving mock onboarding data that nothing linked to.

The leading underscore makes it a Next.js private folder, so it is excluded
from routing entirely while the code stays here for reference. Renaming the
folder back is all it takes to restore the route; there is no other switch.

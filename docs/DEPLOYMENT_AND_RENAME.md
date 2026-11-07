# Deployment and repository rename checklist

The product is branded **Oriel Placement Desk**. The public GitHub repository
currently has the older URL slug `Oriel-Placement-Explorer`; that slug is not
a dependency of the browser application.

## Before renaming

1. Confirm the latest GitHub Pages deployment and Chromium tests pass.
2. Export a restorable JSON **Backup** from the app (do not confuse this with
   the human-readable decisions CSV export). Check cloud sync is connected
   before relying on synced data on another device.
3. Download a separate ZIP of the repository if you want an offline archive.
4. In Supabase **Authentication > URL Configuration**, allow both old and new
   exact web addresses temporarily, including trailing slashes.

## Repository rename

In GitHub **Settings > General > Repository name**, change
`Oriel-Placement-Explorer` to `oriel-placement-desk`.

The new default GitHub Pages project URL should then be:

`https://phivosmichailides.github.io/oriel-placement-desk/`

**Important:** GitHub redirects Git repository URLs after a rename, but
GitHub Pages project-site URLs are NOT automatically redirected. Existing
bookmarks to the old website may break. Prefer attaching a custom domain
before renaming if preventing any disruption is essential.

## After renaming

1. Check **Settings > Pages**, deployment status, HTTPS and the new Pages URL.
2. Set Supabase's **Site URL** to the new production website and add it to
   **Redirect URLs** (keep the old URL only while necessary).
3. Confirm Google sign-in and email magic links return to the new website.
   The frontend already builds its auth `redirectTo` from the current page.
4. Update the README live-app link, Supabase setup instructions, and
   any external portfolio, CV, bookmarks or shared links.
5. Run the automated GitHub Actions tests. The workflow builds its
   `TARGET` from the current repository owner and repository name.
6. Verify the 4,064 catalogue entries, map pins, shortlist, backup/restore
   and signed-in cloud workspace after migration.
7. If using local Git clones, update the origin remote URL.

## Storage and URL changes

Different GitHub Pages paths on the same origin can still share
`localStorage`, but do not rely on a site rename to transfer users' state:
export a backup and check cloud sync. Moving to a custom **domain** creates
a different origin, with separate localStorage. Test restore and synced
data before redirecting visitors.

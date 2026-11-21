import { useEffect, useState } from 'react'

// The newest ZAP POS installer. The file itself lives in a GitHub release (public, no bandwidth limit, resumable);
// the page asks GitHub which one is newest, so a new version appears here by itself the moment it is published
// there. If GitHub can't be reached (or answers too many times from one network), the buttons still work: they use
// GitHub's "latest" address, which always serves the newest installer, and the version line is simply left out.
const KEY = 'zap-latest-release'
const KEEP_MS = 10 * 60 * 1000 // GitHub allows 60 anonymous lookups an hour per address; one every 10 minutes is plenty

export const sizeLabel = (bytes) => `${Math.max(1, Math.round(bytes / 1048576))} MB`

function readCache() {
  try {
    const c = JSON.parse(sessionStorage.getItem(KEY))
    return c && Date.now() - c.at < KEEP_MS ? c : null
  } catch { return null }
}

export async function fetchLatestRelease(repo) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo ?? '')) return null
  const cached = readCache()
  if (cached && cached.repo === repo) return cached.release
  let release = null
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } })
    if (res.ok) {
      const r = await res.json()
      const file = (r.assets ?? []).find((a) => /\.exe$/i.test(a.name) && a.state === 'uploaded')
      if (file) release = { version: String(r.tag_name ?? '').replace(/^v/i, ''), url: file.browser_download_url, size: file.size }
    }
  } catch { /* offline or blocked: the fallback link is used */ }
  try { sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), repo, release })) } catch { /* private mode */ }
  return release
}

/** { version, url, size } for the newest published installer, or null (still loading, none yet, or unreachable). */
export function useLatestRelease(repo) {
  const [release, setRelease] = useState(null)
  useEffect(() => {
    let live = true
    fetchLatestRelease(repo).then((r) => live && setRelease(r))
    return () => { live = false }
  }, [repo])
  return release
}

/** The link every Download button uses: a link typed in the admin wins; otherwise the newest release's installer; otherwise GitHub's "latest" address for the file named ZAP-POS-Setup.exe. */
export function installerLink(links, release) {
  const edited = links.windowsInstaller
  if (edited && edited !== '#') return edited
  if (release?.url) return release.url
  return /^[\w.-]+\/[\w.-]+$/.test(links.githubRepo ?? '') ? `https://github.com/${links.githubRepo}/releases/latest/download/ZAP-POS-Setup.exe` : '#'
}

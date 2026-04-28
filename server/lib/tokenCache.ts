interface CachedToken {
  token: string
  expiry: number
}

const cache = new Map<string, CachedToken>()
const refreshing = new Map<string, Promise<string>>()
const EXPIRY_BUFFER_MS = 60_000

export function getAccessToken(uid: string): string | null {
  const cached = cache.get(uid)
  if (cached && cached.expiry > Date.now() + EXPIRY_BUFFER_MS) {
    return cached.token
  }
  return null
}

export function setAccessToken(uid: string, token: string, expiry: number): void {
  cache.set(uid, { token, expiry })
}

export function clearAccessToken(uid: string): void {
  cache.delete(uid)
}

export async function getOrRefreshToken(
  uid: string,
  refreshFn: () => Promise<{ token: string; expiry: number }>,
): Promise<string> {
  const cached = getAccessToken(uid)
  if (cached) return cached

  const existing = refreshing.get(uid)
  if (existing) return existing

  const promise = refreshFn()
    .then(({ token, expiry }) => {
      setAccessToken(uid, token, expiry)
      refreshing.delete(uid)
      return token
    })
    .catch((err) => {
      refreshing.delete(uid)
      throw err
    })

  refreshing.set(uid, promise)
  return promise
}

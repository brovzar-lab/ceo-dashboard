export type BriefSseEvent =
  | { type: 'cached'; jarvis: string; billy: string; generatedAt?: string; isStale: boolean; isDemo?: boolean }
  | { type: 'token'; voice: 'jarvis' | 'billy'; text: string }
  | { type: 'done'; jarvis: string; billy: string; generatedAt: string; briefId: string }
  | { type: 'error'; message: string }

export function parseSseEvent(line: string): BriefSseEvent | null {
  if (!line.startsWith('data: ')) return null
  try {
    return JSON.parse(line.slice(6)) as BriefSseEvent
  } catch {
    return null
  }
}

export interface BriefStreamCallbacks {
  onCached: (event: Extract<BriefSseEvent, { type: 'cached' }>) => void
  onToken: (voice: 'jarvis' | 'billy', text: string) => void
  onDone: (event: Extract<BriefSseEvent, { type: 'done' }>) => void
  onError: (message: string) => void
}

export function startBriefStream(
  forceRefresh: boolean,
  callbacks: BriefStreamCallbacks,
): () => void {
  const controller = new AbortController()

  ;(async () => {
    try {
      const response = await fetch('/api/claude/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRefresh }),
        signal: controller.signal,
      })

      if (!response.ok) {
        callbacks.onError('Brief request failed')
        return
      }

      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.includes('text/event-stream')) {
        // Cached JSON response
        const json = await response.json()
        if (json.data) {
          callbacks.onCached({ type: 'cached', ...json.data, isStale: false })
          callbacks.onDone({ type: 'done', ...json.data, briefId: '', generatedAt: json.data.generatedAt ?? '' })
        }
        return
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          const event = parseSseEvent(line.trim())
          if (!event) continue
          if (event.type === 'cached') callbacks.onCached(event)
          else if (event.type === 'token') callbacks.onToken(event.voice, event.text)
          else if (event.type === 'done') callbacks.onDone(event)
          else if (event.type === 'error') callbacks.onError(event.message)
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        callbacks.onError('Stream error')
      }
    }
  })()

  return () => controller.abort()
}

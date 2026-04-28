export class MutationQueue {
  private queues = new Map<string, Promise<void>>()
  private readonly timeoutMs: number

  constructor(timeoutMs = 5_000) {
    this.timeoutMs = timeoutMs
  }

  enqueue(id: string, fn: () => Promise<void>): Promise<void> {
    const prev = this.queues.get(id) ?? Promise.resolve()

    const next: Promise<void> = prev.then(() =>
      Promise.race([
        fn(),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('mutation timeout')), this.timeoutMs),
        ),
      ]),
    ).then(() => {
      if (this.queues.get(id) === next) this.queues.delete(id)
    }).catch((err) => {
      if (this.queues.get(id) === next) this.queues.delete(id)
      throw err
    })

    this.queues.set(id, next)
    return next
  }
}

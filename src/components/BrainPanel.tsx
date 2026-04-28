import { useBrainStore } from '@/stores/useBrainStore'
import type { NotionBlock, ToneDot } from '@shared/types'

const TONE_DOT_COLORS: Record<ToneDot, string> = {
  hot: 'bg-accent-coral',
  active: 'bg-accent-lemon',
  cool: 'border border-border-medium bg-transparent',
}

function Block({ block }: { block: NotionBlock }) {
  const isHeading = block.type.startsWith('heading_')
  const headingLevel = isHeading ? parseInt(block.type.split('_')[1]) : null

  return (
    <div className="flex items-start gap-2.5">
      {block.toneDot && (
        <span
          data-testid="tone-dot"
          className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${TONE_DOT_COLORS[block.toneDot]}`}
        />
      )}
      {!block.toneDot && <span className="w-1.5 h-1.5 mt-1.5 flex-shrink-0" />}
      <span
        className={[
          'font-body leading-relaxed',
          headingLevel === 2 ? 'text-sm font-semibold text-text-secondary mt-2' :
          headingLevel === 3 ? 'text-xs font-semibold text-text-tertiary uppercase tracking-wide mt-2' :
          'text-sm text-text-secondary',
          block.type === 'divider' ? 'w-full border-t border-border-soft' : '',
        ].join(' ')}
      >
        {block.text}
      </span>
    </div>
  )
}

export function BrainPanel() {
  const { blocks, loading } = useBrainStore()

  return (
    <div className="bg-bg-surface border border-border-soft rounded-xl p-4">
      <h2 className="text-[10px] font-body font-semibold text-text-muted tracking-widest uppercase mb-4">Brain</h2>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-4 h-4 rounded-full border-2 border-accent-lemon border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {blocks.map((block) => (
            <Block key={block.id} block={block} />
          ))}
        </div>
      )}
    </div>
  )
}

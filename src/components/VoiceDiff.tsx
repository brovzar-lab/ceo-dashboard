import React, { useState, useMemo } from 'react'
import type { VoiceProfile } from '../lib/voiceProfile'

type FieldKey =
  | 'summary'
  | 'tones.inner' | 'tones.peer' | 'tones.exec' | 'tones.legal' | 'tones.talent'
  | 'patterns.openings' | 'patterns.closings' | 'patterns.avoid'

function getField(profile: VoiceProfile, key: FieldKey): string {
  if (key === 'summary') return profile.summary
  if (key.startsWith('tones.')) {
    const tier = key.replace('tones.', '') as keyof VoiceProfile['tones']
    return profile.tones[tier]
  }
  const pat = key.replace('patterns.', '') as keyof VoiceProfile['patterns']
  const val = profile.patterns[pat]
  return Array.isArray(val) ? val.join(', ') : String(val)
}

function setField(profile: VoiceProfile, key: FieldKey, value: string): VoiceProfile {
  const p = structuredClone(profile)
  if (key === 'summary') { p.summary = value; return p }
  if (key.startsWith('tones.')) {
    const tier = key.replace('tones.', '') as keyof VoiceProfile['tones']
    p.tones[tier] = value
    return p
  }
  const pat = key.replace('patterns.', '') as keyof VoiceProfile['patterns']
  if (pat === 'signature') { p.patterns.signature = value; return p }
  ;(p.patterns[pat] as string[]) = value.split(',').map(s => s.trim()).filter(Boolean)
  return p
}

const FIELD_LABELS: Record<FieldKey, string> = {
  'summary':           'Voice summary',
  'tones.inner':       'Tone: Inner circle',
  'tones.peer':        'Tone: Peer',
  'tones.exec':        'Tone: Exec',
  'tones.legal':       'Tone: Legal',
  'tones.talent':      'Tone: Talent',
  'patterns.openings': 'Openings',
  'patterns.closings': 'Closings',
  'patterns.avoid':    'Always avoids',
}

const ALL_FIELDS: FieldKey[] = [
  'summary',
  'tones.inner', 'tones.peer', 'tones.exec', 'tones.legal', 'tones.talent',
  'patterns.openings', 'patterns.closings', 'patterns.avoid',
]

interface Props {
  current: VoiceProfile
  proposed: VoiceProfile
  emailsAnalyzed: number
  onApprove: (merged: VoiceProfile) => void
  onCancel: () => void
}

export default function VoiceDiff({ current, proposed, emailsAnalyzed, onApprove, onCancel }: Props) {
  const changedFields = ALL_FIELDS.filter(k => getField(current, k) !== getField(proposed, k))

  const [approved, setApproved] = useState<Record<FieldKey, boolean>>(
    () => Object.fromEntries(changedFields.map(k => [k, true])) as Record<FieldKey, boolean>,
  )

  function toggle(key: FieldKey) {
    setApproved(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function approveAll() {
    setApproved(Object.fromEntries(changedFields.map(k => [k, true])) as Record<FieldKey, boolean>)
  }

  function commit() {
    let merged = { ...current }
    for (const key of changedFields) {
      if (approved[key]) {
        merged = setField(merged, key, getField(proposed, key))
      }
    }
    merged.trained = true
    merged.emailsAnalyzed = emailsAnalyzed
    merged.lastUpdated = new Date().toISOString()
    onApprove(merged)
  }

  const approvedCount = useMemo(
    () => Object.values(approved).filter(Boolean).length,
    [approved],
  )

  if (changedFields.length === 0) {
    return (
      <div className="voice-diff-empty">
        <p>No changes detected. Your current profile already matches the patterns in your {emailsAnalyzed} sent emails.</p>
        <button onClick={onCancel} className="voice-diff-close-btn">Close</button>
      </div>
    )
  }

  return (
    <div className="voice-diff">
      <div className="voice-diff-header">
        <span className="voice-diff-count">
          {changedFields.length} field{changedFields.length !== 1 ? 's' : ''} changed across {emailsAnalyzed} sent emails
        </span>
        <button onClick={approveAll} className="voice-diff-approve-all">Approve all</button>
      </div>

      <div className="voice-diff-fields">
        {changedFields.map(key => (
          <div key={key} className={`voice-diff-card ${approved[key] ? 'approved' : 'skipped'}`}>
            <div className="voice-diff-card-header">
              <span className="voice-diff-label">{FIELD_LABELS[key]}</span>
              <button onClick={() => toggle(key)} className={`voice-diff-toggle ${approved[key] ? 'is-approved' : ''}`}>
                {approved[key] ? 'Approved' : 'Skipped'}
              </button>
            </div>
            <div className="voice-diff-old">{getField(current, key) || '(empty)'}</div>
            <div className="voice-diff-new">{getField(proposed, key)}</div>
          </div>
        ))}
      </div>

      <div className="voice-diff-actions">
        <button onClick={onCancel} className="voice-diff-cancel">Cancel</button>
        <button onClick={commit} className="voice-diff-commit">
          Commit {approvedCount} change{approvedCount !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  )
}

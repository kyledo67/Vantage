import { confidenceTone } from '../../utils/format.js'

export default function ConfidenceBadge({ level }) {
  const label = level ? level.charAt(0).toUpperCase() + level.slice(1) : 'Unknown'
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${confidenceTone(level)}`}
    >
      Confidence: {label}
    </span>
  )
}

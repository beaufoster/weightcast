import { useUI } from '@/store/ui'

interface Props { emoji: string; title: string; sub: string }

export function Celebration({ emoji, title, sub }: Props) {
  const { shiftCelebration } = useUI()
  return (
    <div className="celebrate-overlay show">
      <div className="celebrate-card">
        <span className="celebrate-emoji">{emoji}</span>
        <div className="celebrate-title">{title}</div>
        <div className="celebrate-sub">{sub}</div>
        <button className="celebrate-dismiss" onClick={shiftCelebration}>
          Awesome! 🙌
        </button>
      </div>
    </div>
  )
}

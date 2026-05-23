import { useUI } from '@/store/ui'
import { Page } from '@/types'

export function TabBar() {
  const { page, setPage } = useUI()
  return (
    <nav className="tab-bar" role="tablist">
      <button
        id="tab-calculator"
        className={`tab-btn${page === 'calculator' ? ' active' : ''}`}
        onClick={() => setPage('calculator' as Page)}
        role="tab"
        aria-selected={page === 'calculator'}
      >
        <span className="tab-ico">🧮</span>
        <span className="tab-lbl">Calculator</span>
      </button>
      <button
        id="tab-checkin"
        className={`tab-btn${page === 'checkin' ? ' active' : ''}`}
        onClick={() => setPage('checkin' as Page)}
        role="tab"
        aria-selected={page === 'checkin'}
      >
        <span className="tab-ico">📋</span>
        <span className="tab-lbl">Check-In</span>
      </button>
    </nav>
  )
}

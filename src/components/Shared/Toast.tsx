import { useEffect, useState } from 'react'

export function Toast({ message }: { message: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 3000)
    return () => clearTimeout(t)
  }, [message])

  return (
    <div className={`toast${visible ? ' show' : ''}`} aria-live="polite">
      {message}
    </div>
  )
}

import { useEffect, useRef } from 'react'
import { Checkin, Plan, Unit } from '@/types'
import { fromLbs, fmtWt } from '@/utils/calculator'

interface Props { checkins: Checkin[]; plan: Plan | null; unit: Unit }

export function CheckinChart({ checkins, plan, unit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || checkins.length < 2) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const parent = canvas.parentElement!
    const cs = getComputedStyle(parent)
    canvas.width  = parent.offsetWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) || 340
    canvas.height = 200

    const W = canvas.width, H = canvas.height
    const pad = { top: 20, right: 16, bottom: 32, left: 52 }
    const weights = checkins.map(c => c.weight)
    const goalWt  = plan?.gw ?? null
    const minW = Math.min(...weights, goalWt ?? Infinity) - 3
    const maxW = Math.max(...weights) + 3
    const n = checkins.length
    const xP = (i: number) => pad.left + i * (W - pad.left - pad.right) / (n - 1)
    const yP = (w: number) => H - pad.bottom - (w - minW) / (maxW - minW) * (H - pad.top - pad.bottom)

    ctx.clearRect(0, 0, W, H)

    // Goal line
    if (goalWt != null) {
      ctx.beginPath(); ctx.strokeStyle = '#22a05a33'; ctx.lineWidth = 1; ctx.setLineDash([4, 4])
      ctx.moveTo(pad.left, yP(goalWt)); ctx.lineTo(W - pad.right, yP(goalWt)); ctx.stroke()
      ctx.setLineDash([])
      const gl = 'Goal: ' + fmtWt(goalWt, unit)
      ctx.fillStyle = '#22a05a'; ctx.font = 'bold 10px DM Sans,sans-serif'; ctx.textAlign = 'left'
      const glW = ctx.measureText(gl).width
      ctx.fillText(gl, Math.max(pad.left + 4, W - pad.right - glW), yP(goalWt) - 4)
    }

    // Actual line
    ctx.beginPath(); ctx.strokeStyle = '#22a05a'; ctx.lineWidth = 2.5
    checkins.forEach((c, i) => { i === 0 ? ctx.moveTo(xP(i), yP(c.weight)) : ctx.lineTo(xP(i), yP(c.weight)) })
    ctx.stroke()

    // Dots
    checkins.forEach((c, i) => {
      ctx.beginPath(); ctx.arc(xP(i), yP(c.weight), 4, 0, Math.PI * 2)
      ctx.fillStyle = '#22a05a'; ctx.fill()
    })

    // X labels
    ctx.fillStyle = '#999'; ctx.font = '10px DM Sans,sans-serif'; ctx.textAlign = 'center'
    const step = Math.ceil(n / 6)
    checkins.forEach((c, i) => {
      if (i % step === 0 || i === n - 1) {
        const label = c.date.slice(5) // MM-DD
        ctx.fillText(label, xP(i), H - 10)
      }
    })

    // Y labels
    ctx.textAlign = 'right'
    for (let k = 0; k <= 4; k++) {
      const w = minW + (maxW - minW) * (k / 4)
      ctx.fillText(fromLbs(w, unit).toFixed(0), pad.left - 4, yP(w) + 3)
    }
  }, [checkins, plan, unit])

  return (
    <div className="card ci-chart-card">
      <div className="card-title"><div className="ico">📈</div> Progress Chart</div>
      <canvas ref={canvasRef} />
    </div>
  )
}

import { useEffect, useRef } from 'react'
import { Unit } from '@/types'
import { fmtWt, fromLbs } from '@/utils/calculator'

interface Props {
  sim: Array<{ week: number; weight: number }>
  cw: number
  gw: number
  unit: Unit
}

export function ProjectionChart({ sim, cw, gw, unit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !sim.length) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const parent = canvas.parentElement!
    const cs = getComputedStyle(parent)
    canvas.width  = parent.offsetWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) || 340
    canvas.height = 180

    const W = canvas.width, H = canvas.height
    const pad = { top: 20, right: 16, bottom: 32, left: 48 }
    const weights = sim.map(s => s.weight)
    const minW = Math.min(...weights, gw) - 2
    const maxW = Math.max(...weights, cw) + 2
    const xScale = (W - pad.left - pad.right) / (sim.length - 1 || 1)
    const yScale = (H - pad.top - pad.bottom) / (maxW - minW || 1)
    const xP = (i: number) => pad.left + i * xScale
    const yP = (w: number) => H - pad.bottom - (w - minW) * yScale

    ctx.clearRect(0, 0, W, H)

    // Goal line
    ctx.beginPath(); ctx.strokeStyle = '#22a05a'; ctx.lineWidth = 1; ctx.setLineDash([4, 4])
    ctx.moveTo(pad.left, yP(gw)); ctx.lineTo(W - pad.right, yP(gw)); ctx.stroke()
    ctx.setLineDash([])

    // Goal label
    const gl = 'Goal: ' + fmtWt(gw, unit)
    ctx.fillStyle = '#22a05a'; ctx.font = 'bold 10px DM Sans,sans-serif'; ctx.textAlign = 'left'
    const glW = ctx.measureText(gl).width
    ctx.fillText(gl, Math.max(pad.left + 4, W - pad.right - glW), yP(gw) - 4)

    // Projection line
    ctx.beginPath(); ctx.strokeStyle = '#22a05a'; ctx.lineWidth = 2.5
    sim.forEach((s, i) => { i === 0 ? ctx.moveTo(xP(i), yP(s.weight)) : ctx.lineTo(xP(i), yP(s.weight)) })
    ctx.stroke()

    // X-axis labels
    ctx.fillStyle = '#999'; ctx.font = '10px DM Sans,sans-serif'; ctx.textAlign = 'center'
    const step = Math.ceil(sim.length / 6)
    sim.forEach((s, i) => {
      if (i % step === 0 || i === sim.length - 1) {
        ctx.fillText(`wk${s.week}`, xP(i), H - 10)
      }
    })

    // Y-axis labels
    ctx.textAlign = 'right'
    const ySteps = 4
    for (let n = 0; n <= ySteps; n++) {
      const w = minW + (maxW - minW) * (n / ySteps)
      ctx.fillText(fromLbs(w, unit).toFixed(0), pad.left - 4, yP(w) + 3)
    }
  }, [sim, cw, gw, unit])

  return (
    <div className="card proj-chart-card">
      <div className="card-title"><div className="ico">📉</div> Projection</div>
      <canvas ref={canvasRef} />
    </div>
  )
}

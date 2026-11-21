'use client'

import { useEffect, useRef } from 'react'

export function AmbientBackground() {
  const layerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const layer = layerRef.current
    const hero = layer?.closest<HTMLElement>('.hero')
    if (!layer || !hero) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const finePointer = window.matchMedia('(pointer: fine)').matches
    if (reducedMotion || !finePointer) return

    let frame = 0
    let x = 0
    let y = 0

    const paint = () => {
      frame = 0
      layer.style.setProperty('--spot-x', `${x}px`)
      layer.style.setProperty('--spot-y', `${y}px`)
      layer.dataset.spot = 'on'
    }

    const onPointerMove = (event: PointerEvent) => {
      const bounds = hero.getBoundingClientRect()
      x = event.clientX - bounds.left
      y = event.clientY - bounds.top
      if (!frame) frame = window.requestAnimationFrame(paint)
    }

    const onPointerLeave = () => {
      if (frame) {
        window.cancelAnimationFrame(frame)
        frame = 0
      }
      delete layer.dataset.spot
    }

    hero.addEventListener('pointermove', onPointerMove, { passive: true })
    hero.addEventListener('pointerleave', onPointerLeave)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      hero.removeEventListener('pointermove', onPointerMove)
      hero.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [])

  return (
    <div className="ambient" ref={layerRef} aria-hidden="true">
      <div className="ambient-grid" />
      <div className="ambient-spot" />
    </div>
  )
}

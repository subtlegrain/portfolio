'use client'

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import {
  CONTEXT_SIZE,
  encodeContext,
  forward,
  tokenGlyph,
  VOCAB_SIZE,
  type CharNetwork,
  type RevealPhase,
} from '@/lib/neural/char-network'

type NeuralGraphProps = {
  network: CharNetwork | null
  phase: RevealPhase
  reducedMotion: boolean
  contextRef: RefObject<number[]>
  activeOutputRef: RefObject<number | null>
}

const INK = 'rgba(239, 242, 255, '
const MUTED = 'rgba(159, 169, 192, '
const BLUE = '112, 164, 255'
const VIOLET = '167, 139, 250'

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function layerY(index: number, count: number, top: number, height: number): number {
  return top + (height * (index + 0.5)) / count
}

export function NeuralGraph({ network, phase, reducedMotion, contextRef, activeOutputRef }: NeuralGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    const staticOnly = phase === 'complete' || reducedMotion
    const drawPhase: RevealPhase = reducedMotion ? 'complete' : phase
    const start = performance.now()
    let animationFrame = 0
    let width = 0
    let height = 0
    let lastActive: number | null = activeOutputRef.current
    let activeChangedAt = -10000

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = (now: number) => {
      if (!width || !height) return
      context.clearRect(0, 0, width, height)
      if (!network) return

      const elapsed = Math.max(0, now - start)
      const activeToken = activeOutputRef.current ?? null
      if (activeToken !== lastActive) {
        lastActive = activeToken
        activeChangedAt = elapsed
      }

      const showOutputLabels = width >= 430 && height >= 270
      const padding = {
        left: 22,
        right: showOutputLabels ? 42 : 18,
        top: 42,
        bottom: 32,
      }
      const plotWidth = Math.max(60, width - padding.left - padding.right)
      const plotHeight = Math.max(60, height - padding.top - padding.bottom)
      const layerX = [
        padding.left,
        padding.left + plotWidth * 0.34,
        padding.left + plotWidth * 0.67,
        width - padding.right,
      ]
      const counts = [CONTEXT_SIZE, network.architecture[1], network.architecture[2], VOCAB_SIZE]
      const nodes = counts.map((count, layerIndex) =>
        Array.from({ length: count }, (_, nodeIndex) => ({
          x: layerX[layerIndex],
          y: layerY(nodeIndex, count, padding.top, plotHeight),
        })),
      )

      const input = encodeContext(contextRef.current)
      const pass = forward(network, input)
      const activations = [input, pass.hidden1, pass.hidden2, pass.probabilities]

      let forwardWave = -1
      if (drawPhase === 'forward') {
        forwardWave = clamp((elapsed - 140) / 1500) * 3
      }

      let backwardWave = -1
      if (drawPhase === 'training') {
        backwardWave = clamp(((elapsed - 180) % 1280) / 1280) * 3
      }

      const initProgress = drawPhase === 'init' ? clamp((elapsed - 120) / 1150) : 1

      // Connections first, so the nodes always sit above them.
      for (let layerIndex = 0; layerIndex < 3; layerIndex += 1) {
        const from = nodes[layerIndex]
        const to = nodes[layerIndex + 1]
        const layerReveal =
          drawPhase === 'init' ? clamp((initProgress - layerIndex * 0.19) / 0.42) : 1
        if (layerReveal <= 0) continue

        const weights = network.layers[layerIndex].weights
        for (let targetIndex = 0; targetIndex < to.length; targetIndex += 1) {
          const row = weights[targetIndex]
          for (let sourceIndex = 0; sourceIndex < from.length; sourceIndex += 1) {
            const weight = row[sourceIndex]
            const magnitude = clamp(Math.abs(weight) / 0.8)
            const alpha = (0.028 + magnitude * 0.15) * layerReveal
            const source = from[sourceIndex]
            const target = to[targetIndex]
            context.strokeStyle = weight >= 0 ? `rgba(${BLUE}, ${alpha})` : `rgba(${VIOLET}, ${alpha})`
            context.lineWidth = 0.55 + magnitude * 0.35
            context.beginPath()
            context.moveTo(source.x, source.y)
            context.lineTo(target.x, target.y)
            context.stroke()
          }
        }

        // A forward signal travels left to right. During training a quieter
        // signal travels backwards, standing in for the gradient update.
        let wave = -1
        let waveColor = BLUE
        let waveAlpha = 0.52
        if (forwardWave >= 0) {
          wave = forwardWave - layerIndex
        } else if (backwardWave >= 0) {
          wave = backwardWave - (2 - layerIndex)
          waveColor = VIOLET
          waveAlpha = 0.3
        }

        if (wave > 0 && wave < 1) {
          context.fillStyle = `rgba(${waveColor}, ${waveAlpha * layerReveal})`
          for (let targetIndex = 0; targetIndex < to.length; targetIndex += 1) {
            for (let sourceIndex = 0; sourceIndex < from.length; sourceIndex += 1) {
              const source = from[sourceIndex]
              const target = to[targetIndex]
              context.beginPath()
              context.arc(
                source.x + (target.x - source.x) * wave,
                source.y + (target.y - source.y) * wave,
                0.9,
                0,
                Math.PI * 2,
              )
              context.fill()
            }
          }
        }
      }

      // Nodes.
      const colors = [`rgba(${BLUE},`, `rgba(126, 168, 250,`, `rgba(158, 148, 248,`, `rgba(178, 170, 255,`]
      for (let layerIndex = 0; layerIndex < 4; layerIndex += 1) {
        const layerReveal =
          drawPhase === 'init' ? clamp((initProgress - layerIndex * 0.17) / 0.4) : 1
        if (layerReveal <= 0) continue

        const layerNodes = nodes[layerIndex]
        const values = activations[layerIndex]

        for (let nodeIndex = 0; nodeIndex < layerNodes.length; nodeIndex += 1) {
          const node = layerNodes[nodeIndex]
          const value = values[nodeIndex] ?? 0
          const intensity =
            layerIndex === 0
              ? 0.2 + value * 0.8
              : layerIndex === 3
                ? clamp(Math.pow(value, 0.55) * 1.8)
                : clamp(Math.abs(value) * 1.15)
          const isActiveOutput = layerIndex === 3 && nodeIndex === activeToken
          const isDecoding = drawPhase === 'decode'
          const activePulse = isActiveOutput && isDecoding
            ? clamp(1 - (elapsed - activeChangedAt) / 620)
            : 0
          const size = layerIndex === 3 ? 2.1 : 2.35
          const glow = clamp(intensity * 0.9 + activePulse * 0.8) * layerReveal

          if (glow > 0.08) {
            context.fillStyle = `${colors[layerIndex]} ${0.055 * glow})`
            context.beginPath()
            context.arc(node.x, node.y, size * 3.2, 0, Math.PI * 2)
            context.fill()
          }

          context.fillStyle =
            glow > 0.45
              ? `${colors[layerIndex]} ${(0.62 + glow * 0.38).toFixed(3)})`
              : `rgba(139, 149, 172, ${(0.2 + glow * 0.4).toFixed(3)})`
          context.beginPath()
          context.arc(node.x, node.y, size, 0, Math.PI * 2)
          context.fill()

          if (isActiveOutput && drawPhase !== 'complete') {
            context.strokeStyle = `rgba(${BLUE}, ${0.3 + activePulse * 0.55})`
            context.lineWidth = 0.9
            context.beginPath()
            context.arc(node.x, node.y, size + 3 + activePulse * 2, 0, Math.PI * 2)
            context.stroke()
          }
        }
      }

      // Matrix and bias labels.
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.font = "500 8px ui-monospace, SFMono-Regular, Menlo, monospace"
      const matrixLabels = ['W₁ · b₁', 'W₂ · b₂', 'W₃ · b₃']
      for (let layerIndex = 0; layerIndex < 3; layerIndex += 1) {
        const reveal = drawPhase === 'init' ? clamp((initProgress - 0.15 * layerIndex) / 0.5) : 1
        if (reveal <= 0) continue
        context.fillStyle = `${MUTED} ${0.6 * reveal})`
        context.fillText(
          matrixLabels[layerIndex],
          (layerX[layerIndex] + layerX[layerIndex + 1]) / 2,
          17,
        )
      }

      // Layer captions.
      context.font = "500 7.5px ui-monospace, SFMono-Regular, Menlo, monospace"
      context.fillStyle = `${MUTED} 0.58)`
      const layerNames = ['CONTEXT', 'h₁ · tanh', 'h₂ · tanh', 'ŷ · softmax']
      for (let layerIndex = 0; layerIndex < 4; layerIndex += 1) {
        context.fillText(layerNames[layerIndex], layerX[layerIndex], height - 11)
      }

      // Output vocabulary, aligned to each softmax node.
      const outputNodes = nodes[3]
      context.textAlign = 'left'
      context.font = "500 7.5px ui-monospace, SFMono-Regular, Menlo, monospace"
      if (showOutputLabels) {
        for (let token = 0; token < VOCAB_SIZE; token += 1) {
          context.fillStyle = token === activeToken ? `${INK} 0.95)` : `${MUTED} 0.42)`
          context.fillText(tokenGlyph(token), outputNodes[token].x + 9, outputNodes[token].y)
        }
      } else if (activeToken !== null && outputNodes[activeToken]) {
        context.fillStyle = `${INK} 0.9)`
        context.fillText(tokenGlyph(activeToken), outputNodes[activeToken].x + 9, outputNodes[activeToken].y)
      }
    }

    resize()
    if (staticOnly) {
      draw(performance.now())
    } else {
      const frame = (now: number) => {
        draw(now)
        animationFrame = requestAnimationFrame(frame)
      }
      animationFrame = requestAnimationFrame(frame)
    }

    const observer = new ResizeObserver(() => {
      resize()
      draw(performance.now())
    })
    observer.observe(canvas)

    return () => {
      cancelAnimationFrame(animationFrame)
      observer.disconnect()
    }
  }, [network, phase, reducedMotion, contextRef, activeOutputRef])

  return (
    <canvas
      ref={canvasRef}
      className="neural-canvas"
      aria-hidden="true"
      role="presentation"
    />
  )
}

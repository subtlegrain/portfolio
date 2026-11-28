'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { RotateCcw, SkipForward } from 'lucide-react'
import {
  CONTEXT_SIZE,
  createCharNetwork,
  createTrainer,
  encodeContext,
  EOS_TOKEN,
  forward,
  greedyDecode,
  isCachedRun,
  LEARNING_RATE,
  PAD_TOKEN,
  TARGET_NAME,
  tokenGlyph,
  tokenValue,
  TOTAL_EPOCHS,
  VOCAB_SIZE,
  type CachedRun,
  type CharNetwork,
  type DecodeStep,
  type RevealPhase,
  type Trainer,
} from '@/lib/neural/char-network'
import { NeuralGraph } from './neural-graph'

const STORAGE_KEY = 'sk-neural-reveal'
const SEEDS = [7919, 15838, 23757, 31676, 39595, 55433]

const INIT_MS = 1200
const FORWARD_MS = 2200
const TRAIN_MS = 4000
const DECODE_LEAD_MS = 280
const CHARACTER_MS = 112
const WORD_GAP_MS = 190
const EOS_HOLD_MS = 380
const FINAL_HOLD_MS = 520
const FINALIZE_CHUNK_EPOCHS = 32

const NAME_LINES = [
  { offset: 0, characters: Array.from(TARGET_NAME.slice(0, 5)) },
  { offset: 6, characters: Array.from(TARGET_NAME.slice(6)) },
]

const STAGE_LABELS: Record<RevealPhase, string> = {
  init: '01 · initialize',
  forward: '02 · forward pass',
  training: '03 · backprop / Adam',
  decode: '04 · greedy decode',
  complete: 'model converged',
}

const STAGE_SHORT: Record<RevealPhase, string> = {
  init: 'init',
  forward: 'forward',
  training: 'learning',
  decode: 'decode',
  complete: 'ready',
}

type Metrics = {
  loss: number
  epoch: number
  prediction: number
  confidence: number
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function readCachedRun(): CachedRun | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isCachedRun(parsed)) return null
    if (parsed.decoded !== TARGET_NAME) return null
    return parsed
  } catch {
    return null
  }
}

function writeCachedRun(run: CachedRun): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(run))
  } catch {
    // Session storage can be unavailable in private or embedded contexts. The
    // animation still works; only the replay-on-next-navigation shortcut is lost.
  }
}

function clearCachedRun(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore storage failures.
  }
}

function markNeuralState(state: 'fresh' | 'animating' | 'done'): void {
  document.documentElement.dataset.neural = state
}

function pickStartingSeed(): number {
  return SEEDS[Math.floor(Math.random() * SEEDS.length)]
}

function LossSparkline({ values }: { values: number[] }) {
  const path = useMemo(() => {
    if (values.length < 2) return null
    const width = 86
    const height = 20
    const highest = Math.log(VOCAB_SIZE + 0.1)
    const lowest = Math.log(0.008)
    const points = values.map((value, index) => {
      const x = (index / (values.length - 1)) * width
      const normalized = (Math.log(Math.max(value, 0.008)) - lowest) / (highest - lowest)
      const y = height - Math.min(1, Math.max(0, normalized)) * height
      return [x, y] as const
    })
    return {
      line: points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' '),
      area: `M0 ${height} ${points.map(([x, y]) => `L${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')} L${width} ${height} Z`,
    }
  }, [values])

  if (!path) return <span className="neural-spark-empty" aria-hidden="true" />
  return (
    <svg className="neural-spark" viewBox="0 0 86 20" preserveAspectRatio="none" aria-hidden="true">
      <path d={path.area} className="neural-spark-area" />
      <path d={path.line} className="neural-spark-line" />
    </svg>
  )
}

export function NeuralHero() {
  const [phase, setPhase] = useState<RevealPhase>('complete')
  const [network, setNetwork] = useState<CharNetwork | null>(null)
  const [outputText, setOutputText] = useState(TARGET_NAME)
  const [revealedCount, setRevealedCount] = useState(TARGET_NAME.length)
  const [context, setContext] = useState<number[]>([PAD_TOKEN, PAD_TOKEN, PAD_TOKEN])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [lossHistory, setLossHistory] = useState<number[]>([])
  const [reducedMotion, setReducedMotion] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [runId, setRunId] = useState(0)

  const networkRef = useRef<CharNetwork | null>(null)
  const trainerRef = useRef<Trainer | null>(null)
  const contextRef = useRef<number[]>([PAD_TOKEN, PAD_TOKEN, PAD_TOKEN])
  const activeOutputRef = useRef<number | null>(null)
  const seedRef = useRef(SEEDS[0])
  const seedIndexRef = useRef(0)
  const reducedMotionRef = useRef(false)
  const decodedTextRef = useRef(TARGET_NAME)
  const finalizeIdRef = useRef(0)
  const modeRef = useRef<'animate' | 'finalize'>('animate')

  const persist = useCallback((trainer: Trainer, decoded: string) => {
    if (decoded !== TARGET_NAME) return
    writeCachedRun({
      version: 1,
      seed: seedRef.current,
      epochs: trainer.epoch,
      loss: trainer.loss(),
      decoded,
      network: trainer.network,
    })
  }, [])

  const startRun = useCallback((seed: number) => {
    finalizeIdRef.current += 1
    modeRef.current = 'animate'
    setFinalizing(false)
    const nextNetwork = createCharNetwork(seed)
    const trainer = createTrainer(nextNetwork)
    const initialLoss = trainer.loss()
    const initialPass = forward(nextNetwork, encodeContext([PAD_TOKEN, PAD_TOKEN, PAD_TOKEN]))

    networkRef.current = nextNetwork
    trainerRef.current = trainer
    seedRef.current = seed
    seedIndexRef.current = (SEEDS.indexOf(seed) + 1) % SEEDS.length
    contextRef.current = [PAD_TOKEN, PAD_TOKEN, PAD_TOKEN]
    activeOutputRef.current = null
    decodedTextRef.current = TARGET_NAME

    setNetwork(nextNetwork)
    setPhase('init')
    setOutputText(TARGET_NAME)
    setRevealedCount(0)
    setContext([PAD_TOKEN, PAD_TOKEN, PAD_TOKEN])
    setMetrics({
      loss: initialLoss,
      epoch: 0,
      prediction: initialPass.prediction,
      confidence: initialPass.confidence,
    })
    setLossHistory([initialLoss])
    markNeuralState('animating')
    setRunId((value) => value + 1)
  }, [])

  const finishAsync = useCallback(
    (seed: number, nextNetwork: CharNetwork, existingTrainer?: Trainer) => {
      const token = finalizeIdRef.current + 1
      finalizeIdRef.current = token
      modeRef.current = 'finalize'

      seedRef.current = seed
      seedIndexRef.current = (SEEDS.indexOf(seed) + 1) % SEEDS.length
      networkRef.current = nextNetwork
      trainerRef.current = existingTrainer ?? null
      decodedTextRef.current = TARGET_NAME
      activeOutputRef.current = null
      contextRef.current = [PAD_TOKEN, PAD_TOKEN, PAD_TOKEN]

      void (async () => {
        // Yield before any training work so hydration and first paint complete first.
        await yieldToMain()
        if (token !== finalizeIdRef.current) return

        const trainer = existingTrainer ?? createTrainer(nextNetwork)
        const initialPass = forward(nextNetwork, encodeContext([PAD_TOKEN, PAD_TOKEN, PAD_TOKEN]))
        const initialLoss = trainer.loss()
        trainerRef.current = trainer

        setNetwork(nextNetwork)
        setOutputText(TARGET_NAME)
        setRevealedCount(TARGET_NAME.length)
        setContext([PAD_TOKEN, PAD_TOKEN, PAD_TOKEN])
        setMetrics({
          loss: initialLoss,
          epoch: trainer.epoch,
          prediction: initialPass.prediction,
          confidence: initialPass.confidence,
        })
        setLossHistory([initialLoss])
        setFinalizing(true)
        setPhase('training')
        markNeuralState('done')

        // Let the completed name and finalizing state paint before the first chunk.
        await yieldToMain()
        if (token !== finalizeIdRef.current) return

        while (trainer.epoch < TOTAL_EPOCHS) {
          trainer.train(Math.min(FINALIZE_CHUNK_EPOCHS, TOTAL_EPOCHS - trainer.epoch))
          await yieldToMain()
          if (token !== finalizeIdRef.current) return
        }

        let decoded = trainer.decode()
        let attempts = 0
        while (decoded.text !== TARGET_NAME && attempts < 4) {
          const targetEpoch = trainer.epoch + 500
          while (trainer.epoch < targetEpoch) {
            trainer.train(Math.min(FINALIZE_CHUNK_EPOCHS, targetEpoch - trainer.epoch))
            await yieldToMain()
            if (token !== finalizeIdRef.current) return
          }
          decoded = trainer.decode()
          attempts += 1
        }

        if (token !== finalizeIdRef.current) return

        const lastStep = decoded.steps[decoded.steps.length - 1]
        const finalContext = lastStep?.contextTokens ?? [PAD_TOKEN, PAD_TOKEN, PAD_TOKEN]
        decodedTextRef.current = decoded.text
        activeOutputRef.current = EOS_TOKEN
        contextRef.current = finalContext
        setContext(finalContext)
        setOutputText(decoded.text)
        setRevealedCount(decoded.text.length)
        setMetrics({
          loss: trainer.loss(),
          epoch: trainer.epoch,
          prediction: EOS_TOKEN,
          confidence: lastStep?.confidence ?? 0,
        })
        setLossHistory([trainer.loss()])
        setFinalizing(false)
        setPhase('complete')
        persist(trainer, decoded.text)
        markNeuralState('done')
      })()
    },
    [persist],
  )

  useIsomorphicLayoutEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotionRef.current = media.matches
    setReducedMotion(media.matches)

    const cached = readCachedRun()
    if (cached) {
      const decoded = greedyDecode(cached.network)
      const lastStep = decoded.steps[decoded.steps.length - 1]
      networkRef.current = cached.network
      trainerRef.current = null
      seedRef.current = cached.seed
      seedIndexRef.current = (SEEDS.indexOf(cached.seed) + 1) % SEEDS.length
      decodedTextRef.current = TARGET_NAME
      activeOutputRef.current = EOS_TOKEN
      setNetwork(cached.network)
      setOutputText(TARGET_NAME)
      setRevealedCount(TARGET_NAME.length)
      setContext(lastStep?.contextTokens ?? [PAD_TOKEN, PAD_TOKEN, PAD_TOKEN])
      contextRef.current = lastStep?.contextTokens ?? [PAD_TOKEN, PAD_TOKEN, PAD_TOKEN]
      setMetrics({
        loss: cached.loss,
        epoch: cached.epochs,
        prediction: EOS_TOKEN,
        confidence: lastStep?.confidence ?? 0,
      })
      setLossHistory([])
      setFinalizing(false)
      setPhase('complete')
      markNeuralState('done')
      return
    }

    const seed = pickStartingSeed()
    if (media.matches) {
      finishAsync(seed, createCharNetwork(seed))
      return
    }

    startRun(seed)
  }, [finishAsync, startRun])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => {
      reducedMotionRef.current = media.matches
      setReducedMotion(media.matches)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!reducedMotion || phase === 'complete' || finalizing) return
    const currentNetwork = networkRef.current
    if (!currentNetwork) return
    finishAsync(seedRef.current, currentNetwork, trainerRef.current ?? undefined)
  }, [finalizing, finishAsync, phase, reducedMotion])

  useEffect(() => () => {
    finalizeIdRef.current += 1
  }, [])

  useEffect(() => {
    if (runId === 0 || reducedMotion || modeRef.current !== 'animate') return
    const currentNetwork = networkRef.current
    const trainer = trainerRef.current
    if (!currentNetwork || !trainer) return

    let frame = 0
    let cancelled = false
    let last = performance.now()
    let stage: RevealPhase = 'init'
    let stageElapsed = 0
    let metricClock = 0
    let decodeElapsed = 0
    let revealed = 0
    let characterSteps: DecodeStep[] = []
    let revealTimes: number[] = []
    let eosContext: number[] = [PAD_TOKEN, PAD_TOKEN, PAD_TOKEN]
    let eosTime = 0
    let endTime = 0

    const report = () => {
      const pass = forward(currentNetwork, encodeContext(contextRef.current))
      const loss = trainer.loss()
      setMetrics({
        loss,
        epoch: trainer.epoch,
        prediction: pass.prediction,
        confidence: pass.confidence,
      })
      setLossHistory((previous) => (previous.length >= 76 ? [...previous.slice(1), loss] : [...previous, loss]))
    }

    const enterDecode = (steps: DecodeStep[], text: string) => {
      characterSteps = steps.filter((step) => step.token !== EOS_TOKEN)
      decodeElapsed = 0
      revealed = 0
      const lastEos = steps[steps.length - 1]
      eosContext = lastEos?.contextTokens ?? eosContext
      revealTimes = []
      let cursor = DECODE_LEAD_MS
      for (let index = 0; index < characterSteps.length; index += 1) {
        revealTimes.push(cursor)
        cursor += characterSteps[index].token === 1 ? WORD_GAP_MS : CHARACTER_MS
      }
      eosTime = cursor + EOS_HOLD_MS
      endTime = eosTime + FINAL_HOLD_MS

      decodedTextRef.current = text
      setOutputText(text)
      setRevealedCount(0)
      setLossHistory((previous) => [...previous, trainer.loss()].slice(-76))
      if (characterSteps[0]) {
        setMetrics({
          loss: trainer.loss(),
          epoch: trainer.epoch,
          prediction: characterSteps[0].token,
          confidence: characterSteps[0].confidence,
        })
      } else if (lastEos) {
        setMetrics({
          loss: trainer.loss(),
          epoch: trainer.epoch,
          prediction: lastEos.token,
          confidence: lastEos.confidence,
        })
      }
      setPhase('decode')
      stage = 'decode'
    }

    const finish = () => {
      if (cancelled) return
      const finalLoss = trainer.loss()
      setRevealedCount(characterSteps.length)
      contextRef.current = eosContext
      setContext(eosContext)
      setMetrics((previous) => ({
        loss: finalLoss,
        epoch: trainer.epoch,
        prediction: EOS_TOKEN,
        confidence: previous?.confidence ?? 0,
      }))
      setLossHistory((previous) => [...previous, finalLoss].slice(-76))
      setPhase('complete')
      stage = 'complete'
      persist(trainer, decodedTextRef.current)
      markNeuralState('done')
    }

    const tick = (now: number) => {
      if (cancelled || modeRef.current !== 'animate') return
      const delta = Math.min(64, Math.max(0, now - last))
      last = now

      if (stage === 'init') {
        stageElapsed += delta
        if (stageElapsed >= INIT_MS) {
          stage = 'forward'
          stageElapsed = 0
          setPhase('forward')
        }
      } else if (stage === 'forward') {
        stageElapsed += delta
        if (stageElapsed >= FORWARD_MS) {
          stage = 'training'
          stageElapsed = 0
          metricClock = 0
          setPhase('training')
        }
      } else if (stage === 'training') {
        stageElapsed += delta
        const epochs = Math.min(TOTAL_EPOCHS, Math.floor((stageElapsed / TRAIN_MS) * TOTAL_EPOCHS))
        if (epochs > trainer.epoch) trainer.train(epochs - trainer.epoch)
        metricClock += delta
        if (metricClock >= 90) {
          metricClock = 0
          report()
        }

        if (stageElapsed >= TRAIN_MS) {
          if (trainer.epoch < TOTAL_EPOCHS) trainer.train(TOTAL_EPOCHS - trainer.epoch)
          let decoded = trainer.decode()
          let attempts = 0
          while (decoded.text !== TARGET_NAME && attempts < 4) {
            trainer.train(500)
            decoded = trainer.decode()
            attempts += 1
          }
          enterDecode(decoded.steps, decoded.text)
        }
      } else if (stage === 'decode') {
        decodeElapsed += delta
        let count = 0
        while (count < revealTimes.length && revealTimes[count] <= decodeElapsed) count += 1

        if (count !== revealed) {
          revealed = count
          const step = characterSteps[count - 1]
          setRevealedCount(revealed)
          if (step) {
            const nextContext = [...step.contextTokens]
            contextRef.current = nextContext
            setContext(nextContext)
            activeOutputRef.current = step.token
            setMetrics({
              loss: trainer.loss(),
              epoch: trainer.epoch,
              prediction: step.token,
              confidence: step.confidence,
            })
          }
        }

        if (decodeElapsed >= eosTime && activeOutputRef.current !== EOS_TOKEN) {
          activeOutputRef.current = EOS_TOKEN
          const eosStep = trainer.decode().steps
          const finalEos = eosStep[eosStep.length - 1]
          setMetrics((previous) => ({
            loss: trainer.loss(),
            epoch: trainer.epoch,
            prediction: EOS_TOKEN,
            confidence: finalEos?.confidence ?? previous?.confidence ?? 0,
          }))
        }

        if (decodeElapsed >= endTime) {
          finish()
          return
        }
      }

      if (stage !== 'complete') frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [persist, reducedMotion, runId])

  const replay = useCallback(() => {
    clearCachedRun()
    const seed = SEEDS[seedIndexRef.current % SEEDS.length]
    seedIndexRef.current = (seedIndexRef.current + 1) % SEEDS.length

    if (reducedMotionRef.current) {
      finishAsync(seed, createCharNetwork(seed))
      return
    }
    startRun(seed)
  }, [finishAsync, startRun])

  const skip = useCallback(() => {
    const currentNetwork = networkRef.current
    const trainer = trainerRef.current
    if (!currentNetwork || !trainer) return

    clearCachedRun()
    setRunId((value) => value + 1)
    finishAsync(seedRef.current, currentNetwork, trainer)
  }, [finishAsync])

  const predictionGlyph = metrics ? tokenGlyph(metrics.prediction) : '—'
  const predictionConfidence = metrics ? `${Math.round(metrics.confidence * 100)}%` : '—'
  const lossValue = metrics ? metrics.loss.toFixed(3) : '—'
  const epochValue = metrics ? metrics.epoch.toLocaleString('en-US') : '—'
  const isComplete = phase === 'complete' && !finalizing
  const stageLabel = finalizing ? 'finalizing · async' : STAGE_LABELS[phase]
  const stageShort = finalizing ? 'finalizing' : STAGE_SHORT[phase]

  return (
    <section className="hero hero--neural" id="home" aria-labelledby="hero-title">
      <div className="neural-atmosphere" aria-hidden="true">
        <div className="neural-atmosphere-grid" />
        <div className="neural-atmosphere-blue" />
        <div className="neural-atmosphere-violet" />
      </div>

      <div className="neural-hero-inner">
        <div className="neural-status-row">
          <p className="hero-status">Open to junior AI &amp; automation roles</p>
          <p className="neural-system-tag">
            <span aria-hidden="true">↳</span> char-level identity · computed locally
          </p>
        </div>

        <div className="hero-copy neural-copy">
          <div className="neural-output">
            <p className="neural-output-label">
              <span>decoded output</span>
              <span className="neural-output-state">{stageShort}</span>
            </p>
            <h1 className="neural-title" id="hero-title">
              <span className="neural-sr">Sudip Khatri</span>
              {NAME_LINES.map((line, lineIndex) => (
                <span
                  className={`neural-title-line neural-title-line--${lineIndex === 0 ? 'first' : 'second'}`}
                  data-ghost={line.characters.join('')}
                  aria-hidden="true"
                  key={line.offset}
                >
                  {line.characters.map((fallback, characterIndex) => {
                    const nameIndex = line.offset + characterIndex
                    const character = outputText[nameIndex] ?? fallback
                    return (
                      <span
                        className={`neural-title-char${revealedCount > nameIndex ? ' is-revealed' : ''}`}
                        key={`${nameIndex}-${character}`}
                      >
                        {character}
                      </span>
                    )
                  })}
                </span>
              ))}
            </h1>
          </div>

          <p className="hero-role neural-role">
            AI Engineer <span className="neural-role-divider" aria-hidden="true">|</span> Python Developer
          </p>

          <p className="hero-intro neural-intro">
            I build LLM-powered systems, retrieval pipelines, and the reliable Python backends behind them.
          </p>

          <div className="hero-actions neural-actions">
            <a className="btn btn-primary" href="#projects">
              Explore my work <span aria-hidden="true">↗</span>
            </a>
            <a className="btn btn-secondary" href="/sudip-khatri-cv.pdf" target="_blank" rel="noreferrer">
              View CV <span className="btn-tag">PDF</span>
            </a>
            <a className="link-arrow" href="#contact">
              Contact me <span aria-hidden="true">↗</span>
            </a>
          </div>

          <div className="hero-socials neural-socials">
            <a href="https://github.com/subtlegrain" target="_blank" rel="noreferrer">
              GitHub <small>subtlegrain</small>
            </a>
            <a href="https://linkedin.com/in/sudip-khatri-993b40240" target="_blank" rel="noreferrer">
              LinkedIn <small>Sudip Khatri</small>
            </a>
          </div>
        </div>

        <div className="neural-panel" data-stage={phase} data-complete={isComplete ? 'true' : 'false'}>
          <div className="neural-panel-head">
            <span className="neural-panel-title">
              char-mlp <span>3 · 24 · 16 · 13</span>
            </span>
            <span className="neural-stage" role="status" aria-live="polite">
              {stageLabel}
            </span>
          </div>
          <div className="neural-progress" aria-hidden="true">
            <span className="neural-progress-fill" />
          </div>

          <div className="neural-input-row">
            <span className="neural-input-name">x = [</span>
            {context.map((token, index) => (
              <span className="neural-token" key={`${index}-${token}`}>
                <span className="neural-token-glyph">{tokenGlyph(token)}</span>
                <span className="neural-token-value">{tokenValue(token).toFixed(2)}</span>
              </span>
            ))}
            <span className="neural-input-name">]</span>
            <span className="neural-input-note">ordinal context · {CONTEXT_SIZE}</span>
          </div>

          <div
            className="neural-canvas-wrap"
            role="img"
            aria-label="An animated three-layer character network learning to output the name Sudip Khatri."
          >
            <NeuralGraph
              network={network}
              phase={phase}
              reducedMotion={reducedMotion}
              contextRef={contextRef}
              activeOutputRef={activeOutputRef}
            />
          </div>

          <div className="neural-metrics">
            <div className="neural-metric neural-metric--loss">
              <span className="neural-metric-label">loss</span>
              <span className="neural-metric-value">{lossValue}</span>
              <LossSparkline values={lossHistory} />
            </div>
            <div className="neural-metric">
              <span className="neural-metric-label">epoch</span>
              <span className="neural-metric-value">{epochValue}</span>
            </div>
            <div className="neural-metric">
              <span className="neural-metric-label">argmax</span>
              <span className="neural-metric-value neural-argmax">
                {predictionGlyph} <small>{predictionConfidence}</small>
              </span>
            </div>
          </div>

          <div className="neural-panel-foot">
            <span className="neural-model-note">full batch · lr {LEARNING_RATE} · {TOTAL_EPOCHS} epochs</span>
            <div className="neural-foot-actions">
              {isComplete ? (
                <button className="neural-replay" type="button" onClick={replay}>
                  <RotateCcw size={11} aria-hidden="true" />
                  Replay sequence
                </button>
              ) : finalizing ? (
                <span className="neural-running" aria-hidden="true">
                  <i /> finalizing
                </span>
              ) : (
                <>
                  <span className="neural-running" aria-hidden="true">
                    <i /> computing
                  </span>
                  <button className="neural-skip" type="button" onClick={skip}>
                    <SkipForward size={11} aria-hidden="true" />
                    Skip animation
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <a className="scroll-cue neural-scroll" href="#about">
        <span aria-hidden="true">↓</span> Scroll to explore
      </a>
    </section>
  )
}

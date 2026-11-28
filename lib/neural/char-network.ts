/**
 * A small character-level multilayer perceptron.
 *
 * The model sees the previous three characters of a sequence (ordinal encoded)
 * and learns to predict the next character. It is trained here in the browser
 * with full-batch backpropagation and Adam. No pretrained weights, no ML
 * runtime, no recorded animation: every probability and loss value shown in the
 * hero comes from this file.
 */

export const TARGET_NAME = 'SUDIP KHATRI'
export const CONTEXT_SIZE = 3
export const HIDDEN_SIZES = [24, 16] as const
export const LEARNING_RATE = 0.0005
export const TOTAL_EPOCHS = 2000

export const VOCAB = [
  '<pad>',
  ' ',
  'A',
  'D',
  'H',
  'I',
  'K',
  'P',
  'R',
  'S',
  'T',
  'U',
  '<eos>',
] as const

export const VOCAB_SIZE = VOCAB.length
export const PAD_TOKEN = 0
export const EOS_TOKEN = VOCAB_SIZE - 1

export type RevealPhase = 'init' | 'forward' | 'training' | 'decode' | 'complete'

export type DenseLayer = {
  weights: number[][]
  biases: number[]
}

export type CharNetwork = {
  /** [input, hidden 1, hidden 2, output] */
  architecture: [number, number, number, number]
  layers: [DenseLayer, DenseLayer, DenseLayer]
}

export type ForwardPass = {
  input: number[]
  hidden1: number[]
  hidden2: number[]
  logits: number[]
  probabilities: number[]
  prediction: number
  confidence: number
}

export type DecodeStep = {
  /** Tokens used as the input for this prediction. */
  contextTokens: number[]
  /** The token the network selected. */
  token: number
  /** Printable glyph used by the interface. */
  glyph: string
  confidence: number
}

export type DecodeResult = {
  text: string
  steps: DecodeStep[]
  reachedEnd: boolean
}

export type Trainer = {
  network: CharNetwork
  readonly epoch: number
  train(epochs: number): number
  loss(): number
  decode(): DecodeResult
}

export type CachedRun = {
  version: 1
  seed: number
  epochs: number
  loss: number
  decoded: string
  network: CharNetwork
}

const CHAR_TO_TOKEN = new Map<string, number>(VOCAB.map((token, index) => [token, index]))

const TARGET_TOKENS = Array.from(TARGET_NAME, (character) => {
  const token = CHAR_TO_TOKEN.get(character)
  if (token === undefined) throw new Error(`Unsupported character in target: ${character}`)
  return token
})

const TRAINING_SEQUENCE = [...TARGET_TOKENS, EOS_TOKEN]

type TrainingSample = {
  context: number[]
  target: number
}

const TRAINING_SAMPLES: TrainingSample[] = TRAINING_SEQUENCE.map((target, index) => {
  const context: number[] = []
  for (let offset = CONTEXT_SIZE - 1; offset >= 0; offset -= 1) {
    const source = index - offset - 1
    context.push(source < 0 ? PAD_TOKEN : TRAINING_SEQUENCE[source])
  }
  return { context, target }
})

const INITIAL_LOSS = Math.log(VOCAB_SIZE)

/** Small deterministic PRNG so a cache can reproduce the same model. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function createLayer(random: () => number, size: number, inputSize: number): DenseLayer {
  const limit = Math.sqrt(6 / (size + inputSize))
  return {
    weights: Array.from({ length: size }, () =>
      Array.from({ length: inputSize }, () => (random() * 2 - 1) * limit),
    ),
    // Zero biases are a standard starting point and keep the initial network
    // symmetric enough to see the first loss clearly.
    biases: Array.from({ length: size }, () => 0),
  }
}

export function createCharNetwork(seed: number): CharNetwork {
  const random = mulberry32(seed)
  return {
    architecture: [CONTEXT_SIZE, HIDDEN_SIZES[0], HIDDEN_SIZES[1], VOCAB_SIZE],
    layers: [
      createLayer(random, HIDDEN_SIZES[0], CONTEXT_SIZE),
      createLayer(random, HIDDEN_SIZES[1], HIDDEN_SIZES[0]),
      createLayer(random, VOCAB_SIZE, HIDDEN_SIZES[1]),
    ],
  }
}

/** Numeric input representation: each token's vocabulary position in [0, 1]. */
export function encodeContext(tokens: readonly number[]): number[] {
  const context: number[] = []
  for (let index = 0; index < CONTEXT_SIZE; index += 1) {
    const source = tokens[tokens.length - CONTEXT_SIZE + index]
    context.push((source === undefined ? PAD_TOKEN : source) / (VOCAB_SIZE - 1))
  }
  return context
}

function denseForward(layer: DenseLayer, input: number[], activation: (value: number) => number): number[] {
  return layer.weights.map((row, rowIndex) => {
    let sum = layer.biases[rowIndex]
    for (let index = 0; index < row.length; index += 1) sum += row[index] * input[index]
    return activation(sum)
  })
}

function denseLogits(layer: DenseLayer, input: number[]): number[] {
  return layer.weights.map((row, rowIndex) => {
    let sum = layer.biases[rowIndex]
    for (let index = 0; index < row.length; index += 1) sum += row[index] * input[index]
    return sum
  })
}

function softmax(logits: number[]): number[] {
  let maximum = -Infinity
  for (const value of logits) if (value > maximum) maximum = value
  let total = 0
  const probabilities = logits.map((value) => {
    const exponent = Math.exp(value - maximum)
    total += exponent
    return exponent
  })
  return probabilities.map((value) => value / total)
}

function argmax(values: readonly number[]): number {
  let best = 0
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] > values[best]) best = index
  }
  return best
}

export function forward(network: CharNetwork, input: number[]): ForwardPass {
  const hidden1 = denseForward(network.layers[0], input, Math.tanh)
  const hidden2 = denseForward(network.layers[1], hidden1, Math.tanh)
  const logits = denseLogits(network.layers[2], hidden2)
  const probabilities = softmax(logits)
  const prediction = argmax(probabilities)
  return {
    input,
    hidden1,
    hidden2,
    logits,
    probabilities,
    prediction,
    confidence: probabilities[prediction],
  }
}

export function getDatasetLoss(network: CharNetwork): number {
  let loss = 0
  for (const sample of TRAINING_SAMPLES) {
    const pass = forward(network, encodeContext(sample.context))
    loss -= Math.log(Math.max(pass.probabilities[sample.target], 1e-12))
  }
  return loss / TRAINING_SAMPLES.length
}

export function tokenGlyph(token: number): string {
  if (token === PAD_TOKEN) return '∅'
  if (token === EOS_TOKEN) return '∎'
  const value = VOCAB[token] ?? ''
  return value === ' ' ? '␣' : value
}

export function tokenValue(token: number): number {
  return token / (VOCAB_SIZE - 1)
}

export function greedyDecode(network: CharNetwork, maximumSteps = 24): DecodeResult {
  let contextTokens = [PAD_TOKEN, PAD_TOKEN, PAD_TOKEN]
  const steps: DecodeStep[] = []
  let text = ''

  for (let index = 0; index < maximumSteps; index += 1) {
    const pass = forward(network, encodeContext(contextTokens))
    const token = pass.prediction
    steps.push({
      contextTokens: [...contextTokens],
      token,
      glyph: tokenGlyph(token),
      confidence: pass.confidence,
    })

    if (token === EOS_TOKEN) {
      return { text, steps, reachedEnd: true }
    }
    if (token === PAD_TOKEN) {
      return { text, steps, reachedEnd: false }
    }

    text += VOCAB[token]
    contextTokens = [contextTokens[1], contextTokens[2], token]
  }

  return { text, steps, reachedEnd: false }
}

/**
 * Full-batch Adam training. One call to `train` performs that many complete
 * passes over the 13 training characters and returns the final mean loss.
 */
export function createTrainer(network: CharNetwork, learningRate = LEARNING_RATE): Trainer {
  const layerCount = network.layers.length
  const moment = new Float64Array(
    network.layers.reduce((total, layer) => total + layer.weights.length * layer.weights[0].length + layer.biases.length, 0),
  )
  const velocity = new Float64Array(moment.length)
  let epoch = 0
  let lastLoss = getDatasetLoss(network)

  const loss = () => getDatasetLoss(network)

  const trainOneEpoch = (): number => {
    const gradients = network.layers.map((layer) => ({
      weights: layer.weights.map((row) => row.map(() => 0)),
      biases: layer.biases.map(() => 0),
    }))
    let epochLoss = 0

    for (const sample of TRAINING_SAMPLES) {
      const pass = forward(network, encodeContext(sample.context))
      epochLoss -= Math.log(Math.max(pass.probabilities[sample.target], 1e-12))

      // Output layer error: softmax probability minus one-hot target.
      const outputDelta = pass.probabilities.slice()
      outputDelta[sample.target] -= 1

      for (let output = 0; output < VOCAB_SIZE; output += 1) {
        gradients[2].biases[output] += outputDelta[output]
        for (let hidden = 0; hidden < HIDDEN_SIZES[1]; hidden += 1) {
          gradients[2].weights[output][hidden] += outputDelta[output] * pass.hidden2[hidden]
        }
      }

      // Second hidden layer error, backpropagated through tanh.
      const hidden2Delta = Array.from({ length: HIDDEN_SIZES[1] }, (_, hidden) => {
        let sum = 0
        for (let output = 0; output < VOCAB_SIZE; output += 1) {
          sum += outputDelta[output] * network.layers[2].weights[output][hidden]
        }
        return sum * (1 - pass.hidden2[hidden] * pass.hidden2[hidden])
      })

      for (let hidden = 0; hidden < HIDDEN_SIZES[1]; hidden += 1) {
        gradients[1].biases[hidden] += hidden2Delta[hidden]
        for (let previous = 0; previous < HIDDEN_SIZES[0]; previous += 1) {
          gradients[1].weights[hidden][previous] += hidden2Delta[hidden] * pass.hidden1[previous]
        }
      }

      // First hidden layer error.
      const hidden1Delta = Array.from({ length: HIDDEN_SIZES[0] }, (_, hidden) => {
        let sum = 0
        for (let next = 0; next < HIDDEN_SIZES[1]; next += 1) {
          sum += hidden2Delta[next] * network.layers[1].weights[next][hidden]
        }
        return sum * (1 - pass.hidden1[hidden] * pass.hidden1[hidden])
      })

      for (let hidden = 0; hidden < HIDDEN_SIZES[0]; hidden += 1) {
        gradients[0].biases[hidden] += hidden1Delta[hidden]
        for (let inputIndex = 0; inputIndex < CONTEXT_SIZE; inputIndex += 1) {
          gradients[0].weights[hidden][inputIndex] += hidden1Delta[hidden] * pass.input[inputIndex]
        }
      }
    }

    epoch += 1
    const beta1 = 0.9
    const beta2 = 0.999
    const beta1Correction = 1 - Math.pow(beta1, epoch)
    const beta2Correction = 1 - Math.pow(beta2, epoch)
    let parameterIndex = 0

    for (let layerIndex = 0; layerIndex < layerCount; layerIndex += 1) {
      const layer = network.layers[layerIndex]
      const gradient = gradients[layerIndex]

      for (let row = 0; row < layer.weights.length; row += 1) {
        for (let column = 0; column < layer.weights[row].length; column += 1) {
          const value = gradient.weights[row][column] / TRAINING_SAMPLES.length
          moment[parameterIndex] = beta1 * moment[parameterIndex] + (1 - beta1) * value
          velocity[parameterIndex] = beta2 * velocity[parameterIndex] + (1 - beta2) * value * value
          const correctedMoment = moment[parameterIndex] / beta1Correction
          const correctedVelocity = velocity[parameterIndex] / beta2Correction
          layer.weights[row][column] -=
            (learningRate * correctedMoment) / (Math.sqrt(correctedVelocity) + 1e-8)
          parameterIndex += 1
        }
      }

      for (let bias = 0; bias < layer.biases.length; bias += 1) {
        const value = gradient.biases[bias] / TRAINING_SAMPLES.length
        moment[parameterIndex] = beta1 * moment[parameterIndex] + (1 - beta1) * value
        velocity[parameterIndex] = beta2 * velocity[parameterIndex] + (1 - beta2) * value * value
        const correctedMoment = moment[parameterIndex] / beta1Correction
        const correctedVelocity = velocity[parameterIndex] / beta2Correction
        layer.biases[bias] -=
          (learningRate * correctedMoment) / (Math.sqrt(correctedVelocity) + 1e-8)
        parameterIndex += 1
      }
    }

    return epochLoss / TRAINING_SAMPLES.length
  }

  return {
    network,
    get epoch() {
      return epoch
    },
    train(epochs: number) {
      const count = Math.max(0, Math.floor(epochs))
      for (let index = 0; index < count; index += 1) lastLoss = trainOneEpoch()
      return lastLoss
    },
    loss,
    decode: () => greedyDecode(network),
  }
}

function isFiniteMatrix(value: unknown): value is number[][] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (row) => Array.isArray(row) && row.length > 0 && row.every((item) => typeof item === 'number' && Number.isFinite(item)),
    )
  )
}

function isFiniteVector(value: unknown): value is number[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'number' && Number.isFinite(item))
}

export function isCharNetwork(value: unknown): value is CharNetwork {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<CharNetwork>
  if (!Array.isArray(candidate.architecture) || candidate.architecture.length !== 4) return false
  if (!Array.isArray(candidate.layers) || candidate.layers.length !== 3) return false
  if (candidate.architecture[0] !== CONTEXT_SIZE || candidate.architecture[3] !== VOCAB_SIZE) return false

  const expected = candidate.architecture
  const layers = candidate.layers as DenseLayer[]
  return layers.every((layer, index) => {
    if (!layer || typeof layer !== 'object') return false
    if (!isFiniteMatrix(layer.weights) || !isFiniteVector(layer.biases)) return false
    if (layer.weights.length !== expected[index + 1] || layer.biases.length !== expected[index + 1]) return false
    return layer.weights.every((row) => row.length === expected[index])
  })
}

export function isCachedRun(value: unknown): value is CachedRun {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<CachedRun>
  return (
    candidate.version === 1 &&
    typeof candidate.seed === 'number' &&
    Number.isFinite(candidate.epochs) &&
    typeof candidate.loss === 'number' &&
    Number.isFinite(candidate.loss) &&
    typeof candidate.decoded === 'string' &&
    isCharNetwork(candidate.network)
  )
}

export { INITIAL_LOSS, TARGET_TOKENS, TRAINING_SEQUENCE }

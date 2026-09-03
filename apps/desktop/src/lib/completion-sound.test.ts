import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/audio-context', () => ({ getAudioContext: vi.fn() }))

import { getAudioContext } from '@/lib/audio-context'

import { previewCompletionSound } from './completion-sound'

class FakeParam {
  exponentialRampToValueAtTime = vi.fn()
  setValueAtTime = vi.fn()
}

class FakeAudioNode {
  connect = vi.fn()
}

class FakeGain extends FakeAudioNode {
  gain = new FakeParam()
}

class FakeOscillator extends FakeAudioNode {
  detune = new FakeParam()
  frequency = new FakeParam()
  start = vi.fn()
  stop = vi.fn()
  type = 'sine'
}

class FakeBiquadFilter extends FakeAudioNode {
  frequency = new FakeParam()
  Q = new FakeParam()
  type = 'lowpass'
}

class FakeConvolver extends FakeAudioNode {
  buffer: AudioBuffer | null = null
}

class FakeAudioContext {
  currentTime = 1
  destination = {}
  sampleRate = 10
  gains: FakeGain[] = []

  createBiquadFilter() {
    return new FakeBiquadFilter()
  }

  createBuffer(channels: number, length: number) {
    const data = Array.from({ length: channels }, () => new Float32Array(length))

    return { getChannelData: (channel: number) => data[channel] }
  }

  createConvolver() {
    return new FakeConvolver()
  }

  createGain() {
    const gain = new FakeGain()
    this.gains.push(gain)

    return gain
  }

  createOscillator() {
    return new FakeOscillator()
  }
}

describe('completion-sound output gain', () => {
  let context: FakeAudioContext

  beforeEach(() => {
    context = new FakeAudioContext()
    vi.mocked(getAudioContext).mockReturnValue(context as unknown as AudioContext)
  })

  it('keeps the cue audible with headroom and a dry-dominant mix', () => {
    previewCompletionSound(1)

    const [master, dry, wet] = context.gains
    const masterGain = master.gain.setValueAtTime.mock.calls[0][0]
    const dryGain = dry.gain.setValueAtTime.mock.calls[0][0]
    const wetGain = wet.gain.setValueAtTime.mock.calls[0][0]

    expect(masterGain).toBeGreaterThanOrEqual(0.75)
    expect(masterGain).toBeLessThan(1)
    expect(dryGain).toBeGreaterThan(wetGain)
  })
})

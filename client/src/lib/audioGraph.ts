let audioContext: AudioContext | null = null;

/**
 * Returns the shared AudioContext singleton, creating it lazily on first call.
 * The context may start in a "suspended" state on iOS/Safari and must be
 * resumed inside a user-gesture handler (e.g. before audio.play()).
 */
export function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

/**
 * Manages the Web Audio graph for a single LiveATC audio stream.
 *
 * Signal chain:
 *   MediaElementAudioSourceNode → [BiquadFilterNode] → GainNode → destination
 *
 * Optional taps:
 *   - AnalyserNode (from source, for silence detection)
 *   - MediaStreamAudioDestinationNode (from gain, for recording)
 */
export class StreamAudioGraph {
  private ctx: AudioContext;
  private source: MediaElementAudioSourceNode;
  private gain: GainNode;
  private panner: StereoPannerNode;
  private filter: BiquadFilterNode | null = null;
  private analyser: AnalyserNode | null = null;
  private recordingDest: MediaStreamAudioDestinationNode | null = null;

  constructor(element: HTMLAudioElement) {
    this.ctx = getAudioContext();
    this.source = this.ctx.createMediaElementSource(element);
    this.gain = this.ctx.createGain();
    this.panner = this.ctx.createStereoPanner();

    // Default chain: source → gain → panner → destination
    this.source.connect(this.gain);
    this.gain.connect(this.panner);
    this.panner.connect(this.ctx.destination);
  }

  /** Set the output volume (0 – 1+). */
  setGain(value: number): void {
    this.gain.gain.value = value;
  }

  /** Set stereo pan (-1 = full left, 0 = center, 1 = full right). */
  setPan(value: number): void {
    this.panner.pan.value = Math.max(-1, Math.min(1, value));
  }

  /**
   * Insert a BiquadFilterNode between the source and the gain node.
   * If a filter already exists it is replaced.
   */
  insertFilter(type: BiquadFilterType, frequency: number): void {
    // Remove any existing filter first
    this.removeFilter();

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = type;
    this.filter.frequency.value = frequency;

    // Rewire: source → filter → gain
    this.source.disconnect(this.gain);
    this.source.connect(this.filter);
    this.filter.connect(this.gain);
  }

  /** Remove the current filter (if any) and reconnect source directly to gain. */
  removeFilter(): void {
    if (!this.filter) return;

    this.source.disconnect(this.filter);
    this.filter.disconnect(this.gain);
    this.filter = null;

    this.source.connect(this.gain);
  }

  /**
   * Return a MediaStream tapped from the gain node, suitable for
   * MediaRecorder-based recording.  The destination is created once and reused.
   */
  getRecordingStream(): MediaStream {
    if (!this.recordingDest) {
      this.recordingDest = this.ctx.createMediaStreamDestination();
      this.panner.connect(this.recordingDest);
    }
    return this.recordingDest.stream;
  }

  /**
   * Return an AnalyserNode tapped from the source node (pre-gain),
   * useful for silence / activity detection.  Created once and reused.
   */
  getAnalyserNode(): AnalyserNode {
    if (!this.analyser) {
      this.analyser = this.ctx.createAnalyser();
      this.source.connect(this.analyser);
    }
    return this.analyser;
  }

  /** Disconnect and release every node in the graph. */
  disconnect(): void {
    try {
      this.source.disconnect();
    } catch {
      // already disconnected
    }

    if (this.filter) {
      try { this.filter.disconnect(); } catch { /* noop */ }
      this.filter = null;
    }

    if (this.analyser) {
      try { this.analyser.disconnect(); } catch { /* noop */ }
      this.analyser = null;
    }

    if (this.recordingDest) {
      try { this.panner.disconnect(this.recordingDest); } catch { /* noop */ }
      this.recordingDest = null;
    }

    try {
      this.gain.disconnect();
    } catch {
      // already disconnected
    }

    try {
      this.panner.disconnect();
    } catch {
      // already disconnected
    }
  }
}

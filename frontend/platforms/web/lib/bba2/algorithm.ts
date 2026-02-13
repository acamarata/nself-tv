/**
 * BBA-2 (Buffer-Based Approach v2) adaptive bitrate algorithm.
 *
 * Selects video quality levels based on current buffer occupancy,
 * with dwell-time constraints and seek-aware behavior.
 */

export enum BufferZone {
  EMERGENCY = 'emergency',
  STARTUP = 'startup',
  RAMP = 'ramp',
  STEADY = 'steady',
  FULL = 'full',
}

export interface BBA2Config {
  /** Buffer length thresholds (in seconds) for each zone boundary. */
  bufferThresholds: {
    emergency: number;
    startup: number;
    ramp: number;
    steady: number;
  };
  /** Target buffer length in seconds (upper bound of STEADY zone). */
  targetBuffer: number;
  /** Minimum time in seconds to dwell at current quality before upgrading. */
  minDwellTime: number;
}

export interface QualityLevel {
  /** Index in the quality level array (0 = lowest). */
  index: number;
  /** Bitrate in bits per second. */
  bitrate: number;
  /** Video width in pixels. */
  width: number;
  /** Video height in pixels. */
  height: number;
  /** Human-readable name (e.g. "720p", "1080p"). */
  name: string;
}

export interface BBA2State {
  /** Current quality level index. */
  currentLevel: number;
  /** Current buffer zone classification. */
  currentZone: BufferZone;
  /** Current buffer length in seconds. */
  bufferLength: number;
  /** Timestamp (ms) when current quality level was selected. */
  dwellStartTime: number;
  /** Timestamp (ms) of the last quality change. */
  lastQualityChange: number;
  /** Whether a seek operation is in progress. */
  isSeekPending: boolean;
  /** Quality level before seek started; null if no seek context saved. */
  preSeekLevel: number | null;
}

const DEFAULT_CONFIG: BBA2Config = {
  bufferThresholds: {
    emergency: 5,
    startup: 15,
    ramp: 30,
    steady: 60,
  },
  targetBuffer: 60,
  minDwellTime: 10,
};

/**
 * BBA-2 adaptive bitrate selection algorithm.
 *
 * Zones (by buffer length in seconds):
 * - EMERGENCY: 0-5s   -> drop to lowest quality
 * - STARTUP:   5-15s  -> cautious ramp (max current+1, capped at 2)
 * - RAMP:      15-30s -> moderate ramp (max current+2, up to max)
 * - STEADY:    30-60s -> optimal quality based on buffer ratio
 * - FULL:      60s+   -> maximum available quality
 */
export class BBA2Algorithm {
  private config: BBA2Config;
  private state: BBA2State;
  private qualityLevels: QualityLevel[];

  constructor(qualityLevels: QualityLevel[], config?: Partial<BBA2Config>) {
    this.qualityLevels = qualityLevels;
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      bufferThresholds: {
        ...DEFAULT_CONFIG.bufferThresholds,
        ...(config?.bufferThresholds ?? {}),
      },
    };

    const now = Date.now();
    this.state = {
      currentLevel: 0,
      currentZone: BufferZone.EMERGENCY,
      bufferLength: 0,
      dwellStartTime: now,
      lastQualityChange: now,
      isSeekPending: false,
      preSeekLevel: null,
    };
  }

  /**
   * Updates the algorithm with the current buffer length and returns
   * the recommended quality level index.
   *
   * @param bufferLength - Current buffer length in seconds
   * @param isSeekPending - Whether a seek operation is currently pending
   * @returns Recommended quality level index
   */
  public update(bufferLength: number, isSeekPending?: boolean): number {
    this.state.bufferLength = bufferLength;

    if (isSeekPending !== undefined && isSeekPending !== this.state.isSeekPending) {
      if (isSeekPending) {
        this.state.preSeekLevel = this.state.currentLevel;
        const dropLevel = Math.max(0, this.state.currentLevel - 1);
        this.changeQuality(dropLevel);
        this.state.isSeekPending = true;
        return this.state.currentLevel;
      } else {
        this.state.isSeekPending = false;
        if (this.state.preSeekLevel !== null) {
          this.changeQuality(this.state.preSeekLevel);
          this.state.preSeekLevel = null;
        }
        return this.state.currentLevel;
      }
    }

    if (this.state.isSeekPending) {
      return this.state.currentLevel;
    }

    const zone = this.determineZone(bufferLength);
    this.state.currentZone = zone;

    const targetLevel = this.selectQualityForZone(zone);

    if (targetLevel < this.state.currentLevel) {
      this.changeQuality(targetLevel);
    } else if (targetLevel > this.state.currentLevel) {
      const dwellElapsed = Date.now() - this.state.dwellStartTime;
      if (dwellElapsed >= this.config.minDwellTime * 1000) {
        this.changeQuality(targetLevel);
      }
    }

    return this.state.currentLevel;
  }

  /**
   * Returns the current quality level index.
   */
  public getCurrentLevel(): number {
    return this.state.currentLevel;
  }

  /**
   * Returns a read-only snapshot of the current algorithm state.
   */
  public getState(): Readonly<BBA2State> {
    return { ...this.state };
  }

  /**
   * Determines which buffer zone the current buffer length falls into.
   */
  private determineZone(bufferLength: number): BufferZone {
    const { emergency, startup, ramp, steady } = this.config.bufferThresholds;

    if (bufferLength < emergency) {
      return BufferZone.EMERGENCY;
    }
    if (bufferLength < startup) {
      return BufferZone.STARTUP;
    }
    if (bufferLength < ramp) {
      return BufferZone.RAMP;
    }
    if (bufferLength < steady) {
      return BufferZone.STEADY;
    }
    return BufferZone.FULL;
  }

  /**
   * Selects the target quality level for the given buffer zone.
   */
  private selectQualityForZone(zone: BufferZone): number {
    const maxLevel = this.qualityLevels.length - 1;

    switch (zone) {
      case BufferZone.EMERGENCY:
        return 0;

      case BufferZone.STARTUP:
        return Math.min(this.state.currentLevel + 1, 2, maxLevel);

      case BufferZone.RAMP:
        return Math.min(this.state.currentLevel + 2, maxLevel);

      case BufferZone.STEADY:
        return this.calculateOptimalQuality();

      case BufferZone.FULL:
        return maxLevel;

      default:
        return this.state.currentLevel;
    }
  }

  /**
   * Calculates the optimal quality level in the STEADY zone based on
   * the ratio of current buffer to target buffer.
   */
  private calculateOptimalQuality(): number {
    const maxLevel = this.qualityLevels.length - 1;
    if (maxLevel <= 0) {
      return 0;
    }

    const { ramp } = this.config.bufferThresholds;
    const range = this.config.targetBuffer - ramp;

    if (range <= 0) {
      return this.state.currentLevel;
    }

    const ratio = Math.min(1, Math.max(0, (this.state.bufferLength - ramp) / range));
    return Math.round(ratio * maxLevel);
  }

  /**
   * Applies a quality level change and resets the dwell timer.
   */
  private changeQuality(level: number): void {
    const clamped = Math.max(0, Math.min(level, this.qualityLevels.length - 1));
    if (clamped !== this.state.currentLevel) {
      this.state.currentLevel = clamped;
      const now = Date.now();
      this.state.dwellStartTime = now;
      this.state.lastQualityChange = now;
    }
  }
}

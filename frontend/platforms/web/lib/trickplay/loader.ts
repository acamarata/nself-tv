export interface TrickplayConfig {
  /** URL to the WebVTT file mapping timestamps to sprite tiles */
  vttUrl: string;
  /** Base URL prepended to sprite filenames found in the VTT */
  spriteBaseUrl: string;
  /** Width of each tile in pixels */
  tileWidth: number;
  /** Height of each tile in pixels */
  tileHeight: number;
  /** Number of tile columns per sprite image */
  gridColumns: number;
  /** Number of tile rows per sprite image */
  gridRows: number;
}

export interface TrickplayCue {
  /** Start time in seconds */
  startTime: number;
  /** End time in seconds */
  endTime: number;
  /** Full URL to the sprite image */
  spriteUrl: string;
  /** X offset within the sprite in pixels */
  x: number;
  /** Y offset within the sprite in pixels */
  y: number;
}

/**
 * Loads and parses trickplay (thumbnail preview) data from a WebVTT file.
 *
 * Trickplay VTT files map timestamp ranges to regions within sprite sheet images,
 * enabling seek-scrub thumbnail previews. The VTT format expected:
 *
 * ```
 * WEBVTT
 *
 * 00:00:00.000 --> 00:00:05.000
 * sprite_0.jpg#xywh=0,0,320,180
 *
 * 00:00:05.000 --> 00:00:10.000
 * sprite_0.jpg#xywh=320,0,320,180
 * ```
 */
export class TrickplayLoader {
  private config: TrickplayConfig;
  private cues: TrickplayCue[] = [];
  private _loaded = false;
  private loading: Promise<void> | null = null;

  constructor(config: TrickplayConfig) {
    this.config = config;
  }

  /**
   * Fetches and parses the VTT file. Safe to call multiple times;
   * subsequent calls return the same promise or resolve immediately.
   */
  async load(): Promise<void> {
    if (this._loaded) return;
    if (this.loading) return this.loading;

    this.loading = (async () => {
      const response = await fetch(this.config.vttUrl);
      if (!response.ok) {
        throw new Error(`Failed to load trickplay VTT: ${response.status} ${response.statusText}`);
      }
      const vttText = await response.text();
      this.cues = this.parseVTT(vttText);
      this._loaded = true;
    })();

    return this.loading;
  }

  /**
   * Parses WebVTT text into an array of trickplay cues.
   *
   * Expected format per cue block:
   *   HH:MM:SS.mmm --> HH:MM:SS.mmm
   *   filename.jpg#xywh=x,y,w,h
   */
  private parseVTT(vttText: string): TrickplayCue[] {
    const result: TrickplayCue[] = [];
    const lines = vttText.split(/\r?\n/);

    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();

      // Look for timestamp lines containing "-->"
      if (line.includes('-->')) {
        const [startStr, endStr] = line.split('-->').map((s) => s.trim());
        const startTime = this.parseTimestamp(startStr);
        const endTime = this.parseTimestamp(endStr);

        // Next non-empty line has the sprite reference
        i++;
        while (i < lines.length && lines[i].trim() === '') {
          i++;
        }

        if (i < lines.length) {
          const spriteLine = lines[i].trim();
          const hashIndex = spriteLine.indexOf('#xywh=');

          if (hashIndex !== -1) {
            const filename = spriteLine.substring(0, hashIndex);
            const coords = spriteLine.substring(hashIndex + 6).split(',').map(Number);

            if (coords.length >= 2) {
              const spriteUrl = this.config.spriteBaseUrl.endsWith('/')
                ? `${this.config.spriteBaseUrl}${filename}`
                : `${this.config.spriteBaseUrl}/${filename}`;

              result.push({
                startTime,
                endTime,
                spriteUrl,
                x: coords[0],
                y: coords[1],
              });
            }
          }
        }
      }

      i++;
    }

    return result;
  }

  /**
   * Parses a VTT timestamp string to seconds.
   *
   * @param ts - Timestamp in "HH:MM:SS.mmm" or "MM:SS.mmm" format
   * @returns Time in seconds
   */
  private parseTimestamp(ts: string): number {
    const parts = ts.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      const seconds = parseFloat(parts[2]);
      return hours * 3600 + minutes * 60 + seconds;
    }
    if (parts.length === 2) {
      const minutes = parseInt(parts[0], 10);
      const seconds = parseFloat(parts[1]);
      return minutes * 60 + seconds;
    }
    return 0;
  }

  /**
   * Finds the cue whose time range contains the given time.
   *
   * @param time - Playback time in seconds
   * @returns Matching cue, or null if no cue covers this time
   */
  getCueAtTime(time: number): TrickplayCue | null {
    for (const cue of this.cues) {
      if (time >= cue.startTime && time < cue.endTime) {
        return cue;
      }
    }
    return null;
  }

  /**
   * Returns whether the VTT has been loaded and parsed.
   */
  isLoaded(): boolean {
    return this._loaded;
  }

  /**
   * Returns all parsed cues as a read-only array.
   */
  getCues(): ReadonlyArray<TrickplayCue> {
    return this.cues;
  }
}

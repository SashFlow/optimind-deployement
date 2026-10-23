/** External playback clock — lip-sync must not use rAF elapsed time as speech time. */
export interface AudioClock {
	/** Current playback position in seconds relative to clip start. */
	currentTime: number;
	readonly paused: boolean;
	readonly duration: number;
}

export class HtmlAudioClock implements AudioClock {
	constructor(private readonly audio: HTMLAudioElement) {}

	get currentTime(): number {
		return this.audio.currentTime;
	}

	get paused(): boolean {
		return this.audio.paused;
	}

	get duration(): number {
		return Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
	}
}

/**
 * Web Audio adapter: pass the AudioContext and the context time when playback started,
 * plus any offset into the buffer.
 */
export class WebAudioClock implements AudioClock {
	private startedAtContextTime: number | null = null;
	private offsetSeconds = 0;
	private pausedAt: number | null = 0;
	private _duration = 0;

	constructor(private readonly ctx: AudioContext) {}

	setDuration(seconds: number): void {
		this._duration = seconds;
	}

	start(offsetSeconds = 0): void {
		this.offsetSeconds = offsetSeconds;
		this.startedAtContextTime = this.ctx.currentTime;
		this.pausedAt = null;
	}

	pause(): void {
		if (this.pausedAt !== null) return;
		this.pausedAt = this.currentTime;
		this.startedAtContextTime = null;
	}

	resume(): void {
		if (this.pausedAt === null) return;
		this.offsetSeconds = this.pausedAt;
		this.startedAtContextTime = this.ctx.currentTime;
		this.pausedAt = null;
	}

	seek(timeSeconds: number): void {
		this.offsetSeconds = timeSeconds;
		if (this.pausedAt !== null) {
			this.pausedAt = timeSeconds;
		} else {
			this.startedAtContextTime = this.ctx.currentTime;
		}
	}

	stop(): void {
		this.startedAtContextTime = null;
		this.pausedAt = 0;
		this.offsetSeconds = 0;
	}

	get currentTime(): number {
		if (this.pausedAt !== null) return this.pausedAt;
		if (this.startedAtContextTime === null) return this.offsetSeconds;
		return (
			this.offsetSeconds +
			(this.ctx.currentTime - this.startedAtContextTime)
		);
	}

	get paused(): boolean {
		return this.pausedAt !== null;
	}

	get duration(): number {
		return this._duration;
	}
}

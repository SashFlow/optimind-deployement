/** One-Euro filter (Casiez et al. 2012), time-based so it is frame-rate independent. */
export class OneEuro {
	private xPrev = 0;
	private dxPrev = 0;
	private tPrev = -1;

	constructor(
		private minCutoff = 1.5,
		private beta = 0.05,
		private dCutoff = 1.0,
	) {}

	private static alpha(dt: number, cutoff: number): number {
		const tau = 1 / (2 * Math.PI * cutoff);
		return 1 / (1 + tau / dt);
	}

	filter(x: number, tSec: number): number {
		if (this.tPrev < 0) {
			this.tPrev = tSec;
			this.xPrev = x;
			return x;
		}
		const dt = Math.min(Math.max(tSec - this.tPrev, 0.001), 0.1);
		this.tPrev = tSec;
		const dx = (x - this.xPrev) / dt;
		const aD = OneEuro.alpha(dt, this.dCutoff);
		this.dxPrev += aD * (dx - this.dxPrev);
		const cutoff = this.minCutoff + this.beta * Math.abs(this.dxPrev);
		const a = OneEuro.alpha(dt, cutoff);
		this.xPrev += a * (x - this.xPrev);
		return this.xPrev;
	}
}

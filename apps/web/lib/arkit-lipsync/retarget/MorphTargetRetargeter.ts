import type { Object3D, Mesh } from "three";
import {
	ARKIT_BLENDSHAPES,
	SPEECH_BLENDSHAPE_SET,
	type ARKitBlendshape,
} from "../arkit";

export interface MorphBinding {
	mesh: Mesh;
	influenceIndex: number;
}

export interface MorphDiscoveryReport {
	found: ARKitBlendshape[];
	missing: ARKitBlendshape[];
	duplicates: string[];
	unknownMorphs: string[];
	meshCount: number;
	bindings: Map<string, MorphBinding[]>;
}

function isMesh(obj: Object3D): obj is Mesh {
	return (obj as Mesh).isMesh === true;
}

export class MorphTargetRetargeter {
	private bindings = new Map<string, MorphBinding[]>();
	private aliases: Record<string, string>;
	private speechOnly: boolean;
	private report: MorphDiscoveryReport | null = null;
	/** Tracks last written speech weights to restore neutrals without touching expressions. */
	private lastSpeech = new Map<string, number>();

	constructor(
		options: {
			morphAliases?: Record<string, string>;
			speechOnly?: boolean;
		} = {},
	) {
		this.aliases = options.morphAliases ?? {};
		this.speechOnly = options.speechOnly !== false;
	}

	attach(root: Object3D): MorphDiscoveryReport {
		this.bindings.clear();
		this.lastSpeech.clear();

		const foundSet = new Set<string>();
		const unknownMorphs: string[] = [];
		const nameCounts = new Map<string, number>();
		let meshCount = 0;

		root.traverse((obj) => {
			if (!isMesh(obj)) return;
			const mesh = obj;
			const dict = mesh.morphTargetDictionary;
			const influences = mesh.morphTargetInfluences;
			if (!dict || !influences) return;
			meshCount += 1;

			for (const [rawName, index] of Object.entries(dict)) {
				const normalized = this.normalizeName(rawName);
				nameCounts.set(
					normalized,
					(nameCounts.get(normalized) ?? 0) + 1,
				);

				const arkitName = this.resolveArkitName(normalized);
				if (!arkitName) {
					if (!unknownMorphs.includes(rawName))
						unknownMorphs.push(rawName);
					continue;
				}

				foundSet.add(arkitName);
				let list = this.bindings.get(arkitName);
				if (!list) {
					list = [];
					this.bindings.set(arkitName, list);
				}
				list.push({ mesh, influenceIndex: index });
			}
		});

		const found = ARKIT_BLENDSHAPES.filter((n) => foundSet.has(n));
		const missing = ARKIT_BLENDSHAPES.filter((n) => !foundSet.has(n));
		const duplicates = [...nameCounts.entries()]
			.filter(([, c]) => c > meshCount)
			.map(([n]) => n);

		this.report = {
			found,
			missing,
			duplicates,
			unknownMorphs,
			meshCount,
			bindings: this.bindings,
		};
		return this.report;
	}

	getReport(): MorphDiscoveryReport | null {
		return this.report;
	}

	has(name: string): boolean {
		return this.bindings.has(name);
	}

	private normalizeName(name: string): string {
		return name.trim();
	}

	private resolveArkitName(normalized: string): string | null {
		const aliased =
			this.aliases[normalized] ??
			this.aliases[normalized.toLowerCase()] ??
			normalized;
		// Case-insensitive match against ARKit set
		const exact = ARKIT_BLENDSHAPES.find(
			(n) => n === aliased || n.toLowerCase() === aliased.toLowerCase(),
		);
		return exact ?? null;
	}

	/**
	 * Apply ARKit weight buffer (length 52) to all bound meshes.
	 * Only updates speech targets when speechOnly is true.
	 */
	applyWeights(
		weights: Float32Array,
		names: readonly string[] = ARKIT_BLENDSHAPES,
	): void {
		for (let i = 0; i < names.length; i++) {
			const name = names[i];
			if (this.speechOnly && !SPEECH_BLENDSHAPE_SET.has(name)) continue;
			const value = weights[i] ?? 0;
			this.setTarget(name, value);
		}
	}

	setTarget(name: string, value: number): void {
		const list = this.bindings.get(name);
		if (!list) return;
		for (const { mesh, influenceIndex } of list) {
			const influences = mesh.morphTargetInfluences;
			if (!influences) continue;
			influences[influenceIndex] = value;
		}
		if (SPEECH_BLENDSHAPE_SET.has(name)) this.lastSpeech.set(name, value);
	}

	/** Reset speech-controlled targets to neutral (0). */
	resetSpeech(): void {
		for (const name of this.lastSpeech.keys()) {
			this.setTarget(name, 0);
		}
		this.lastSpeech.clear();
	}

	dispose(): void {
		this.resetSpeech();
		this.bindings.clear();
		this.report = null;
	}
}

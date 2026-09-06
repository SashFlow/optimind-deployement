"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";

type Point = {
	x: number;
	y: number;
};

const vertexShaderSource = `
	attribute vec2 a_position;

	void main() {
		gl_Position = vec4(a_position, 0.0, 1.0);
	}
`;

const fragmentShaderSource = `
	precision mediump float;

	uniform vec2 u_resolution;
	uniform vec2 u_mouse;
	uniform float u_dpr;
	uniform vec3 u_color;
	uniform float u_intensity;
	uniform float u_time;

	mat2 rotate(float angle) {
		float sine = sin(angle);
		float cosine = cos(angle);
		return mat2(cosine, -sine, sine, cosine);
	}

	void main() {
		float spacing = 34.0 * u_dpr;
		vec2 pixel = gl_FragCoord.xy;
		vec2 cell = floor(pixel / spacing);
		vec2 cellCenter = (cell * spacing) + (spacing / 2.0);
		vec2 local = fract(pixel / spacing) - 0.5;
		vec2 delta = cellCenter - u_mouse;
		float distanceToMouse = length(delta);
		float radius = 280.0 * u_dpr;
		float falloff = max(0.0, 1.0 - (distanceToMouse / radius));
		falloff *= falloff;

		float wave = sin(cell.x * 0.15 + cell.y * 0.15 + u_time * 1.5) * 0.5 + 0.5;
		float angleToMouse = atan(delta.y, delta.x);
		float targetAngle = angleToMouse * falloff + (wave * 0.5 * (1.0 - falloff));
		local = rotate(targetAngle) * local;

		float thickness = 0.025 + (0.045 * falloff);
		float lengthSize = 0.1 + (0.2 * falloff);
		float horizontalBar = step(abs(local.x), lengthSize) * step(abs(local.y), thickness);
		float verticalBar = step(abs(local.y), lengthSize) * step(abs(local.x), thickness);
		float cross = clamp(horizontalBar + verticalBar, 0.0, 1.0);
		float alpha = falloff * (0.6 + 0.2 * wave) * u_intensity;

		gl_FragColor = vec4(u_color * alpha * cross, alpha * cross);
	}
`;

const fallbackGridStyle: CSSProperties = {
	backgroundImage: [
		"linear-gradient(to right, color-mix(in srgb, var(--primary) 10%, transparent) 1px, transparent 1px)",
		"linear-gradient(to bottom, color-mix(in srgb, var(--primary) 10%, transparent) 1px, transparent 1px)",
	].join(","),
	backgroundSize: "34px 34px",
	maskImage: "radial-gradient(ellipse at 72% 48%, black 0%, transparent 76%)",
	WebkitMaskImage:
		"radial-gradient(ellipse at 72% 48%, black 0%, transparent 76%)",
};

function getPrimaryColor(): [number, number, number] {
	const colorCanvas = document.createElement("canvas");
	const colorContext = colorCanvas.getContext("2d");

	if (!colorContext) {
		return [0.42, 0.3, 0.95];
	}

	colorContext.fillStyle = getComputedStyle(
		document.documentElement,
	).getPropertyValue("--primary");
	const normalizedColor = colorContext.fillStyle;
	const match = normalizedColor.match(
		/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/,
	);

	if (!match) {
		return [0.42, 0.3, 0.95];
	}

	return [
		Number(match[1]) / 255,
		Number(match[2]) / 255,
		Number(match[3]) / 255,
	];
}

function createShader(
	gl: WebGLRenderingContext,
	type: number,
	source: string,
): WebGLShader | null {
	const shader = gl.createShader(type);

	if (!shader) {
		return null;
	}

	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		gl.deleteShader(shader);
		return null;
	}

	return shader;
}

export function InteractiveHeroBackground() {
	const containerRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const container = containerRef.current;
		const canvas = canvasRef.current;

		if (!container || !canvas) {
			return;
		}

		const reducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		const gl = reducedMotion
			? null
			: canvas.getContext("webgl", {
				alpha: true,
				premultipliedAlpha: true,
			});

		if (!gl) {
			return;
		}

		const vertexShader = createShader(
			gl,
			gl.VERTEX_SHADER,
			vertexShaderSource,
		);
		const fragmentShader = createShader(
			gl,
			gl.FRAGMENT_SHADER,
			fragmentShaderSource,
		);

		if (!vertexShader || !fragmentShader) {
			return;
		}

		const program = gl.createProgram();

		if (!program) {
			return;
		}

		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			gl.deleteProgram(program);
			gl.deleteShader(vertexShader);
			gl.deleteShader(fragmentShader);
			return;
		}

		gl.useProgram(program);

		const buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
			gl.STATIC_DRAW,
		);

		const position = gl.getAttribLocation(program, "a_position");
		gl.enableVertexAttribArray(position);
		gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

		const resolution = gl.getUniformLocation(program, "u_resolution");
		const mouse = gl.getUniformLocation(program, "u_mouse");
		const dprUniform = gl.getUniformLocation(program, "u_dpr");
		const color = gl.getUniformLocation(program, "u_color");
		const intensity = gl.getUniformLocation(program, "u_intensity");
		const time = gl.getUniformLocation(program, "u_time");

		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

		const targetMouse: Point = { x: -9999, y: -9999 };
		const currentMouse: Point = { x: -9999, y: -9999 };
		let devicePixelRatio = 1;
		let width = 0;
		let height = 0;
		let targetIntensity = 0;
		let currentIntensity = 0;
		let leaveTimeout: number | undefined;
		let animationFrame = 0;

		const resize = () => {
			const bounds = container.getBoundingClientRect();
			width = bounds.width;
			height = bounds.height;
			devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
			canvas.width = width * devicePixelRatio;
			canvas.height = height * devicePixelRatio;
			canvas.style.width = `${width}px`;
			canvas.style.height = `${height}px`;
			gl.viewport(0, 0, canvas.width, canvas.height);
			gl.uniform2f(resolution, canvas.width, canvas.height);
			gl.uniform1f(dprUniform, devicePixelRatio);
		};

		const updateColor = () => {
			gl.uniform3fv(color, getPrimaryColor());
		};

		const handlePointerMove = (event: PointerEvent) => {
			const bounds = container.getBoundingClientRect();
			const x = event.clientX - bounds.left;
			const y = event.clientY - bounds.top;

			if (x < 0 || y < 0 || x > bounds.width || y > bounds.height) {
				targetIntensity = 0;
				return;
			}

			targetMouse.x = x * devicePixelRatio;
			targetMouse.y = (bounds.height - y) * devicePixelRatio;
			targetIntensity = 1;
			window.clearTimeout(leaveTimeout);
			leaveTimeout = window.setTimeout(() => {
				targetIntensity = 0;
			}, 300);
		};

		const handlePointerLeave = () => {
			targetIntensity = 0;
			window.clearTimeout(leaveTimeout);
		};

		const draw = (timestamp: number) => {
			const elapsed = timestamp / 1000;
			currentMouse.x += (targetMouse.x - currentMouse.x) * 0.12;
			currentMouse.y += (targetMouse.y - currentMouse.y) * 0.12;
			currentIntensity += (targetIntensity - currentIntensity) * 0.05;
			gl.uniform2f(mouse, currentMouse.x, currentMouse.y);
			gl.uniform1f(intensity, currentIntensity);
			gl.uniform1f(time, elapsed);
			gl.drawArrays(gl.TRIANGLES, 0, 6);
			animationFrame = window.requestAnimationFrame(draw);
		};

		resize();
		updateColor();

		const resizeObserver = new ResizeObserver(resize);
		resizeObserver.observe(container);
		const themeObserver = new MutationObserver(updateColor);
		themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class", "style", "data-theme"],
		});
		window.addEventListener("pointermove", handlePointerMove, {
			passive: true,
		});
		window.addEventListener("pointerleave", handlePointerLeave);
		animationFrame = window.requestAnimationFrame(draw);

		return () => {
			window.cancelAnimationFrame(animationFrame);
			window.clearTimeout(leaveTimeout);
			resizeObserver.disconnect();
			themeObserver.disconnect();
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerleave", handlePointerLeave);
			gl.deleteProgram(program);
			gl.deleteShader(vertexShader);
			gl.deleteShader(fragmentShader);
			gl.deleteBuffer(buffer);
		};
	}, []);

	return (
		<div
			ref={containerRef}
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
		>
			<div
				className="absolute inset-0 opacity-60"
				style={fallbackGridStyle}
			/>
			<canvas
				ref={canvasRef}
				className="absolute inset-0 h-full w-full"
			/>
			<div className="absolute right-[6%] top-1/2 hidden aspect-square w-[min(38vw,30rem)] -translate-y-1/2 opacity-35 md:block">
				<div className="absolute inset-[12%] rounded-full border border-primary/20" />
				<div className="absolute inset-[25%] rounded-full border border-primary/20" />
				<div className="absolute inset-[38%] rounded-full border border-primary/15" />
				<div className="absolute inset-[12%] rotate-45 rounded-full border border-primary/15" />
				<div className="absolute inset-[12%] -rotate-45 rounded-full border border-primary/15" />
				<div className="absolute inset-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/70 shadow-[0_0_28px_8px_color-mix(in_srgb,var(--primary)_25%,transparent)]" />
			</div>
			<div className="absolute inset-0 bg-linear-to-b from-background/10 via-transparent to-background/40" />
		</div>
	);
}

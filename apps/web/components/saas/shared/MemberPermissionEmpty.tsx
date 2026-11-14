type MemberPermissionEmptyProps = {
	title: string;
	description: string;
};

export function MemberPermissionEmpty({
	title,
	description,
}: MemberPermissionEmptyProps) {
	return (
		<div className="relative flex min-h-[min(32rem,72vh)] flex-1 items-center justify-center overflow-hidden p-6">
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_32%,color-mix(in_oklab,var(--primary)_12%,transparent)_0%,transparent_60%)]"
			/>
			<div
				aria-hidden
				className="pointer-events-none absolute top-[16%] left-[42%] size-56 -translate-x-1/2 rounded-full bg-secondary/30 blur-3xl"
			/>
			<div
				aria-hidden
				className="pointer-events-none absolute top-[28%] left-[58%] size-40 -translate-x-1/2 rounded-full bg-primary/10 blur-2xl"
			/>

			<div className="relative flex max-w-md flex-col items-center gap-7 text-center">
				<div className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:slide-in-from-bottom-3 relative duration-500 fill-mode-both">
					<svg
						aria-hidden
						viewBox="0 0 280 220"
						className="h-44 w-auto sm:h-52"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<defs>
							<linearGradient
								id="member-perm-card"
								x1="40"
								y1="28"
								x2="220"
								y2="180"
								gradientUnits="userSpaceOnUse"
							>
								<stop stopColor="var(--card)" />
								<stop
									offset="1"
									stopColor="var(--muted)"
									stopOpacity="0.85"
								/>
							</linearGradient>
							<linearGradient
								id="member-perm-glow"
								x1="190"
								y1="120"
								x2="240"
								y2="180"
								gradientUnits="userSpaceOnUse"
							>
								<stop
									stopColor="var(--primary)"
									stopOpacity="0.24"
								/>
								<stop
									offset="1"
									stopColor="var(--secondary)"
									stopOpacity="0.22"
								/>
							</linearGradient>
							<filter
								id="member-perm-soft"
								x="-25%"
								y="-25%"
								width="150%"
								height="150%"
							>
								<feDropShadow
									dx="0"
									dy="12"
									stdDeviation="14"
									floodColor="#000000"
									floodOpacity="0.1"
								/>
							</filter>
						</defs>

						{/* Back card */}
						<rect
							x="58"
							y="34"
							width="156"
							height="108"
							rx="22"
							fill="var(--muted)"
							stroke="var(--border)"
							strokeWidth="1.5"
							transform="rotate(-7 136 88)"
							opacity="0.85"
						/>

						{/* Front card */}
						<g filter="url(#member-perm-soft)">
							<rect
								x="52"
								y="42"
								width="168"
								height="122"
								rx="24"
								fill="url(#member-perm-card)"
								stroke="var(--border)"
								strokeWidth="1.5"
							/>
							<rect
								x="72"
								y="62"
								width="48"
								height="11"
								rx="5.5"
								fill="var(--primary)"
								fillOpacity="0.18"
							/>
							<rect
								x="72"
								y="88"
								width="112"
								height="10"
								rx="5"
								fill="var(--foreground)"
								fillOpacity="0.12"
							/>
							<rect
								x="72"
								y="108"
								width="84"
								height="10"
								rx="5"
								fill="var(--foreground)"
								fillOpacity="0.09"
							/>
							<rect
								x="72"
								y="128"
								width="98"
								height="10"
								rx="5"
								fill="var(--foreground)"
								fillOpacity="0.07"
							/>
							<circle cx="198" cy="93" r="4" fill="#34d399" />
							<circle
								cx="198"
								cy="113"
								r="4"
								fill="var(--primary)"
								fillOpacity="0.45"
							/>
							<circle
								cx="198"
								cy="133"
								r="4"
								fill="var(--secondary)"
							/>
						</g>

						<circle
							cx="206"
							cy="150"
							r="44"
							fill="url(#member-perm-glow)"
						/>

						{/* Lock badge */}
						<g filter="url(#member-perm-soft)">
							<circle
								cx="206"
								cy="150"
								r="30"
								fill="var(--card)"
								stroke="var(--border)"
								strokeWidth="1.5"
							/>
							<circle
								cx="206"
								cy="150"
								r="22"
								fill="var(--primary)"
							/>
							<path
								d="M198 145.5v-4.5a8 8 0 0 1 16 0v4.5"
								stroke="var(--primary-foreground)"
								strokeWidth="2.5"
								strokeLinecap="round"
							/>
							<rect
								x="195"
								y="145"
								width="22"
								height="18"
								rx="5"
								fill="var(--primary-foreground)"
							/>
							<circle
								cx="206"
								cy="152"
								r="2.2"
								fill="var(--primary)"
							/>
							<path
								d="M206 154.2v3.2"
								stroke="var(--primary)"
								strokeWidth="2"
								strokeLinecap="round"
							/>
						</g>
					</svg>
				</div>

				<div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 space-y-3 delay-100 duration-500 fill-mode-both">
					<span className="inline-flex items-center rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-primary uppercase">
						Member access
					</span>
					<div className="space-y-2">
						<h2 className="font-heading text-balance text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
							{title}
						</h2>
						<p className="mx-auto max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">
							{description}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

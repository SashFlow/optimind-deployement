"use client";

export default function Header() {
	return (
		<header className="fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-[#494846] backdrop-blur-xl">
			<div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
				<a
					href="/"
					className="flex items-center gap-2 font-display text-2xl"
				>
					<span className="inline-block h-2 w-2 rounded-full bg-signal" />
					Sashflow
				</a>
				<nav className="hidden gap-8 font-mono text-xs uppercase tracking-widest text-muted-foreground md:flex">
					<a href="/#use-cases" className="hover:text-foreground">
						Use cases
					</a>
					<a href="/#metrics" className="hover:text-foreground">
						Metrics
					</a>
					<a href="/#contact" className="hover:text-foreground">
						Contact
					</a>
				</nav>
				<div className="flex gap-2">
					<a
						href="/#contact"
						className="rounded-full border border-signal/30 px-4 py-2 font-mono text-xs uppercase tracking-widest text-signal transition-colors hover:bg-signal hover:text-primary-foreground"
					>
						Book pilot
					</a>
					<a
						href="/auth/login"
						className="rounded-full border border-signal/30 px-4 py-2 font-mono text-xs uppercase tracking-widest text-signal transition-colors hover:bg-signal hover:text-primary-foreground"
					>
						Login
					</a>
				</div>
			</div>
		</header>
	);
}

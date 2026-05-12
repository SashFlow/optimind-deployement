"use client";

import Link from "next/link";

export function NavBar() {
	return (
		<nav className="fixed bg-background top-0 w-full z-50 shadow-[0_8px_32px_rgba(27,28,24,0.04)]">
			<div className="flex justify-between items-center px-8 py-6 max-w-screen-2xl mx-auto">
				<div className="text-2xl font-black tracking-tighter text-foreground uppercase font-industrial">
					Sash<span className="text-primary">Flow</span>
				</div>
				<div className="hidden md:flex items-center gap-10">
					<Link
						className="text-primary border-b-2 border-primary pb-1 font-approachable text-sm font-bold uppercase tracking-wider"
						href="#about"
					>
						About
					</Link>
					<Link
						className="text-foreground opacity-80 hover:opacity-100 hover:text-primary transition-all duration-300 font-approachable text-sm uppercase tracking-wider"
						href="#industries"
					>
						Industries
					</Link>
					<Link
						className="text-foreground opacity-80 hover:opacity-100 hover:text-primary transition-all duration-300 font-approachable text-sm uppercase tracking-wider"
						href="#contact"
					>
						Contact
					</Link>
				</div>
				<Link
					href="/contact"
					className="bg-primary text-primary-foreground px-6 py-2.5 font-approachable font-bold uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all duration-150 inline-block text-center"
				>
					Get Started
				</Link>
			</div>
		</nav>
	);
}

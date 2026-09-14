"use client";

import { Button } from "@repo/ui/button";
import { useRouter } from "next/navigation";
import { Link } from "next-transition-router";
import { Logo } from "@/components/shared/components/Logo";

export default function Header() {
	const router = useRouter();
	return (
		<header className="bg-background sticky top-0 z-50 border-b">
			<div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
				<Logo withLabel={true} />
				<nav className="hidden items-center md:flex">
					<Link
						href="/#product"
						data-slot="button"
						data-variant="ghost"
						data-size="sm"
						className="inline-flex shrink-0 items-center justify-center text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&amp;_svg]:pointer-events-none [&amp;_svg]:shrink-0 [&amp;_svg:not([class*='size-'])]:size-4 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 h-8 gap-1.5 rounded-md px-3"
					>
						Product
					</Link>
					<Link
						href="/#solutions"
						data-slot="button"
						data-variant="ghost"
						data-size="sm"
						className="inline-flex shrink-0 items-center justify-center text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&amp;_svg]:pointer-events-none [&amp;_svg]:shrink-0 [&amp;_svg:not([class*='size-'])]:size-4 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 h-8 gap-1.5 rounded-md px-3"
					>
						Solutions
					</Link>
					<Link
						href="/#team"
						data-slot="button"
						data-variant="ghost"
						data-size="sm"
						className="inline-flex shrink-0 items-center justify-center text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&amp;_svg]:pointer-events-none [&amp;_svg]:shrink-0 [&amp;_svg:not([class*='size-'])]:size-4 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 h-8 gap-1.5 rounded-md px-3"
					>
						Company
					</Link>
				</nav>
				<div className="flex items-center gap-2">
					<Button
						data-slot="button"
						data-variant="ghost"
						data-size="sm"
						onClick={() => {
							router.push("/auth/login");
						}}
						className="inline-flex shrink-0 items-center justify-center text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&amp;_svg]:pointer-events-none [&amp;_svg]:shrink-0 [&amp;_svg:not([class*='size-'])]:size-4 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 h-8 gap-1.5 rounded-md px-3"
					>
						Sign in
					</Button>
					<Button
						data-slot="button"
						data-variant="default"
						data-size="sm"
						onClick={() => {
							window.scrollTo({
								top:
									document.getElementById("contact")
										?.offsetTop ?? 0,
								behavior: "smooth",
							});
						}}
						className="hidden md:inline-flex shrink-0 items-center justify-center text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&amp;_svg]:pointer-events-none [&amp;_svg]:shrink-0 [&amp;_svg:not([class*='size-'])]:size-4 bg-primary text-primary-foreground hover:bg-primary/90 h-8 gap-1.5 rounded-md px-3"
					>
						Get started
					</Button>
				</div>
			</div>
		</header>
	);
}

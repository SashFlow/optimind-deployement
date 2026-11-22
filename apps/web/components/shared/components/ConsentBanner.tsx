"use client";

import { Button } from "@repo/ui/button";
import { useCookieConsent } from "@shared/hooks/cookie-consent";
import { CookieIcon } from "lucide-react";
import { useEffect, useState } from "react";

export function ConsentBanner() {
	const { consentDecided, allowCookies, declineCookies } = useCookieConsent();
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted || consentDecided) {
		return null;
	}

	return (
		<div className="fixed left-4 bottom-4 max-w-md z-50">
			<div className="flex gap-4 rounded-2xl border bg-card p-4 text-card-foreground shadow-xl">
				<CookieIcon className="block size-6 shrink-0 text-5xl text-primary/60 mt-1" />
				<div>
					<p className="text-sm leading-normal">
						We use necessary cookies to run the service. Optional
						analytics cookies help us improve OptiMind. You can
						decline analytics; essential cookies will still work.
						See our Privacy Policy for details.
					</p>
					<div className="mt-4 flex gap-2">
						<Button
							variant="destructive"
							className="flex-1"
							onClick={() => declineCookies()}
						>
							Decline analytics
						</Button>
						<Button
							className="flex-1"
							onClick={() => allowCookies()}
						>
							Allow analytics
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

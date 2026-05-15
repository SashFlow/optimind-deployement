"use client";

import { authClient } from "@repo/auth/client";
import { config } from "@repo/config";
import { Button } from "@repo/ui/button";
import React from "react";

const Logout = () => {
	const onLogout = () => {
		authClient.signOut({
			fetchOptions: {
				onSuccess: async () => {
					window.location.href = new URL(
						config.auth.redirectAfterLogout,
						window.location.origin,
					).toString();
				},
			},
		});
	};
	return (
		<div className="hidden md:flex md:justify-self-end">
			<Button
				onClick={onLogout}
				className="rounded-full border border-signal/30 px-4 py-2 font-mono text-xs uppercase tracking-widest text-signal transition-colors text-background bg-signal"
			>
				Log out
			</Button>
		</div>
	);
};

export default Logout;

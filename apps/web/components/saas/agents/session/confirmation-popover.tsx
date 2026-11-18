"use client";

import { Button } from "@repo/ui/button";
import { Checkbox } from "@repo/ui/checkbox";
import { Loader } from "lucide-react";
import { useSessionInteractionContext } from "@/context/session-interaction-provider";

/** Centered confirmation dialog opened via the agent `start_confirmation` RPC. */
export function ConfirmationPopover() {
	const ctx = useSessionInteractionContext();
	const confirmation = ctx?.confirmation;
	if (!confirmation?.open) {
		return null;
	}

	const { options, checked, setChecked, submitting, accept, decline } =
		confirmation;

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="confirmation-title"
			className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
		>
			<div className="bg-background border-input/50 flex w-full max-w-md flex-col gap-5 rounded-lg border p-5 drop-shadow-md/3">
				<div>
					<h2
						id="confirmation-title"
						className="text-lg font-semibold"
					>
						Please confirm
					</h2>
					<p className="text-muted-foreground mt-2 text-sm whitespace-pre-wrap">
						{options.prompt}
					</p>
				</div>

				<label className="flex cursor-pointer items-start gap-3 rounded-md border border-input/60 bg-muted/20 p-3">
					<Checkbox
						checked={checked}
						disabled={submitting}
						onCheckedChange={(value) => setChecked(value === true)}
						className="mt-0.5"
						aria-labelledby="confirmation-accept-label"
					/>
					<span
						id="confirmation-accept-label"
						className="text-sm leading-snug"
					>
						{options.acceptLabel}
					</span>
				</label>

				<div className="flex items-center justify-end gap-2">
					<Button
						type="button"
						variant="outline"
						disabled={submitting}
						onClick={() => void decline()}
					>
						Decline
					</Button>
					<Button
						type="button"
						disabled={!checked || submitting}
						onClick={() => void accept()}
					>
						{submitting && (
							<Loader className="mr-2 size-4 animate-spin" />
						)}
						Confirm
					</Button>
				</div>
			</div>
		</div>
	);
}

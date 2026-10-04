"use client";

import { Button } from "@repo/ui/button";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
} from "@repo/ui/input-otp";
import { Loader } from "lucide-react";
import { useSessionInteractionContext } from "@/context/session-interaction-provider";

function OtpSlots({ length }: { length: number }) {
	const slots = Array.from({ length }, (_, index) => index);
	const midpoint = Math.ceil(length / 2);

	if (length === 6) {
		return (
			<>
				<InputOTPGroup>
					{slots.slice(0, 3).map((index) => (
						<InputOTPSlot
							key={index}
							className="size-10 text-lg"
							index={index}
						/>
					))}
				</InputOTPGroup>
				<InputOTPSeparator className="opacity-40" />
				<InputOTPGroup>
					{slots.slice(3).map((index) => (
						<InputOTPSlot
							key={index}
							className="size-10 text-lg"
							index={index}
						/>
					))}
				</InputOTPGroup>
			</>
		);
	}

	return (
		<>
			<InputOTPGroup>
				{slots.slice(0, midpoint).map((index) => (
					<InputOTPSlot
						key={index}
						className="size-10 text-lg"
						index={index}
					/>
				))}
			</InputOTPGroup>
			{length > 4 && <InputOTPSeparator className="opacity-40" />}
			{length > 4 && (
				<InputOTPGroup>
					{slots.slice(midpoint).map((index) => (
						<InputOTPSlot
							key={index}
							className="size-10 text-lg"
							index={index}
						/>
					))}
				</InputOTPGroup>
			)}
		</>
	);
}

/** Centered OTP entry dialog opened via the agent `start_otp_input` RPC. */
export function OtpInputPopover() {
	const otp = useSessionInteractionContext();
	if (!otp?.open) {
		return null;
	}

	const {
		options,
		code,
		setCode,
		submitting,
		resending,
		resendCooldownSeconds,
		canResend,
		dismiss,
		submit,
		resend,
	} = otp;

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="otp-input-title"
			className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
		>
			<div className="bg-background border-input/50 flex w-full max-w-md flex-col gap-5 rounded-lg border p-5 drop-shadow-md/3">
				<div>
					<h2 id="otp-input-title" className="text-lg font-semibold">
						Enter OTP
					</h2>
					<p className="text-muted-foreground text-sm">
						Enter the 6-digit code you received via SMS. Check Spam folder if you don't see it.
					</p>
				</div>

				<div className="flex justify-center">
					<InputOTP
						maxLength={options.length}
						value={code}
						onChange={setCode}
						autoComplete="one-time-code"
						disabled={submitting}
					>
						<OtpSlots length={options.length} />
					</InputOTP>
				</div>

				<div className="flex items-center justify-between gap-3">
					<div className="flex gap-2">
						<Button
							type="button"
							disabled={
								code.length !== options.length || submitting
							}
							onClick={() => void submit()}
						>
							{submitting && (
								<Loader className="mr-2 size-4 animate-spin" />
							)}
							Submit
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

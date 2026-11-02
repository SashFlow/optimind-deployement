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

/** Centered Aadhaar OTP dialog opened via `start_aadhaar_otp_input` RPC. */
export function AadhaarOtpInputPopover() {
	const ctx = useSessionInteractionContext();
	const aadhaar = ctx?.aadhaarOtp;
	if (!aadhaar?.open) {
		return null;
	}

	const {
		options,
		code,
		setCode,
		requesting,
		requestError,
		otpRequested,
		submitting,
		resending,
		resendCooldownSeconds,
		canResend,
		dismiss,
		submit,
		resend,
	} = aadhaar;

	const last4 = options.aadhaarNumber.slice(-4);
	const description =
		options.hint ??
		(last4
			? `Enter the ${options.length}-digit OTP sent to the mobile number linked with Aadhaar ending in ${last4}.`
			: `Enter the ${options.length}-digit Aadhaar OTP sent via SMS.`);

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="aadhaar-otp-input-title"
			className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
		>
			<div className="bg-background border-input/50 flex w-full max-w-md flex-col gap-5 rounded-lg border p-5 drop-shadow-md/3">
				<div>
					<h2
						id="aadhaar-otp-input-title"
						className="text-lg font-semibold"
					>
						Verify Aadhaar OTP
					</h2>
					<p className="text-muted-foreground text-sm">
						{requesting
							? "Requesting OTP from UIDAI…"
							: description}
					</p>
					{requestError ? (
						<p className="text-destructive mt-2 text-sm">
							{requestError}
						</p>
					) : null}
				</div>

				<div className="flex justify-center">
					<InputOTP
						maxLength={options.length}
						value={code}
						onChange={setCode}
						autoComplete="one-time-code"
						disabled={submitting || requesting || !otpRequested}
					>
						<OtpSlots length={options.length} />
					</InputOTP>
				</div>

				<div className="flex items-center justify-between gap-3">
					<div className="flex gap-2">
						<Button
							type="button"
							disabled={
								code.length !== options.length ||
								submitting ||
								requesting ||
								!otpRequested
							}
							onClick={() => void submit()}
						>
							{submitting && (
								<Loader className="mr-2 size-4 animate-spin" />
							)}
							Verify
						</Button>
						<Button
							type="button"
							variant="outline"
							disabled={!canResend}
							onClick={() => void resend()}
						>
							{resending || requesting ? (
								<Loader className="mr-2 size-4 animate-spin" />
							) : null}
							{resendCooldownSeconds > 0
								? `Resend (${resendCooldownSeconds}s)`
								: "Resend"}
						</Button>
					</div>
					<Button
						type="button"
						variant="ghost"
						disabled={submitting}
						onClick={dismiss}
					>
						Cancel
					</Button>
				</div>
			</div>
		</div>
	);
}

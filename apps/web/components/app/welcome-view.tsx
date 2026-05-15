"use client";

import { PreconnectMediaSetup } from "@components/app/preconnect-media-setup";
import { Button } from "@repo/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/table";
import { orpcClient } from "@shared/lib/orpc-client";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ScenarioDetails } from "@/types/index";

const APPOINTMENTS_PER_PAGE = 5;

type AppointmentRow = {
	id: string;
	full_name: string;
	phone_number: string;
	dob: string;
	appointment_type: string;
	appointment_date: string;
	appointment_time: string;
	exam_type: string;
	pin_code: string;
	address: string;
};

export function WelcomeImage() {
	return (
		<svg
			width="64"
			height="64"
			viewBox="0 0 64 64"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className="text-fg0 mb-4 size-16"
		>
			<title>Welcome illustration</title>
			<path
				d="M15 24V40C15 40.7957 14.6839 41.5587 14.1213 42.1213C13.5587 42.6839 12.7956 43 12 43C11.2044 43 10.4413 42.6839 9.87868 42.1213C9.31607 41.5587 9 40.7957 9 40V24C9 23.2044 9.31607 22.4413 9.87868 21.8787C10.4413 21.3161 11.2044 21 12 21C12.7956 21 13.5587 21.3161 14.1213 21.8787C14.6839 22.4413 15 23.2044 15 24ZM22 5C21.2044 5 20.4413 5.31607 19.8787 5.87868C19.3161 6.44129 19 7.20435 19 8V56C19 56.7957 19.3161 57.5587 19.8787 58.1213C20.4413 58.6839 21.2044 59 22 59C22.7956 59 23.5587 58.6839 24.1213 58.1213C24.6839 57.5587 25 56.7957 25 56V8C25 7.20435 24.6839 6.44129 24.1213 5.87868C23.5587 5.31607 22.7956 5 22 5ZM32 13C31.2044 13 30.4413 13.3161 29.8787 13.8787C29.3161 14.4413 29 15.2044 29 16V48C29 48.7957 29.3161 49.5587 29.8787 50.1213C30.4413 50.6839 31.2044 51 32 51C32.7956 51 33.5587 50.6839 34.1213 50.1213C34.6839 49.5587 35 48.7957 35 48V16C35 15.2044 34.6839 14.4413 34.1213 13.8787C33.5587 13.3161 32.7956 13 32 13ZM42 21C41.2043 21 40.4413 21.3161 39.8787 21.8787C39.3161 22.4413 39 23.2044 39 24V40C39 40.7957 39.3161 41.5587 39.8787 42.1213C40.4413 42.6839 41.2043 43 42 43C42.7957 43 43.5587 42.6839 44.1213 42.1213C44.6839 41.5587 45 40.7957 45 40V24C45 23.2044 44.6839 22.4413 44.1213 21.8787C43.5587 21.3161 42.7957 21 42 21ZM52 17C51.2043 17 50.4413 17.3161 49.8787 17.8787C49.3161 18.4413 49 19.2044 49 20V44C49 44.7957 49.3161 45.5587 49.8787 46.1213C50.4413 46.6839 51.2043 47 52 47C52.7957 47 53.5587 46.6839 54.1213 46.1213C54.6839 45.5587 55 44.7957 55 44V20C55 19.2044 54.6839 18.4413 54.1213 17.8787C53.5587 17.3161 52.7957 17 52 17Z"
				fill="currentColor"
			/>
		</svg>
	);
}

interface WelcomeViewProps {
	startButtonText: string;
	onStartCall: () => Promise<void> | void;
	scenario: ScenarioDetails;
	requireMediaSetup?: boolean;
	showCameraPreview?: boolean;
}

export const WelcomeView = ({
	startButtonText,
	onStartCall,
	scenario,
	requireMediaSetup = true,
	showCameraPreview = true,
	ref,
}: React.ComponentProps<"div"> & WelcomeViewProps) => {
	const router = useRouter();
	const [canStart, setCanStart] = useState(!requireMediaSetup);
	const [isStarting, setIsStarting] = useState(false);
	const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
	const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
	const [appointmentsError, setAppointmentsError] = useState<string | null>(
		null,
	);
	const [appointmentsPage, setAppointmentsPage] = useState(1);
	const beforeStartRef = useRef<() => void>(() => undefined);

	const totalAppointmentPages = Math.max(
		1,
		Math.ceil(appointments.length / APPOINTMENTS_PER_PAGE),
	);
	const paginatedAppointments = appointments.slice(
		(appointmentsPage - 1) * APPOINTMENTS_PER_PAGE,
		appointmentsPage * APPOINTMENTS_PER_PAGE,
	);

	const handleStartCall = async () => {
		if (!canStart || isStarting) {
			return;
		}

		setIsStarting(true);
		try {
			beforeStartRef.current();
			await onStartCall();
		} finally {
			setIsStarting(false);
		}
	};

	const loadAppointments = async () => {
		setIsLoadingAppointments(true);
		setAppointmentsError(null);

		try {
			const data = await orpcClient.appointments.list({
				query: undefined,
				limit: 100,
				offset: 0,
			});

			setAppointments(data as AppointmentRow[]);
			setAppointmentsPage(1);
		} catch {
			setAppointmentsError(
				"Failed to load appointments. Please refresh and try again.",
			);
		} finally {
			setIsLoadingAppointments(false);
		}
	};

	useEffect(() => {
		void loadAppointments();
	}, []);

	return (
		<div ref={ref}>
			<section className="bg-background mx-auto flex max-w-5xl flex-col items-center justify-center px-4 py-8 text-center sm:px-6 md:px-10 md:py-10">
				<WelcomeImage />

				<p className="text-foreground text-3xl font-semibold tracking-tight">
					{scenario.title}
				</p>
				<p className="text-muted-foreground max-w-2xl pt-3 text-sm leading-6 md:text-base">
					{scenario.description}
				</p>

				<div className="mt-8 grid w-full gap-4 text-left md:grid-cols-2">
					<div className="border-border/70 bg-card rounded-2xl border p-6 shadow-sm">
						<h2 className="text-center text-sm font-semibold tracking-wide uppercase">
							Capabilities
						</h2>
						<ul className="mt-4 space-y-3 text-sm leading-6">
							{scenario.highlights.map((highlight) => (
								<li
									key={highlight}
									className="text-muted-foreground text-center"
								>
									{highlight}
								</li>
							))}
						</ul>
					</div>

					{requireMediaSetup && (
						<PreconnectMediaSetup
							requireMicrophone
							requireCamera
							showCameraPreview={showCameraPreview}
							onReadinessChange={setCanStart}
							onRegisterBeforeStart={(beforeStart) => {
								beforeStartRef.current = beforeStart;
							}}
						/>
					)}
				</div>

				<div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
					<Button
						size="lg"
						disabled={!canStart || isStarting}
						onClick={() => void handleStartCall()}
						className="mt-8 w-full rounded-full font-mono text-xs font-bold tracking-wider uppercase sm:max-w-sm"
					>
						{isStarting ? "Starting..." : startButtonText}
					</Button>
					<Button
						size="lg"
						onClick={() => router.push("/app")}
						variant={"secondary"}
						className="w-full rounded-full font-mono text-xs font-bold tracking-wider uppercase sm:mt-8 sm:max-w-sm"
					>
						Go Back
					</Button>
				</div>

				<div className="mt-8 grid w-full gap-4 text-left">
					<div className="border-border/70 bg-card rounded-2xl border p-6 shadow-sm">
						<div className="mb-4 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
							<h2 className="text-sm font-semibold tracking-wide uppercase">
								Appointments
							</h2>
							<Button
								variant="outline"
								size="sm"
								onClick={() => void loadAppointments()}
								disabled={isLoadingAppointments}
							>
								{isLoadingAppointments ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : null}
								Refresh
							</Button>
						</div>

						{appointmentsError ? (
							<div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
								{appointmentsError}
							</div>
						) : null}

						<div className="space-y-3 md:hidden">
							{isLoadingAppointments ? (
								<div className="text-muted-foreground flex h-24 items-center justify-center rounded-lg border text-sm">
									<span className="inline-flex items-center gap-2">
										<Loader2 className="h-4 w-4 animate-spin" />
										Loading appointments...
									</span>
								</div>
							) : paginatedAppointments.length > 0 ? (
								paginatedAppointments.map((appointment) => (
									<div
										key={appointment.id}
										className="space-y-2 rounded-lg border p-3"
									>
										<p className="text-sm font-semibold">
											{appointment.full_name}
										</p>
										<div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
											<span className="text-muted-foreground">
												Phone
											</span>
											<span className="text-right">
												{appointment.phone_number}
											</span>
											<span className="text-muted-foreground">
												DOB
											</span>
											<span className="text-right">
												{appointment.dob}
											</span>
											<span className="text-muted-foreground">
												Type
											</span>
											<span className="text-right">
												{appointment.appointment_type}
											</span>
											<span className="text-muted-foreground">
												Date
											</span>
											<span className="text-right">
												{appointment.appointment_date}
											</span>
											<span className="text-muted-foreground">
												Time
											</span>
											<span className="text-right">
												{appointment.appointment_time}
											</span>
											<span className="text-muted-foreground">
												Exam
											</span>
											<span className="text-right">
												{appointment.exam_type}
											</span>
											<span className="text-muted-foreground">
												Pin
											</span>
											<span className="text-right">
												{appointment.pin_code}
											</span>
										</div>
										<p className="text-muted-foreground text-xs">
											{appointment.address}
										</p>
									</div>
								))
							) : (
								<div className="text-muted-foreground flex h-24 items-center justify-center rounded-lg border text-center text-sm">
									No appointments found.
								</div>
							)}
						</div>

						<div className="hidden w-full overflow-x-auto rounded-lg border md:block">
							<Table className="min-w-[980px]">
								<TableHeader>
									<TableRow>
										<TableHead>Patient</TableHead>
										<TableHead>Phone</TableHead>
										<TableHead>DOB</TableHead>
										<TableHead>Type</TableHead>
										<TableHead>Date</TableHead>
										<TableHead>Time</TableHead>
										<TableHead>Exam</TableHead>
										<TableHead>Pin</TableHead>
										<TableHead>Address</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{isLoadingAppointments ? (
										<TableRow>
											<TableCell
												colSpan={9}
												className="h-24 text-center text-sm"
											>
												<span className="text-muted-foreground inline-flex items-center gap-2">
													<Loader2 className="h-4 w-4 animate-spin" />
													Loading appointments...
												</span>
											</TableCell>
										</TableRow>
									) : paginatedAppointments.length > 0 ? (
										paginatedAppointments.map(
											(appointment) => (
												<TableRow key={appointment.id}>
													<TableCell className="font-medium">
														{appointment.full_name}
													</TableCell>
													<TableCell>
														{
															appointment.phone_number
														}
													</TableCell>
													<TableCell>
														{appointment.dob}
													</TableCell>
													<TableCell>
														{
															appointment.appointment_type
														}
													</TableCell>
													<TableCell>
														{
															appointment.appointment_date
														}
													</TableCell>
													<TableCell>
														{
															appointment.appointment_time
														}
													</TableCell>
													<TableCell>
														{appointment.exam_type}
													</TableCell>
													<TableCell>
														{appointment.pin_code}
													</TableCell>
													<TableCell className="max-w-[280px] truncate">
														{appointment.address}
													</TableCell>
												</TableRow>
											),
										)
									) : (
										<TableRow>
											<TableCell
												colSpan={9}
												className="text-muted-foreground h-24 text-center text-sm"
											>
												No appointments found.
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</div>

						{appointments.length > APPOINTMENTS_PER_PAGE && (
							<div className="mt-3 flex flex-col items-start gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
								<span className="text-muted-foreground">
									Page {appointmentsPage} of{" "}
									{totalAppointmentPages}
								</span>
								<div className="flex gap-1">
									<Button
										size="icon"
										variant="ghost"
										onClick={() =>
											setAppointmentsPage((page) =>
												Math.max(1, page - 1),
											)
										}
										disabled={appointmentsPage === 1}
									>
										<ChevronLeft className="h-4 w-4" />
									</Button>
									<Button
										size="icon"
										variant="ghost"
										onClick={() =>
											setAppointmentsPage((page) =>
												Math.min(
													totalAppointmentPages,
													page + 1,
												),
											)
										}
										disabled={
											appointmentsPage ===
											totalAppointmentPages
										}
									>
										<ChevronRight className="h-4 w-4" />
									</Button>
								</div>
							</div>
						)}
					</div>
				</div>
			</section>
		</div>
	);
};

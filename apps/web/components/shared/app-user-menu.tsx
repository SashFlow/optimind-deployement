"use client";

import { authClient } from "@repo/auth/client";
import { config } from "@repo/config";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { cn } from "@repo/ui/utils";
import { BadgeCheckIcon, HeartPulseIcon, LogOutIcon } from "lucide-react";
import { useState } from "react";
import { AccountSettingsDialog } from "@/components/shared/account-settings-dialog";
import { HealthStatusDialog } from "@/components/shared/health-status-dialog";
import { useSession } from "@/context/SessionProvider";

function getInitials(name: string, email: string) {
	const fromName = name
		.trim()
		.split(/\s+/)
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();
	if (fromName) return fromName;
	return email.trim().slice(0, 2).toUpperCase() || "?";
}

function formatRole(role?: string | null) {
	if (!role) return "Member";
	if (role === "admin") return "Admin";
	return role.charAt(0).toUpperCase() + role.slice(1);
}

export function AppUserMenu({
	className,
	showMeta = true,
	align = "end",
	side = "bottom",
}: {
	className?: string;
	showMeta?: boolean;
	align?: "start" | "center" | "end";
	side?: "top" | "right" | "bottom" | "left";
}) {
	const { user } = useSession();
	const name = user?.name ?? "Account";
	const email = user?.email ?? "";
	const initials = getInitials(name, email);
	const roleLabel = formatRole(user?.role);
	const [accountOpen, setAccountOpen] = useState(false);
	const [healthOpen, setHealthOpen] = useState(false);

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
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					className={cn(
						showMeta
							? "inline-flex h-16 items-center gap-2 rounded-full border border-primary bg-white px-1.5 text-left shadow-xs outline-none backdrop-blur-sm transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-ring"
							: "inline-flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-white shadow-sm outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-ring",
						className,
					)}
					aria-label={showMeta ? undefined : `Account: ${name}`}
				>
					<Avatar className={showMeta ? "size-14!" : "size-full"}>
						<AvatarImage
							src={user?.image ?? undefined}
							alt={name}
						/>
						<AvatarFallback className="text-xs">
							{initials}
						</AvatarFallback>
					</Avatar>
					{showMeta && name && email ? (
						<div className="mr-2 hidden min-w-0 text-end leading-tight lg:block">
							<div className="truncate font-medium text-foreground text-sm">
								{name}
							</div>
							<div className="truncate text-muted-foreground text-xs">
								{roleLabel}
							</div>
						</div>
					) : null}
				</DropdownMenuTrigger>
				<DropdownMenuContent align={align} side={side} sideOffset={8}>
					<DropdownMenuItem
						className="h-12 cursor-pointer"
						onSelect={() => setAccountOpen(true)}
					>
						<BadgeCheckIcon className="mr-3 size-5" />
						Account
					</DropdownMenuItem>
					<DropdownMenuItem
						className="h-12 cursor-pointer"
						onSelect={() => setHealthOpen(true)}
					>
						<HeartPulseIcon className="mr-3 size-5" />
						Health
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						className="h-12 cursor-pointer"
						onClick={onLogout}
					>
						<LogOutIcon className="mr-3 size-5" />
						Log out
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<AccountSettingsDialog
				open={accountOpen}
				onOpenChange={setAccountOpen}
			/>
			<HealthStatusDialog
				open={healthOpen}
				onOpenChange={setHealthOpen}
			/>
		</>
	);
}

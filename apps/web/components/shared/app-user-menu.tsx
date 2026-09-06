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
import { useSession } from "@saas/auth/hooks/use-session";
import { BadgeCheckIcon, LogOutIcon, ShieldIcon } from "lucide-react";
import Link from "next/link";

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
}: {
	className?: string;
	showMeta?: boolean;
}) {
	const { user } = useSession();
	const name = user?.name ?? "Account";
	const email = user?.email ?? "";
	const initials = getInitials(name, email);
	const roleLabel = formatRole(user?.role);
	const isAdmin = user?.role === "admin";

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
		<DropdownMenu>
			<DropdownMenuTrigger
				className={cn(
					"inline-flex h-16 items-center gap-2 rounded-full border border-border/60 bg-white px-1.5 text-left shadow-xs outline-none backdrop-blur-sm transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-ring",
					className,
				)}
			>
				<Avatar className="size-14!">
					<AvatarImage src={user?.image ?? undefined} alt={name} />
					<AvatarFallback className="text-xs">{initials}</AvatarFallback>
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
			<DropdownMenuContent align="end" sideOffset={8}>
				<DropdownMenuItem asChild className="h-12 cursor-pointer">
					<Link href="/app/settings/general">
						<BadgeCheckIcon className="mr-3 size-5" />
						Account
					</Link>
				</DropdownMenuItem>
				{isAdmin ? (
					<DropdownMenuItem asChild className="h-12 cursor-pointer">
						<Link href="/app/settings/users">
							<ShieldIcon className="mr-3 size-5" />
							Admin
						</Link>
					</DropdownMenuItem>
				) : null}
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
	);
}

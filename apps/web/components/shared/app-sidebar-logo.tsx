"use client";

import { config } from "@repo/config";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { cn } from "@repo/ui/utils";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { useOrganizationListQuery } from "@saas/organizations/lib/api";
import { clearCache } from "@shared/lib/cache";
import { GalleryVerticalEndIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

const logoButtonClass =
	"flex size-16 shrink-0 items-center justify-center rounded-full border border-border/40 bg-white text-primary shadow-sm outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-ring";

export function AppSidebarLogo({ className }: { className?: string }) {
	const { activeOrganization, setActiveOrganization } =
		useActiveOrganization();
	const { data: organizations } = useOrganizationListQuery();

	const teams = (organizations ?? []).map((organization) => ({
		id: organization.id,
		slug: organization.slug,
		name: organization.name,
	}));
	const activeTeam =
		teams.find((team) => team.id === activeOrganization?.id) ?? teams[0];

	if (!activeTeam) {
		return (
			<div className={cn(logoButtonClass, className)} aria-hidden>
				<GalleryVerticalEndIcon className="size-7" />
			</div>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				className={cn(logoButtonClass, className)}
				aria-label={`Organization: ${activeTeam.name}`}
			>
				<GalleryVerticalEndIcon className="size-7" />
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="w-56"
				align="start"
				side="right"
				sideOffset={10}
			>
				<DropdownMenuGroup>
					<DropdownMenuLabel className="text-muted-foreground text-xs">
						Teams
					</DropdownMenuLabel>
					{teams.map((team, index) => (
						<DropdownMenuItem
							key={team.id}
							onClick={async () => {
								await clearCache();
								await setActiveOrganization(team.slug);
							}}
							className="gap-2 p-2"
						>
							<div className="flex size-6 items-center justify-center rounded-md border">
								<GalleryVerticalEndIcon className="size-3.5" />
							</div>
							<span className="truncate">{team.name}</span>
							<DropdownMenuShortcut>
								⌘{index + 1}
							</DropdownMenuShortcut>
						</DropdownMenuItem>
					))}
				</DropdownMenuGroup>
				{config.organizations.enableUsersToCreateOrganizations && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem asChild className="gap-2 p-2">
								<Link href="/new-organization">
									<div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
										<PlusIcon className="size-4" />
									</div>
									<div className="font-medium text-muted-foreground">
										Add team
									</div>
								</Link>
							</DropdownMenuItem>
						</DropdownMenuGroup>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

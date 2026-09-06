"use client";

import { Button } from "@repo/ui/button";
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@repo/ui/drawer";
import { PanelRightOpenIcon } from "lucide-react";
import { useState } from "react";
import type { AgentConfigDocument } from "@/lib/agent-config";
import type { Agent } from "@/services/api/types";
import { AgentConfigurePreview } from "./AgentConfigurePreview";

export function AgentConfigurePreviewDrawer({
	agent,
	savedVariables,
	hasUnsavedVariables,
	draftVersionId,
	avatarEnabled,
	avatarPreviewUrl,
}: {
	agent: Agent;
	savedVariables: AgentConfigDocument["variables"];
	hasUnsavedVariables?: boolean;
	draftVersionId?: string;
	avatarEnabled?: boolean;
	avatarPreviewUrl?: string | null;
}) {
	const [open, setOpen] = useState(false);

	return (
		<Drawer open={open} onOpenChange={setOpen} swipeDirection="right">
			<DrawerTrigger
				render={
					<Button variant="outline" size="sm" className="md:hidden">
						<PanelRightOpenIcon data-icon="inline-start" />
						Preview
					</Button>
				}
			/>
			<DrawerContent className="h-full max-h-none data-[swipe-direction=right]:w-full sm:data-[swipe-direction=right]:w-full">
				<DrawerHeader className="sr-only">
					<DrawerTitle>Debug & Preview</DrawerTitle>
				</DrawerHeader>
				<AgentConfigurePreview
					agent={agent}
					savedVariables={savedVariables}
					hasUnsavedVariables={hasUnsavedVariables}
					draftVersionId={draftVersionId}
					avatarEnabled={avatarEnabled}
					avatarPreviewUrl={avatarPreviewUrl}
					onCancel={() => setOpen(false)}
				/>
			</DrawerContent>
		</Drawer>
	);
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@repo/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/tabs";
import { TooltipProvider } from "@repo/ui/tooltip";

const TABS = [
    {
        value: "configure",
        label: "Configure",
        href: (id: string) => `/app/agents/${id}/configure`,
    },
    {
        value: "monitor",
        label: "Monitor",
        href: (id: string) => `/app/agents/${id}/monitor`,
    },
    {
        value: "logs",
        label: "Logs",
        href: (id: string) => `/app/agents/${id}/logs`,
    },
    {
        value: "access-control",
        label: "Access Control",
        href: (id: string) => `/app/agents/${id}/access-control`,
    },
] as const;

type TabValue = (typeof TABS)[number]["value"];

type AgentNavProps = {
    agentId: string;
};

function tabFromPathname(pathname: string, agentId: string): TabValue {
	const base = `/app/agents/${agentId}`;
	if (
		pathname === `${base}/access-control` ||
		pathname.startsWith(`${base}/access-control/`)
	) {
		return "access-control";
	}
	if (pathname === `${base}/monitor` || pathname.startsWith(`${base}/monitor/`)) {
		return "monitor";
	}
	if (pathname === `${base}/logs` || pathname.startsWith(`${base}/logs/`)) {
		return "logs";
	}
	return "configure";
}

export function AgentNav({ agentId }: AgentNavProps) {
    const pathname = usePathname();
    const router = useRouter();
    const active = tabFromPathname(pathname, agentId);
    const tabs = TABS
    const tabItems = tabs.map((tab) => ({
        value: tab.value,
        label: tab.label,
    }));
    const activeLabel =
        tabs.find((tab) => tab.value === active)?.label ?? "Settings";

    function navigateToTab(value: string | null) {
        const next = tabs.find((tab) => tab.value === value);
        if (next) router.push(next.href(agentId));
    }

    return (
        <div className="mx-auto w-full max-w-[1600px] px-4 pt-6 md:px-6">
            <TooltipProvider>
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 sm:flex-none">
                        <Select
                            value={active}
                            onValueChange={navigateToTab}
                            items={tabItems}
                        >
                            <SelectTrigger
                                aria-label="Settings section"
                                className="w-full max-w-56 bg-background sm:hidden"
                            >
                                <SelectValue>{activeLabel}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {tabs.map((tab) => (
                                    <SelectItem key={tab.value} value={tab.value}>
                                        {tab.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Tabs
                            value={active}
                            onValueChange={navigateToTab}
                            className="hidden sm:block"
                        >
                            <TabsList className="w-fit">
                                {tabs.map((tab) => (
                                    <TabsTrigger
                                        key={tab.value}
                                        value={tab.value}
                                        nativeButton={false}
                                        render={<Link href={tab.href(agentId)} />}
                                        className="flex-none px-3"
                                    >
                                        {tab.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                    </div>
                </div>
            </TooltipProvider>
        </div>
    );
}

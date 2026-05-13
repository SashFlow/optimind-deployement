"use client";

import { AgentRpcProvider } from "@components/agents-ui/agent-rpc-provider";
import { AgentSessionProvider } from "@components/agents-ui/agent-session-provider";
import { StartAudioButton } from "@components/agents-ui/start-audio-button";
import { ViewController } from "@components/app/view-controller";
import { scenarios } from "@constants";
import { useAgentErrors } from "@hooks/useAgentErrors";
import { useDebugMode } from "@hooks/useDebug";
import { useSession } from "@livekit/components-react";
import { Button } from "@repo/ui/button";
import { Toaster } from "@repo/ui/sonner";
import { TokenSource } from "livekit-client";
import { ArrowLeftIcon, FileWarningIcon as WarningIcon } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import type { AppConfig } from "@/types/app-config";
import { useDemoContext } from "@context/DemoProvider";
import { orpcClient } from "@shared/lib/orpc-client";

const IN_DEVELOPMENT = process.env.NODE_ENV !== "production";

function AppSetup() {
    useDebugMode({ enabled: IN_DEVELOPMENT });
    useAgentErrors();

    return null;
}

interface AppProps {
    appConfig: AppConfig;
}

type ScenarioSlug = keyof typeof scenarios;

function isScenarioSlug(value: string): value is ScenarioSlug {
    return value in scenarios;
}

export function App({ appConfig }: AppProps) {
    const { usecase } = useDemoContext()
    const searchParams = useSearchParams();
    const language: string = searchParams.get("language") || "English";
    const selectedAgent: string | null = searchParams.get("selectedAgent") || "Sanjay";

    if (!usecase) {
        return (
            <main className="bg-background min-h-screen">
                <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10 md:px-10">
                    <div>
                        <Button asChild variant="ghost" className="mb-4 pl-0">
                            <Link href="/" className="p-0">
                                <ArrowLeftIcon className="size-4" />
                                Back
                            </Link>
                        </Button>
                        <h1 className="text-3xl font-semibold tracking-tight">
                            Audio Scenario Not Found
                        </h1>
                        <p className="text-muted-foreground mt-3">
                            The requested audio scenario does not exist.
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    const scenario = isScenarioSlug(usecase.slug) ? scenarios[usecase.slug] : scenarios['medical-examination'] 
    
    const tokenSource = TokenSource.endpoint(
        `/api/token?scenarioType=${encodeURIComponent(usecase.mode)}&slug=${encodeURIComponent(usecase.slug)}&language=${encodeURIComponent(language)}&selectedAgent=${encodeURIComponent(selectedAgent)}`,
    );

    const session = useSession(
        tokenSource,
        appConfig.agentName ? { agentName: appConfig.agentName } : undefined,
    );

  const handleUseSession = async () => {
    await orpcClient.links.reduceSession({ id: usecase.id });
    
  };

    return (
        <AgentSessionProvider session={session}>
            <AgentRpcProvider>
                <AppSetup />
                <main className="grid h-full grid-cols-1 place-content-center">
                    <ViewController appConfig={appConfig} scenario={scenario} useScenario={handleUseSession} />
                </main>
                <StartAudioButton
                    label="Start"
                    className="fixed right-6 bottom-6"
                    variant="secondary"
                />
                <Toaster
                    icons={{
                        warning: <WarningIcon />,
                    }}
                    position="top-center"
                    className="toaster group"
                    style={
                        {
                            "--normal-bg": "var(--popover)",
                            "--normal-text": "var(--popover-foreground)",
                            "--normal-border": "var(--border)",
                        } as React.CSSProperties
                    }
                />
            </AgentRpcProvider>
        </AgentSessionProvider>
    );
}

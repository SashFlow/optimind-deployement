"use client";

import { PhoneOutboundView } from "@components/app/phone-outbound-view";
import { useDemoContext } from "@context/DemoProvider";
import { orpcClient } from "@shared/lib/orpc-client";

export default function DemoPhonePage() {
	const { usecase, activeUsecase, loading } = useDemoContext();

	if (loading || usecase == null) {
		return null;
	}

	if (usecase.approvedSessions === 0) {
		return (
			<div className="text-foreground flex h-full w-full justify-around">
				Trial period is over
			</div>
		);
	}

	return (
		<PhoneOutboundView
			scenarioSlug={activeUsecase ?? undefined}
			backHref={`/demo/${usecase.token}`}
			onCallDispatched={async () => {
				await orpcClient.links.reduceSession({ id: usecase.id });
			}}
		/>
	);
}

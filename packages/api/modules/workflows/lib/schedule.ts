import { createWorkflowRun, db } from "@repo/database";
import { logger } from "@repo/logs";
import { processWorkflowRun } from "./runner";
import { envVarsToRecord, getNodeType, parseGraph } from "./template";

/** Supports standard 5-field cron, step minutes/hours, @hourly, @daily. */
export function nextCronFire(cron: string, from = new Date()): Date | null {
	const trimmed = cron.trim();
	if (trimmed === "@hourly") {
		const d = new Date(from);
		d.setMinutes(0, 0, 0);
		d.setHours(d.getHours() + 1);
		return d;
	}
	if (trimmed === "@daily") {
		const d = new Date(from);
		d.setHours(0, 0, 0, 0);
		d.setDate(d.getDate() + 1);
		return d;
	}
	const parts = trimmed.split(/\s+/);
	if (parts.length < 5) {
		return null;
	}
	const [minPart, hourPart] = parts;
	const d = new Date(from.getTime() + 60_000);
	d.setSeconds(0, 0);
	for (let i = 0; i < 24 * 60; i++) {
		const minute = d.getMinutes();
		const hour = d.getHours();
		const minOk =
			minPart === "*" ||
			minPart === String(minute) ||
			(minPart.startsWith("*/") &&
				minute % Number(minPart.slice(2) || 1) === 0);
		const hourOk =
			hourPart === "*" ||
			hourPart === String(hour) ||
			(hourPart.startsWith("*/") &&
				hour % Number(hourPart.slice(2) || 1) === 0);
		if (minOk && hourOk) {
			return d;
		}
		d.setMinutes(d.getMinutes() + 1);
	}
	return null;
}

function matchCronNow(cron: string, at = new Date()): boolean {
	const trimmed = cron.trim();
	if (trimmed === "@hourly") {
		return at.getMinutes() === 0;
	}
	if (trimmed === "@daily") {
		return at.getHours() === 0 && at.getMinutes() === 0;
	}
	const parts = trimmed.split(/\s+/);
	if (parts.length < 5) {
		return false;
	}
	const [minPart, hourPart] = parts;
	const minute = at.getMinutes();
	const hour = at.getHours();
	const minOk =
		minPart === "*" ||
		minPart === String(minute) ||
		(minPart.startsWith("*/") &&
			minute % Number(minPart.slice(2) || 1) === 0);
	const hourOk =
		hourPart === "*" ||
		hourPart === String(hour) ||
		(hourPart.startsWith("*/") &&
			hour % Number(hourPart.slice(2) || 1) === 0);
	return minOk && hourOk;
}

/**
 * Create SCHEDULE runs for active published workflows whose cron matches
 * the current minute and that have not already fired this minute.
 */
export async function tickScheduledWorkflows() {
	const now = new Date();
	const minuteStart = new Date(now);
	minuteStart.setSeconds(0, 0);

	const workflows = await db.campaignWorkflow.findMany({
		where: {
			publishedVersionId: { not: null },
			campaign: { status: "ACTIVE" },
		},
		include: {
			publishedVersion: true,
		},
		take: 100,
	});

	let started = 0;
	for (const wf of workflows) {
		if (!wf.publishedVersionId || !wf.publishedVersion) {
			continue;
		}
		const { nodes } = parseGraph(
			wf.publishedVersion.nodes,
			wf.publishedVersion.edges,
		);
		const scheduled = nodes.find(
			(n) => getNodeType(n) === "start.scheduled",
		);
		if (!scheduled) {
			continue;
		}
		const cron = String(scheduled.data.config.cron ?? "0 * * * *");
		if (!matchCronNow(cron, now)) {
			continue;
		}

		const already = await db.workflowRun.findFirst({
			where: {
				workflowId: wf.id,
				triggerType: "SCHEDULE",
				createdAt: { gte: minuteStart },
			},
			select: { id: true },
		});
		if (already) {
			continue;
		}

		const env = envVarsToRecord(wf.envVars);
		const trigger = {
			scheduledAt: now.toISOString(),
			cron,
			next: nextCronFire(cron, now)?.toISOString() ?? null,
		};
		const run = await createWorkflowRun({
			organizationId: wf.organizationId,
			campaignId: wf.campaignId,
			workflowId: wf.id,
			workflowVersionId: wf.publishedVersionId,
			triggerType: "SCHEDULE",
			triggerPayload: trigger,
			envSnapshot: env,
			context: { env, trigger, nodes: {} },
			status: "PENDING",
		});
		try {
			await processWorkflowRun(run.id);
			started++;
		} catch (err) {
			logger.error("Scheduled workflow run failed", {
				workflowId: wf.id,
				err,
			});
		}
	}

	return { started };
}

import { continueAfterWait } from "@repo/api/modules/workflows/lib/continue-wait";
import { tickWorkflowRunner } from "@repo/api/modules/workflows/lib/runner";
import { decideWorkflowApproval } from "@repo/database";
import { NextResponse } from "next/server";

export async function GET(
	request: Request,
	context: { params: Promise<{ token: string }> },
) {
	const { token } = await context.params;
	const url = new URL(request.url);
	const decision = url.searchParams.get("decision");
	if (decision !== "APPROVED" && decision !== "REJECTED") {
		return NextResponse.json(
			{ error: "decision must be APPROVED or REJECTED" },
			{ status: 400 },
		);
	}
	const approval = await decideWorkflowApproval(token, decision);
	if (!approval) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
	await continueAfterWait({
		waitId: approval.waitId,
		runId: approval.runId,
		nodeId: approval.step.nodeId,
		resumePayload: {
			decision,
			approved: decision === "APPROVED",
			decidedAt: new Date().toISOString(),
		},
	});
	await tickWorkflowRunner(3);
	return NextResponse.redirect(
		new URL(
			`/app/campaigns/${approval.run.campaignId}/approvals/${token}`,
			url.origin,
		),
	);
}

export async function POST(
	request: Request,
	context: { params: Promise<{ token: string }> },
) {
	const { token } = await context.params;
	const body = (await request.json().catch(() => ({}))) as {
		decision?: string;
		decidedBy?: string;
	};
	if (body.decision !== "APPROVED" && body.decision !== "REJECTED") {
		return NextResponse.json(
			{ error: "decision must be APPROVED or REJECTED" },
			{ status: 400 },
		);
	}
	const approval = await decideWorkflowApproval(
		token,
		body.decision,
		body.decidedBy,
	);
	if (!approval) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
	await continueAfterWait({
		waitId: approval.waitId,
		runId: approval.runId,
		nodeId: approval.step.nodeId,
		resumePayload: {
			decision: body.decision,
			decidedBy: body.decidedBy ?? null,
			approved: body.decision === "APPROVED",
			decidedAt: new Date().toISOString(),
		},
	});
	await tickWorkflowRunner(3);
	return NextResponse.json({ ok: true, decision: approval.decision });
}

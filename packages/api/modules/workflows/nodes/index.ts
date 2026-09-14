import { getNodeType } from "../lib/template";
import type { NodeHandlerArgs, NodeHandlerResult } from "../types";
import {
	handleAgent,
	handleHumanApproval,
	handleKnowledgeRetrieve,
	handleLlm,
} from "./ai";
import {
	handleEnd,
	handleHttpRequest,
	handleStartScheduled,
	handleStartWebhook,
} from "./basic";
import { handleCodeJs, handleIf, handleLoop } from "./control";
import {
	handleStorageAzure,
	handleStorageGcp,
	handleStorageS3,
} from "./storage";

export async function executeNode(
	args: NodeHandlerArgs,
): Promise<NodeHandlerResult> {
	const type = getNodeType(args.node);
	switch (type) {
		case "start.webhook":
			return handleStartWebhook(args);
		case "start.scheduled":
			return handleStartScheduled(args);
		case "control.if":
			return handleIf(args);
		case "control.loop":
			return handleLoop(args);
		case "http.request":
			return handleHttpRequest(args);
		case "code.js":
			return handleCodeJs(args);
		case "human.approval":
			return handleHumanApproval(args);
		case "knowledge.retrieve":
			return handleKnowledgeRetrieve(args);
		case "ai.agent":
			return handleAgent(args);
		case "ai.llm":
			return handleLlm(args);
		case "storage.s3":
			return handleStorageS3(args);
		case "storage.azure":
			return handleStorageAzure(args);
		case "storage.gcp":
			return handleStorageGcp(args);
		case "end":
			return handleEnd(args);
		default:
			throw new Error(`Unknown node type: ${type}`);
	}
}

export { finalizeHumanApprovalWait } from "./ai";

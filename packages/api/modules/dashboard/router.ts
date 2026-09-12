import {
	actions,
	analytics,
	collectedFields,
	cost,
	latency,
	quality,
	stats,
	usage,
} from "./procedures";

export const dashboardRouter = {
	stats,
	analytics,
	usage,
	cost,
	quality,
	actions,
	latency,
	collectedFields,
};

export type { PlivoConfig } from "./src/client";
export { getPlivoConfig, plivoRequest } from "./src/client";
export {
	assignNumberToTrunk,
	createInboundTrunk,
	createOriginationUri,
	createOutboundCredential,
	createOutboundTrunk,
	listPhoneNumbers,
	updatePhoneNumber,
} from "./src/numbers";

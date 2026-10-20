import type { InworldPhoneticDetail } from "../inworld/types";

export type LipsyncPacket =
	| { type: "turn_start"; turn_id: string }
	| {
			type: "phonemes";
			turn_id: string;
			phoneticDetails: InworldPhoneticDetail[];
			offset?: number;
	  }
	| { type: "turn_end"; turn_id: string };

export const LIPSYNC_TOPIC = "avatar.lipsync";

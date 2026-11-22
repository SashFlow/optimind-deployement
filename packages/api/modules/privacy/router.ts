import {
	eraseEndUser,
	exportEndUser,
	exportMyData,
	runRetentionPurge,
} from "./procedures";

export const privacyRouter = {
	exportMyData,
	exportEndUser,
	eraseEndUser,
	runRetentionPurge,
};

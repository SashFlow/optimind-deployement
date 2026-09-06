import { plivoRequest, type PlivoConfig } from "./client";

export async function listPhoneNumbers(config?: PlivoConfig) {
	return plivoRequest<{
		objects: Array<{
			number: string;
			number_id?: string;
			alias?: string;
			voice_enabled?: boolean;
			sms_enabled?: boolean;
			app_id?: string;
		}>;
	}>("/Number/", { config });
}

export async function updatePhoneNumber(
	numberE164WithoutPlus: string,
	data: { app_id?: string; alias?: string },
	config?: PlivoConfig,
) {
	return plivoRequest(`/Number/${numberE164WithoutPlus}/`, {
		method: "POST",
		body: data,
		config,
	});
}

export async function createOriginationUri(opts: {
	name: string;
	uri: string;
	config?: PlivoConfig;
}) {
	return plivoRequest<{ uri_uuid: string; message: string }>("/Zentrunk/URI/", {
		body: { name: opts.name, uri: opts.uri },
		config: opts.config,
	});
}

export async function createInboundTrunk(opts: {
	name: string;
	primaryUriUuid: string;
	secure?: boolean;
	config?: PlivoConfig;
}) {
	return plivoRequest<{ trunk_id: string }>("/Zentrunk/Trunk/", {
		body: {
			name: opts.name,
			trunk_direction: "inbound",
			primary_uri_uuid: opts.primaryUriUuid,
			secure: opts.secure ?? false,
		},
		config: opts.config,
	});
}

export async function createOutboundCredential(opts: {
	name: string;
	username: string;
	password: string;
	config?: PlivoConfig;
}) {
	return plivoRequest<{ credential_uuid: string }>("/Zentrunk/Credential/", {
		body: {
			name: opts.name,
			username: opts.username,
			password: opts.password,
		},
		config: opts.config,
	});
}

export async function createOutboundTrunk(opts: {
	name: string;
	credentialUuid: string;
	secure?: boolean;
	config?: PlivoConfig;
}) {
	return plivoRequest<{ trunk_id: string; trunk_domain?: string }>(
		"/Zentrunk/Trunk/",
		{
			body: {
				name: opts.name,
				trunk_direction: "outbound",
				credential_uuid: opts.credentialUuid,
				secure: opts.secure ?? false,
			},
			config: opts.config,
		},
	);
}

export async function assignNumberToTrunk(
	numberE164WithoutPlus: string,
	trunkId: string,
	config?: PlivoConfig,
) {
	return updatePhoneNumber(numberE164WithoutPlus, { app_id: trunkId }, config);
}

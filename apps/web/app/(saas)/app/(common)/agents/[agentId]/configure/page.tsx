"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { useParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { AgentConfigureForm } from "@/components/saas/agents/AgentConfigureForm";
import { PageSectionSkeleton } from "@/components/saas/shared/skeletons";
import {
	type AgentConfigDocument,
	createDefaultAgentConfig,
	getVoicemailConfigError,
	normalizeAgentConfig,
} from "@/lib/agent-config";
import { getAvatarPreviewUrl } from "@/lib/stock-avatars";
import {
	useAgentQuery,
	useAgentVersionsQuery,
	usePublishAgentVersionMutation,
	useUpdateAgentVersionMutation,
} from "@/services/api/hooks";

export default function AgentConfigurePage() {
	const params = useParams<{ agentId: string }>();
	const agentId = params.agentId;
	const { activeOrganization, loaded } = useActiveOrganization();
	const activeOrganizationId = activeOrganization?.id ?? null;

	const agentQuery = useAgentQuery(activeOrganizationId, agentId);
	const versionsQuery = useAgentVersionsQuery(activeOrganizationId, agentId);

	const draftVersion = React.useMemo(() => {
		const versions = versionsQuery.data ?? [];
		return (
			versions.find((v) => v.is_draft) ??
			versions.find(
				(v) => v.id === agentQuery.data?.published_version_id,
			) ??
			versions[0]
		);
	}, [agentQuery.data?.published_version_id, versionsQuery.data]);

	const [loadedVersionId, setLoadedVersionId] = React.useState<string | null>(
		null,
	);
	const [config, setConfig] = React.useState<AgentConfigDocument>(
		createDefaultAgentConfig(),
	);
	const [savedConfig, setSavedConfig] = React.useState<AgentConfigDocument>(
		createDefaultAgentConfig(),
	);

	if (draftVersion && draftVersion.id !== loadedVersionId) {
		const normalized = normalizeAgentConfig(draftVersion.config);
		setLoadedVersionId(draftVersion.id);
		setConfig(normalized);
		setSavedConfig(normalized);
	}

	const isDirty = React.useMemo(
		() => JSON.stringify(config) !== JSON.stringify(savedConfig),
		[config, savedConfig],
	);
	const hasUnsavedVariables = React.useMemo(
		() =>
			JSON.stringify(config.variables) !==
			JSON.stringify(savedConfig.variables),
		[config.variables, savedConfig.variables],
	);
	const avatarEnabled = savedConfig.avatar?.enabled ?? false;
	const avatarPreviewUrl = getAvatarPreviewUrl(
		savedConfig.avatar?.external_avatar_id,
	);

	const updateVersion = useUpdateAgentVersionMutation(
		activeOrganizationId,
		agentId,
		draftVersion?.id ?? "",
		{
			onSuccess: () => {
				versionsQuery.refetch();
				toast.success("Draft saved");
			},
			onError: (error) => toast.error(error.message),
		},
	);
	const publishVersion = usePublishAgentVersionMutation(
		activeOrganizationId,
		agentId,
		{
			onSuccess: () => {
				agentQuery.refetch();
				versionsQuery.refetch();
				toast.success("Agent published");
			},
			onError: (error) => toast.error(error.message),
		},
	);

	async function handleSave() {
		if (!draftVersion || !agentQuery.data) {
			return;
		}
		const voicemailError = getVoicemailConfigError(config.voicemail);
		if (voicemailError) {
			toast.error(voicemailError);
			return;
		}
		await updateVersion.mutateAsync({ config });
		setSavedConfig(config);
	}

	async function handlePublish() {
		if (!draftVersion) {
			return;
		}
		if (isDirty) {
			await handleSave();
		}
		await publishVersion.mutateAsync(draftVersion.id);
	}

	if (!loaded) {
		return <PageSectionSkeleton variant="form" />;
	}

	if (!activeOrganizationId) {
		return (
			<p className="p-6 text-sm text-muted-foreground">
				Select an organization.
			</p>
		);
	}

	if (!agentQuery.data || !draftVersion) {
		return <PageSectionSkeleton variant="form" />;
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<AgentConfigureForm
				config={config}
				onConfigChange={setConfig}
				organizationId={activeOrganizationId}
				versionId={draftVersion.id}
				agent={agentQuery.data}
				savedVariables={savedConfig.variables}
				hasUnsavedVariables={hasUnsavedVariables}
				avatarEnabled={avatarEnabled}
				avatarPreviewUrl={avatarPreviewUrl}
				isDirty={isDirty}
				isSaving={updateVersion.isPending}
				isPublishing={publishVersion.isPending}
				onSave={handleSave}
				onPublish={handlePublish}
			/>
		</div>
	);
}

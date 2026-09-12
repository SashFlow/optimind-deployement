import { fillDemoData } from "./procedures/fill-demo-data";
import { findOrganization } from "./procedures/find-organization";
import { inviteMember } from "./procedures/invite-member";
import { listInvitations } from "./procedures/list-invitations";
import { listOrganizations } from "./procedures/list-organizations";
import { listUsers } from "./procedures/list-users";
import { reinviteMember } from "./procedures/reinvite-member";
import { revokeInvite } from "./procedures/revoke-invite";
import { setOrganizationMembership } from "./procedures/set-organization-membership";

export const adminRouter = {
	users: {
		list: listUsers,
		setOrganizationMembership,
	},
	invitations: {
		list: listInvitations,
		invite: inviteMember,
		reinvite: reinviteMember,
		revoke: revokeInvite,
	},
	organizations: {
		list: listOrganizations,
		find: findOrganization,
		fillDemoData,
	},
};

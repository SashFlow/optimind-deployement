import { AdminMembersTabs } from "@/components/saas/admin/AdminMembersTabs";
import { getSession } from "@/services/session";

export default async function AdminUsersPage() {
	const session = await getSession();
	const isSuperAdmin = session?.user.role === "admin";

	return <AdminMembersTabs isSuperAdmin={isSuperAdmin} />;
}

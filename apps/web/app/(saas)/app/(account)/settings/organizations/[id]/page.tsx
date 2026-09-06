import { AdminOrganizationEditor } from "@/components/saas/admin/AdminOrganizationEditor";

export default async function AdminOrganizationPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return <AdminOrganizationEditor id={id} />;
}

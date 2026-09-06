import { OrganizationList } from "@saas/admin/component/organizations/OrganizationList";

export default function SettingsOrganizationsPage() {
	return (
		<section className="overflow-hidden rounded-3xl border bg-card p-6 shadow-sm ring-1 ring-black/5">
			<h1 className="mb-4 font-semibold text-xl tracking-tight">
				Organizations
			</h1>
			<OrganizationList />
		</section>
	);
}

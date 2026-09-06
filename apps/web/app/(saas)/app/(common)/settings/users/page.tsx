import { UserList } from "@saas/admin/component/users/UserList";

export default function SettingsUsersPage() {
	return (
		<section className="overflow-hidden rounded-3xl border bg-card p-6 shadow-sm ring-1 ring-black/5">
			<h1 className="mb-4 font-semibold text-xl tracking-tight">Users</h1>
			<UserList />
		</section>
	);
}

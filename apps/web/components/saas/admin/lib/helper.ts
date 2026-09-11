export function formatRole(role: string) {
	return role.charAt(0).toUpperCase() + role.slice(1);
}

export async function copyText(value: string, successMessage: string) {
	try {
		await navigator.clipboard.writeText(value);
		toast.success(successMessage);
	} catch {
		toast.error("Could not copy to clipboard");
	}
}

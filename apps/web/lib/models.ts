import type { ProviderModel } from "@/services/api/types";

export function formatModelLabel(model: ProviderModel): string {
	return model.display_name || model.id;
}

export type LocaleOption = {
	value: string;
	label: string;
};

export function getOptionLabel(
	options: LocaleOption[],
	value: string | null | undefined,
): string {
	if (!value) return "";
	return options.find((option) => option.value === value)?.label ?? value;
}

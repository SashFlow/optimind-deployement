"use client";

import { Toggle } from "@repo/ui/toggle";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { useIsClient } from "usehooks-ts";

export function ColorModeToggle() {
	const { resolvedTheme, setTheme, theme } = useTheme();
	const [value, setValue] = useState<string>(theme ?? "system");
	const isClient = useIsClient();

	const colorModeOptions = [
		{
			value: "light",
			label: "Light",
			icon: SunIcon,
		},
		{
			value: "dark",
			label: "Dark",
			icon: MoonIcon,
		},
	];

	const toggleTheme = () => {
		if (resolvedTheme === "light") {
			setTheme("dark");
			setValue("dark");
		} else {
			setTheme("light");
			setValue("light");
		}
	};

	if (!isClient) {
		return null;
	}

	return (
		<Toggle onClick={toggleTheme} aria-label="Toggle color mode">
			{resolvedTheme === "light" ? (
				<SunIcon className="size-4" />
			) : (
				<MoonIcon className="size-4" />
			)}
		</Toggle>
	);
}

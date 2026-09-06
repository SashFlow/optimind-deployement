"use client";

import { Button } from "@repo/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@repo/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover";
import { Spinner } from "@repo/ui/spinner";
import { cn } from "@repo/ui/utils";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import * as React from "react";
import { getOptionLabel, type LocaleOption } from "@/lib/locales";

type LocaleComboboxProps = {
	options: LocaleOption[];
	value: string | null;
	onChange: (value: string | null) => void;
	placeholder?: string;
	allowNone?: boolean;
	disabled?: boolean;
	isLoading?: boolean;
	className?: string;
};

export function LocaleCombobox({
	options,
	value,
	onChange,
	placeholder = "Select option",
	allowNone = false,
	disabled = false,
	isLoading = false,
	className,
}: LocaleComboboxProps) {
	const [open, setOpen] = React.useState(false);
	const selectedLabel =
		value === null && allowNone
			? "None"
			: getOptionLabel(options, value) || placeholder;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						variant="outline"
						role="combobox"
						aria-expanded={open}
						disabled={disabled || isLoading}
						className={cn(
							"w-full justify-between bg-background font-normal",
							className,
						)}
					>
						{isLoading ? (
							<Spinner className="size-3.5" />
						) : (
							selectedLabel
						)}
						<ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
					</Button>
				}
			/>
			<PopoverContent
				className="w-[var(--anchor-width)] p-0"
				align="start"
			>
				<Command>
					<CommandInput
						placeholder={`Search ${placeholder.toLowerCase()}...`}
					/>
					<CommandList>
						<CommandEmpty>No matches found.</CommandEmpty>
						<CommandGroup>
							{allowNone ? (
								<CommandItem
									value="none"
									onSelect={() => {
										onChange(null);
										setOpen(false);
									}}
								>
									<CheckIcon
										className={cn(
											"mr-2 size-4",
											value === null
												? "opacity-100"
												: "opacity-0",
										)}
									/>
									None
								</CommandItem>
							) : null}
							{options.map((option) => (
								<CommandItem
									key={option.value}
									value={`${option.label} ${option.value}`}
									onSelect={() => {
										onChange(option.value);
										setOpen(false);
									}}
								>
									<CheckIcon
										className={cn(
											"mr-2 size-4",
											value === option.value
												? "opacity-100"
												: "opacity-0",
										)}
									/>
									{option.label}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

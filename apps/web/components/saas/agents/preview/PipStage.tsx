import { ReactNode } from "react";
import { cn } from "@repo/ui/utils";

export default function PipStage({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "relative h-20 w-28 overflow-hidden rounded-lg border bg-background shadow-md sm:h-24 sm:w-36",
                className,
            )}
        >
            {children}
        </div>
    );
}

import { ReactNode } from "react";
import { cn } from "@repo/ui/utils";


export default function MainStage({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-xl bg-black shadow-sm",
                className,
            )}
        >
            {children}
        </div>
    );
}

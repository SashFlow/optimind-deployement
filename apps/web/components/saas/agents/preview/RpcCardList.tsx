import { cn } from "@repo/ui/utils";
import { PreviewRpcCard } from "./usePreviewRoomData";

export default function RpcCardList({ cards }: { cards: PreviewRpcCard[] }) {
    if (cards.length === 0) {
        return null;
    }

    return (
        <div className="space-y-2">
            {cards.map((card) => (
                <div
                    key={`${card.method}-${card.id}`}
                    className="rounded-lg border bg-background p-3"
                >
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="text-sm font-medium">{card.title}</p>
                            {card.subtitle ? (
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {card.subtitle}
                                </p>
                            ) : null}
                        </div>
                        <span
                            className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
                                card.status === "success" &&
                                "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                                card.status === "warning" &&
                                "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                                (!card.status || card.status === "info") &&
                                "bg-muted text-muted-foreground",
                            )}
                        >
                            {card.method.replace(/^client\./, "")}
                        </span>
                    </div>
                    {card.fields.length > 0 ? (
                        <dl className="mt-3 space-y-1.5">
                            {card.fields.map((field) => (
                                <div
                                    key={`${card.id}-${field.label}`}
                                    className="grid grid-cols-[auto_1fr] gap-x-3 text-xs"
                                >
                                    <dt className="text-muted-foreground">
                                        {field.label}
                                    </dt>
                                    <dd className="text-right font-medium">
                                        {field.value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    ) : null}
                </div>
            ))}
        </div>
    );
}
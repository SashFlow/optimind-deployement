import { FileIcon } from "lucide-react";
import { PreviewFileItem } from "./usePreviewRoomData";

export default function FileList({ files }: { files: PreviewFileItem[] }) {
    if (files.length === 0) {
        return null;
    }

    return (
        <div className="space-y-2">
            {files.map((file) => {
                const isImage = file.mimeType?.startsWith("image/");
                return (
                    <div
                        key={file.id}
                        className="overflow-hidden rounded-lg border bg-background"
                    >
                        {isImage ? (
                            // Object URL from LiveKit byte stream; next/image is not suitable.
                            // eslint-disable-next-line @next/next/no-img-element
                            // biome-ignore lint/performance/noImgElement: LiveKit object URL
                            <img
                                src={file.url}
                                alt={file.name}
                                className="max-h-48 w-full object-contain bg-muted"
                            />
                        ) : null}
                        <div className="flex items-center gap-2 px-3 py-2 text-xs">
                            <FileIcon className="size-3.5 shrink-0 text-muted-foreground" />
                            <a
                                href={file.url}
                                download={file.name}
                                className="min-w-0 truncate font-medium underline-offset-2 hover:underline"
                            >
                                {file.name}
                            </a>
                            <span className="ml-auto shrink-0 text-muted-foreground">
                                {file.topic}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

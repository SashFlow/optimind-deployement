import type { FC, PropsWithChildren } from "react";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "../../../shadcn/resizable";

import { Thread } from "./thread.aui";

export const AssistantSidebar: FC<PropsWithChildren> = ({ children }) => {
	return (
		<ResizablePanelGroup orientation="horizontal">
			<ResizablePanel>{children}</ResizablePanel>
			<ResizableHandle />
			<ResizablePanel>
				<Thread />
			</ResizablePanel>
		</ResizablePanelGroup>
	);
};

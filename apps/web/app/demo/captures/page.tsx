import { CapturePlayground } from "@/components/demo/CapturePlayground";

export const metadata = {
	title: "Capture playground",
	description:
		"Password-gated playground to test ID, face, body capture, and confirmation UI without an agent.",
};

export default function CaptureDemoPage() {
	return <CapturePlayground />;
}

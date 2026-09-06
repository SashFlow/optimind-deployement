import { redirect } from "next/navigation";

export default function AppStartPage() {
	redirect("/app/dashboard");
}

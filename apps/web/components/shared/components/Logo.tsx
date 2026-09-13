import { cn } from "@repo/ui/utils";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Link } from "next-transition-router";

export function Logo({
	withLabel = true,
	className,
}: {
	className?: string;
	withLabel?: boolean;
}) {
	const router = useRouter();
	return (
		<span
			className={cn(
				"flex items-center font-semibold text-foreground leading-none",
				className,
			)}
		>
			<Image
				src="/images/logo.svg"
				alt="Optimind"
				width={64}
				height={64}
				onClick={() => router.push("/")}
			/>
			{withLabel && (
				<Link href="/" className="flex items-center">
					<Image
						src="/images/optimind.svg"
						alt="Optimind"
						width={100}
						height={100}
					/>
					<span className="ml-1 mt-5 text-xs text-primary">
						{" "}
						By Sashflow
					</span>
				</Link>
			)}
		</span>
	);
}

import Image from "next/image";

export function AuthPreviewPanel() {
	return (
		<div aria-hidden className="relative size-full bg-white p-4 sm:p-5">
			<div className="relative size-full overflow-hidden rounded-3xl">
				<Image
					src="/images/background/bg.webp"
					alt=""
					fill
					priority
					sizes="55vw"
					className="object-cover opacity-50"
				/>
			</div>
		</div>
	);
}

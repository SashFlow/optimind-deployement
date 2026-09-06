import Image from "next/image";

export function AppCanvas() {
	return (
		<div
			aria-hidden
			className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-2xl border-8 border-white"
		>
			<Image
				src="/images/background/bg-gradient.jpg"
				alt=""
				fill
				priority
				sizes="100vw"
				className="object-cover opacity-70"
			/>
		</div>
	);
}

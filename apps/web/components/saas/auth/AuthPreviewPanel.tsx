export function AuthPreviewPanel() {
	return (
		<div aria-hidden className="relative size-full bg-white p-4 sm:p-5">
			<div
				className="size-full overflow-hidden rounded-3xl bg-cover bg-center opacity-50"
				style={{
					backgroundImage: 'url("/images/background/bg.webp")',
				}}
			/>
		</div>
	);
}

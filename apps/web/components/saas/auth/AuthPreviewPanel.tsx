export function AuthPreviewPanel() {
	return (
		<div
			aria-hidden
			className="relative size-full bg-white rounded-l-4xl shadow-xl"
		>
			<div
				className="size-full overflow-hidden rounded-3xl bg-fit bg-left bg-no-repeat"
				style={{
					backgroundImage: 'url("/images/platform/dashboard.png")',
				}}
			/>
		</div>
	);
}

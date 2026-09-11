export function AppCanvas() {
	return (
		<div
			aria-hidden
			className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
			style={{
				backgroundColor: "#FFFFFF",
				backgroundImage: "linear-gradient(to top, #d2d2d3d3, #FFFFFF)",
			}}
		/>
	);
}

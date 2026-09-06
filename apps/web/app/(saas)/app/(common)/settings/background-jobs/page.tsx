export default function BackgroundJobsPage() {
	return (
		<section className="overflow-hidden rounded-3xl border bg-card p-6 shadow-sm ring-1 ring-black/5">
			<h1 className="font-semibold text-xl tracking-tight">
				Background jobs
			</h1>
			<p className="mt-2 text-muted-foreground text-sm">
				Job queue status will appear here when background job APIs are
				connected.
			</p>
		</section>
	);
}

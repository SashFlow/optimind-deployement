import { Button } from "@repo/ui/button";
import Image from "next/image";
import React from "react";

const posts = [
	{
		title: "5 Ways AI Helps Teams Stay in Flow",
		description:
			"Discover simple ways to cut distractions and keep your team focused on meaningful work.",
		category: "Productivity",
		readTime: "8 min read",
		image: "https://tweakcn.com/examples/marketing/blog-1.webp",
		author: {
			name: "Sophie Tan",
			avatar: "https://tweakcn.com/examples/avatars/person-1.webp",
			date: "4 Sept, 2025",
		},
	},
	{
		title: "The End of Context Switching",
		description:
			"How AI keeps your focus where it matters and removes the friction between your tools.",
		category: "Workflow",
		readTime: "7 min read",
		image: "https://tweakcn.com/examples/marketing/blog-2.webp",
		author: {
			name: "Hanna Lee",
			avatar: "https://tweakcn.com/examples/avatars/person-6.webp",
			date: "4 Sept, 2025",
		},
	},
	{
		title: "Why Small Teams Win Big with AI",
		description:
			"Lean setups, smarter workflows, and faster delivery for teams that punch above their weight.",
		category: "Startups",
		readTime: "3 min read",
		image: "https://tweakcn.com/examples/marketing/blog-3.webp",
		author: {
			name: "Alex Morgan",
			avatar: "https://tweakcn.com/examples/avatars/person-2.webp",
			date: "4 Sept, 2025",
		},
	},
] as const;

const Blogs = () => {
	return (
		<section id="blogs" className="py-12 lg:py-20">
			<div className="mx-auto flex max-w-7xl flex-col gap-12 px-5 lg:gap-16 lg:px-8">
				<div className="flex gap-5 lg:gap-9">
					<div className="flex w-full max-w-3xl flex-1 flex-col items-start gap-3 text-left">
						<span className="text-primary text-base font-medium">
							Blog
						</span>
						<h2 className="text-3xl font-medium tracking-tight text-balance lg:text-4xl">
							Acme Inc. Insights
						</h2>
						<p className="text-muted-foreground max-w-2xl text-base text-pretty">
							Insights, tips, and stories to help you work smarter
							and finish faster.
						</p>
					</div>
					<Button
						type="button"
						variant="secondary"
						className="ml-auto hidden shrink-0 self-end lg:flex"
					>
						See all
					</Button>
				</div>
				<div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-9">
					{posts.map((post) => (
						<article
							key={post.title}
							className="group/insight-card flex flex-col"
						>
							<div className="bg-muted relative aspect-3/2 w-full overflow-hidden rounded-xl">
								<Image
									alt={post.title}
									className="object-cover transition group-hover/insight-card:opacity-90"
									src={post.image}
									fill
								/>
							</div>
							<div className="flex flex-1 flex-col gap-3 py-3.5">
								<div className="flex items-center justify-between gap-3">
									<span className="text-primary text-sm font-medium">
										{post.category}
									</span>
									<span className="text-muted-foreground text-sm">
										{post.readTime}
									</span>
								</div>
								<div className="grid gap-1">
									<h3 className="text-lg font-medium tracking-tight text-balance">
										{post.title}
									</h3>
									<p className="text-muted-foreground line-clamp-3 text-sm text-pretty">
										{post.description}
									</p>
								</div>
								<div className="mt-auto flex items-center gap-2">
									<span className="relative flex size-8 shrink-0 overflow-hidden rounded-full select-none">
										<Image
											alt={post.author.name}
											className="aspect-square size-full object-cover"
											src={post.author.avatar}
											width={32}
											height={32}
										/>
									</span>
									<div className="flex flex-col">
										<span className="text-sm font-medium">
											{post.author.name}
										</span>
										<span className="text-muted-foreground text-xs">
											{post.author.date}
										</span>
									</div>
								</div>
							</div>
						</article>
					))}
				</div>
			</div>
		</section>
	);
};

export default Blogs;

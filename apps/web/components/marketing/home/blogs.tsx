import { Button } from "@repo/ui/button";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";

const posts = [
	{
		title: "See every voice conversation in one dashboard",
		description:
			"Track active calls, completion rates, and failures so insurance and healthcare teams know what’s working in real time.",
		category: "Analytics",
		readTime: "6 min read",
		image: "/images/platform/dashboard.webp",
		imagePosition: "object-top",
		author: {
			name: "Sahil",
			avatar: "/images/sahil.jpg",
			date: "4 Sept, 2026",
		},
	},
	{
		title: "Outbound voice AI that places the call for you",
		description:
			"Automate reminders, claim updates, and follow-ups—Optimind dials, speaks, and escalates when a human is needed.",
		category: "Voice AI",
		readTime: "5 min read",
		image: "/images/platform/voice.webp",
		imagePosition: "object-center",
		author: {
			name: "Sai Yalla",
			avatar: "/images/sai.jpeg",
			date: "4 Sept, 2026",
		},
	},
	{
		title: "Build voice workflows with human approval in the loop",
		description:
			"Chain knowledge retrieval, loops, and handoffs so every agent follows your process—not a generic script.",
		category: "Workflows",
		readTime: "4 min read",
		image: "/images/platform/workflow.webp",
		imagePosition: "object-top",
		author: {
			name: "Sandip Patel",
			avatar: "/images/sandip.jpeg",
			date: "4 Sept, 2026",
		},
	},
] as const;

const Blogs = () => {
	const router = useRouter();

	return (
		<section id="blogs" className="py-12 lg:py-20">
			<div className="mx-auto flex max-w-7xl flex-col gap-12 px-5 lg:gap-16 lg:px-8">
				<div className="flex gap-5 lg:gap-9">
					<div className="flex w-full max-w-3xl flex-1 flex-col items-start gap-3 text-left">
						<span className="text-primary text-base font-medium">
							Blog
						</span>
						<h2 className="text-3xl font-medium tracking-tight text-balance lg:text-4xl">
							Optimind Insights
						</h2>
						<p className="text-muted-foreground max-w-2xl text-base text-pretty">
							Practical notes on voice AI for insurance and
							healthcare operations.
						</p>
					</div>
					<Button
						type="button"
						variant="secondary"
						className="ml-auto hidden shrink-0 self-end lg:flex"
						onClick={() => {
							router.push("/blog");
						}}
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
							<div className="bg-muted relative aspect-video w-full overflow-hidden rounded-xl ring-1 ring-black/5">
								<Image
									alt={post.title}
									className={`object-cover ${post.imagePosition} transition group-hover/insight-card:opacity-90`}
									src={post.image}
									sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
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

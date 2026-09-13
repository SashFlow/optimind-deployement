import { MessageSquareQuoteIcon, StarIcon } from "lucide-react";
import Image from "next/image";
import React from "react";

const Team = () => {
	return (
		<section id="team" className="py-12 lg:py-20">
			<div className="mx-auto flex max-w-7xl flex-col gap-12 px-5 lg:gap-16 lg:px-8">
				<div className="flex flex-col">
					<div className="text-muted-foreground flex items-center gap-1.5 pb-3">
						<MessageSquareQuoteIcon />
						<span className="text-lg">
							Loved by talented teams...
						</span>
					</div>
					<div className="flex flex-col gap-9 md:flex-row">
						<blockquote className="text-3xl tracking-tight text-balance lg:text-4xl">
							Our team at Logoipsum has seen a huge boost in
							productivity since adopting Acme Inc. Designers,
							developers, and PMs are all working more seamlessly
							together.
						</blockquote>
						<div className="flex h-fit shrink-0 items-center gap-2">
							<StarIcon />
							<span className="text-2xl font-medium tracking-tight">
								Logoipsum
							</span>
						</div>
					</div>
					<span className="text-muted-foreground text-lg md:pt-3">
						June, 2025
					</span>
				</div>
				<div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6">
					<div className="bg-muted relative isolate flex aspect-3/4 items-end overflow-hidden rounded-lg p-3 lg:p-5">
						<Image
							alt="Alex Morgan - Product Manager"
							className="z-0 object-cover object-top"
							src="https://tweakcn.com/examples/avatars/person-2.webp"
							fill
						/>
						<div className="bg-background/80 z-10 w-full rounded-xl border p-4 backdrop-blur-sm">
							<div className="flex flex-col items-start gap-1">
								<div className="flex items-center gap-0.5">
									<StarIcon />
									<StarIcon />
									<StarIcon />
									<StarIcon />
									<StarIcon />
								</div>
								<span className="text-sm font-medium lg:text-lg">
									Alex Morgan
								</span>
								<span className="text-muted-foreground text-xs lg:text-sm">
									Product Manager
								</span>
							</div>
						</div>
					</div>
					<div className="bg-muted relative isolate flex aspect-3/4 items-end overflow-hidden rounded-lg p-3 lg:p-5">
						<Image
							alt="Sophie Tan - UX Researcher"
							className="z-0 object-cover object-top"
							src="https://tweakcn.com/examples/avatars/person-1.webp"
							fill
						/>
						<div className="bg-background/80 z-10 w-full rounded-xl border p-4 backdrop-blur-sm">
							<div className="flex flex-col items-start gap-1">
								<div className="flex items-center gap-0.5">
									<StarIcon />
									<StarIcon />
									<StarIcon />
									<StarIcon />
									<StarIcon />
								</div>
								<span className="text-sm font-medium lg:text-lg">
									Sophie Tan
								</span>
								<span className="text-muted-foreground text-xs lg:text-sm">
									UX Researcher
								</span>
							</div>
						</div>
					</div>
					<div className="bg-muted relative isolate flex aspect-3/4 items-end overflow-hidden rounded-lg p-3 lg:p-5">
						<Image
							alt="Emily Carter - Product Manager"
							className="z-0 object-cover object-top"
							src="https://tweakcn.com/examples/avatars/person-3.webp"
							fill
						/>
						<div className="bg-background/80 z-10 w-full rounded-xl border p-4 backdrop-blur-sm">
							<div className="flex flex-col items-start gap-1">
								<div className="flex items-center gap-0.5">
									<StarIcon />
									<StarIcon />
									<StarIcon />
									<StarIcon />
									<StarIcon />
								</div>
								<span className="text-sm font-medium lg:text-lg">
									Emily Carter
								</span>
								<span className="text-muted-foreground text-xs lg:text-sm">
									Product Manager
								</span>
							</div>
						</div>
					</div>
					<div className="bg-muted relative isolate flex aspect-3/4 items-end overflow-hidden rounded-lg p-3 lg:p-5">
						<Image
							alt="Hannah Lee - Software Engineer"
							className="z-0 object-cover object-top"
							src="https://tweakcn.com/examples/avatars/person-6.webp"
							fill
						/>
						<div className="bg-background/80 z-10 w-full rounded-xl border p-4 backdrop-blur-sm">
							<div className="flex flex-col items-start gap-1">
								<div className="flex items-center gap-0.5">
									<StarIcon />
									<StarIcon />
									<StarIcon />
									<StarIcon />
									<StarIcon />
								</div>
								<span className="text-sm font-medium lg:text-lg">
									Hannah Lee
								</span>
								<span className="text-muted-foreground text-xs lg:text-sm">
									Software Engineer
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};

export default Team;

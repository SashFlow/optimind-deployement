import { MessageSquareQuoteIcon, } from "lucide-react";
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
							Optimind runs our MER and claim-status calls end to
							end. Members get answers in minutes, and our ops
							team finally has bandwidth for the complex cases.
						</blockquote>
						<div className="flex h-fit shrink-0 items-center gap-2">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 40 40"
								className="aspect-square size-8"
								aria-hidden="true"
							>
								<path
									fill="currentColor"
									fillRule="evenodd"
									d="M20 40c11.046 0 20-8.954 20-20S31.046 0 20 0 0 8.954 0 20s8.954 20 20 20m6.24-30.683c.303-1.079-.744-1.717-1.7-1.036L11.193 17.79c-1.037.738-.874 2.21.245 2.21h3.515v-.027h6.85l-5.582 1.97-2.46 8.74c-.304 1.079.743 1.717 1.699 1.036l13.347-9.509c1.037-.738.874-2.21-.245-2.21h-5.33z"
									clipRule="evenodd"
								/>
							</svg>
							<span className="text-2xl font-medium tracking-tight">
								Nivaan Health
							</span>
						</div>
					</div>
					<span className="text-muted-foreground text-lg md:pt-3">
						Sept, 2026
					</span>
				</div>
				<div className="grid grid-cols-3 gap-3">
					<div className="bg-muted relative isolate flex aspect-3/4 items-end overflow-hidden rounded-lg p-3 lg:p-5">
						<Image
							alt="sahil - Co Founder"
							className="z-0 object-cover object-top"
							src="/images/sahil.jpg"
							fill
						/>
						<div className="bg-background/80 z-10 w-full rounded-xl border p-4 backdrop-blur-sm">
							<div className="flex flex-col items-start gap-1">
								<span className="text-sm font-medium lg:text-lg">
									sahil
								</span>
								<span className="text-muted-foreground text-xs lg:text-sm">
									Co Founder
								</span>
							</div>
						</div>
					</div>
					<div className="bg-muted relative isolate flex aspect-3/4 items-end overflow-hidden rounded-lg p-3 lg:p-5">
						<Image
							alt="Sai Yalla - Co Founder"
							className="z-0 object-cover object-top"
							src="/images/sai.jpeg"
							fill
						/>
						<div className="bg-background/80 z-10 w-full rounded-xl border p-4 backdrop-blur-sm">
							<div className="flex flex-col items-start gap-1">
								<span className="text-sm font-medium lg:text-lg">
									Sai Yalla
								</span>
								<span className="text-muted-foreground text-xs lg:text-sm">
									Co Founder
								</span>
							</div>
						</div>
					</div>
					<div className="bg-muted relative isolate flex aspect-3/4 items-end overflow-hidden rounded-lg p-3 lg:p-5">
						<Image
							alt="Sandip Patel - Co Founder"
							className="z-0 object-cover object-top"
							src="/images/sandip.jpeg"
							fill
						/>
						<div className="bg-background/80 z-10 w-full rounded-xl border p-4 backdrop-blur-sm">
							<div className="flex flex-col items-start gap-1">
								<span className="text-sm font-medium lg:text-lg">
									Sandip Patel
								</span>
								<span className="text-muted-foreground text-xs lg:text-sm">
									Co Founder
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

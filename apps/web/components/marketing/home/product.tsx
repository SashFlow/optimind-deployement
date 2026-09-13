import { Button } from "@repo/ui/button";
import { ArrowRightIcon } from "lucide-react";
import Image from "next/image";
import React from "react";

const Product = () => {
	return (
		<section id="product" className="py-12 lg:py-20">
			<div className="mx-auto grid w-full max-w-7xl gap-9 px-5 lg:grid-cols-2 lg:px-8">
				<div className="flex flex-col gap-12 self-center lg:gap-16">
					<div className="flex w-full max-w-3xl flex-col gap-3 items-start text-left">
						<h2 className="text-3xl font-medium tracking-tight text-balance lg:text-4xl">
							Trusted by Teams Everywhere
						</h2>
						<p className="text-muted-foreground max-w-2xl text-base text-pretty">
							Acme Inc. is helping thousands of creators and
							companies move faster, work smarter, and deliver
							with confidence.
						</p>
					</div>
					<div className="grid gap-5 md:grid-cols-2 lg:gap-x-9 lg:gap-y-8">
						<div className="flex flex-col items-start gap-y-0.5 border-l pl-6">
							<span className="text-3xl font-medium tracking-tight">
								12,500+
							</span>
							<span className="text-muted-foreground text-base text-pretty">
								Projects completed
							</span>
							<Button className="gap-2">
								Our clients
								<ArrowRightIcon className="size-3" />
							</Button>
						</div>
						<div className="flex flex-col items-start gap-y-0.5 border-l pl-6">
							<span className="text-3xl font-medium tracking-tight">
								38% faster
							</span>
							<span className="text-muted-foreground text-base text-pretty">
								Delivery across teams
							</span>
							<Button className="gap-2">
								Learn more
								<ArrowRightIcon className="size-3" />
							</Button>
						</div>
						<div className="flex flex-col items-start gap-y-0.5 border-l pl-6">
							<span className="text-3xl font-medium tracking-tight">
								94%
							</span>
							<span className="text-muted-foreground text-base text-pretty">
								User satisfaction
							</span>
							<Button className="gap-2">
								See feedback{" "}
								<ArrowRightIcon className="size-3" />
							</Button>
						</div>
						<div className="flex flex-col items-start gap-y-0.5 border-l pl-6">
							<span className="text-3xl font-medium tracking-tight">
								8 zones
							</span>
							<span className="text-muted-foreground text-base text-pretty">
								With active customers
							</span>
							<Button className="gap-2">
								Our users <ArrowRightIcon className="size-3" />
							</Button>
						</div>
					</div>
				</div>
				<div className="bg-muted relative aspect-square overflow-hidden rounded-xl">
					<Image
						alt="Team at work"
						className="object-cover"
						src="https://tweakcn.com/examples/marketing/metrics.webp"
						fill
					/>
				</div>
			</div>
		</section>
	);
};

export default Product;

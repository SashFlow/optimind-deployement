import { IntegrationsHub } from "@/components/marketing/home/integrations-hub";
import React from "react";

const Product = () => {
	return (
		<section id="product" className="py-12 lg:py-20">
			<div className="mx-auto grid w-full max-w-7xl gap-9 px-5 lg:grid-cols-2 lg:px-8">
				<div className="flex flex-col gap-12 self-center lg:gap-16">
					<div className="flex w-full max-w-3xl flex-col gap-3 items-start text-left">
						<h2 className="text-3xl font-medium tracking-tight text-balance lg:text-4xl">
							Voice that feels like a real conversation
						</h2>
						<p className="text-muted-foreground max-w-2xl text-base text-pretty">
							Optimind brings continuous, full-duplex voice AI to
							insurance and healthcare—listening and speaking in
							the same moment so members and patients can
							interrupt, pause, and get answers without rigid
							turn-taking.
						</p>
					</div>
					<div className="grid gap-5 md:grid-cols-2 lg:gap-x-9 lg:gap-y-8">
						<div className="flex flex-col items-start gap-y-0.5 border-l pl-6">
							<span className="text-3xl font-medium tracking-tight">
								Full duplex
							</span>
							<span className="text-muted-foreground text-base text-pretty">
								Listen and speak together
							</span>
						</div>
						<div className="flex flex-col items-start gap-y-0.5 border-l pl-6">
							<span className="text-3xl font-medium tracking-tight">
								Natural flow
							</span>
							<span className="text-muted-foreground text-base text-pretty">
								Interruptions handled live
							</span>
						</div>
						<div className="flex flex-col items-start gap-y-0.5 border-l pl-6">
							<span className="text-3xl font-medium tracking-tight">
								Smarter answers
							</span>
							<span className="text-muted-foreground text-base text-pretty">
								Work continues mid-call
							</span>
						</div>
						<div className="flex flex-col items-start gap-y-0.5 border-l pl-6">
							<span className="text-3xl font-medium tracking-tight">
								Better listening
							</span>
							<span className="text-muted-foreground text-base text-pretty">
								Pauses without cutting in
							</span>
						</div>
					</div>
				</div>
				<div className="relative flex aspect-square w-full items-center justify-center">
					<IntegrationsHub />
				</div>
			</div>
		</section>
	);
};

export default Product;

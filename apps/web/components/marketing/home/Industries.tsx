"use client";

import { Card, Carousel } from "@components/marketing/shared/cards-carousel";
import Image from "next/image";
import React from "react";
import { industryDomainData } from "../../../constants";

function Industries() {
	const cards = industryDomainData.map((card, index) => (
		<Card
			key={card.src}
			card={{
				...card,
				content: <IndustryContent features={card.features} />,
			}}
			index={index}
		/>
	));

	return (
		<div id="industries" className="w-full h-full py-20 bg-background">
			<h2 className="max-w-7xl pl-4 mx-auto text-xl md:text-5xl font-bold text-secondary-foreground">
				Get to know our Domain Experties.
			</h2>
			<Carousel items={cards} />
		</div>
	);
}

const IndustryContent = ({
	features,
}: {
	features: { highlight: string; description: string; image: string }[];
}) => {
	return (
		<>
			{features.map((feature, index) => {
				return (
					<div
						key={"industry-feature-" + index}
						className="bg-[#F5F5F7] dark:bg-neutral-800 p-8 md:p-14 rounded-3xl mb-4"
					>
						<p className="text-neutral-600 dark:text-neutral-400 text-base md:text-2xl font-sans max-w-3xl mx-auto mb-8">
							<span className="font-bold text-neutral-700 dark:text-neutral-200">
								{feature.highlight}
							</span>{" "}
							{feature.description}
						</p>
						<div className="relative w-full h-64 md:h-96 rounded-xl overflow-hidden shadow-lg mt-8">
							<Image
								src={feature.image}
								alt={feature.highlight}
								fill
								className="object-cover"
							/>
						</div>
					</div>
				);
			})}
		</>
	);
};

export default Industries;

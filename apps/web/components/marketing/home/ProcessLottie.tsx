"use client";

import Deploy from "@assets/lottie/Deployment.json";
import Design from "@assets/lottie/Design.json";
import Develop from "@assets/lottie/Develop.json";
import Research from "@assets/lottie/Research.json";
import Lottie from "lottie-react";
import { useEffect, useRef } from "react";

const lottieData = [
	{ id: 1, graphics: Research },
	{ id: 2, graphics: Design },
	{ id: 3, graphics: Develop },
	{ id: 4, graphics: Deploy },
];

function LottieItem({
	graphics,
	isActive,
}: {
	graphics: unknown;
	isActive: boolean;
}) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const lottieRef = useRef<any>(null);

	useEffect(() => {
		if (lottieRef.current) {
			if (isActive) {
				lottieRef.current.play();
			} else {
				lottieRef.current.pause();
			}
		}
	}, [isActive]);

	return (
		<div
			className={`absolute w-full h-full max-w-[250px] sm:max-w-[350px] md:max-w-[450px] transition-opacity duration-500 ease-in-out ${
				isActive ? "opacity-100" : "opacity-0"
			}`}
			aria-hidden={!isActive}
		>
			<Lottie
				lottieRef={lottieRef}
				loop={true}
				animationData={graphics}
				className="w-full h-full object-contain"
			/>
		</div>
	);
}

export default function ProcessLottie({ activeStep }: { activeStep: number }) {
	return (
		<>
			{lottieData.map((item) => (
				<LottieItem
					key={item.id}
					graphics={item.graphics}
					isActive={activeStep === item.id}
				/>
			))}
		</>
	);
}

"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { processStepsData } from "../../../constants";
import { FadeUp } from "../shared/Motion";

const ProcessLottie = dynamic(() => import("./ProcessLottie"), { ssr: false });

const Process = () => {
	const [activeStep, setActiveStep] = useState(1);

	useEffect(() => {
		const interval = setInterval(() => {
			setActiveStep((prev) => (prev === 4 ? 1 : prev + 1));
		}, 4000);
		return () => clearInterval(interval);
	}, [activeStep]);

	return (
		<section className="bg-background">
			<div className="bg-linear-to-b from-background via-accent to-background py-32 px-8 text-accent-foreground overflow-hidden rounded-3xl">
				<div className="max-w-7xl mx-auto">
					<FadeUp className="mb-20">
						<h2 className="editorial-headline text-5xl md:text-6xl mb-6 uppercase">
							From Concept to Product
						</h2>
						<p className="font-approachable text-primary-foreground/80 uppercase tracking-widest text-xs font-bold">
							Fast execution without compromising product quality.
						</p>
					</FadeUp>
					<FadeUp className="flex flex-col gap-4">
						<div className="lg:col-span-7 bg-foreground backdrop-blur-sm relative overflow-hidden flex items-center justify-center p-8 md:p-12 visual-container rounded-[16px] min-h-[300px] sm:min-h-[400px] md:min-h-[500px]">
							{/* Lottie Animation Focus */}
							<div className="absolute inset-0 flex items-center justify-center p-6 md:p-12 pointer-events-none z-10">
								<ProcessLottie activeStep={activeStep} />
							</div>
						</div>
						<div className="flex flex-col gap-8 w-full max-w-3xl mx-auto mt-8">
							<div
								className="flex gap-4 w-full"
								role="tablist"
								aria-label="Process steps"
							>
								{processStepsData.map((step) => (
									<button
										key={step.id}
										id={`tab-${step.id}`}
										type="button"
										role="tab"
										aria-selected={activeStep === step.id}
										aria-controls={`panel-${step.id}`}
										onClick={() => setActiveStep(step.id)}
										className={`flex-1 h-2 rounded-full transition-all duration-300 cursor-pointer ${
											activeStep === step.id
												? "bg-primary"
												: "bg-primary-foreground/20 hover:bg-primary-foreground/40"
										}`}
										aria-label={`Go to step ${step.id}`}
									/>
								))}
							</div>
							<div
								className="text-center min-h-[150px]"
								id={`panel-${activeStep}`}
								role="tabpanel"
								aria-labelledby={`tab-${activeStep}`}
							>
								<h3 className="editorial-headline text-6xl font-black uppercase mb-4 text-primary-foreground transition-colors">
									{processStepsData[activeStep - 1].title}
								</h3>
								<p className="font-approachable text-primary-foreground/60 text-lg max-w-md mx-auto transition-colors">
									{
										processStepsData[activeStep - 1]
											.description
									}
								</p>
							</div>
						</div>
					</FadeUp>
				</div>
			</div>
		</section>
	);
};

export default Process;

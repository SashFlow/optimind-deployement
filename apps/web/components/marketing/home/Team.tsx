"use client";
import { AnimatedTestimonials } from "@components/marketing/shared/animated-testimonials";
import { motion } from "framer-motion";
import { teamMembers } from "../../../constants";

function AnimatedTeam() {
	return (
		<section
			id="team"
			className="flex flex-col justify-center py-10 overflow-hidden bg-background"
		>
			<div className="m-auto bg-secondary-foreground rounded-2xl p-4">
				<motion.h2
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5, delay: 0.2 }}
					className="flex w-full justify-center text-3xl md:text-5xl font-bold tracking-tight mb-10"
				>
					Meet the Team
				</motion.h2>
				<AnimatedTestimonials testimonials={teamMembers} autoplay />
			</div>
		</section>
	);
}

export default AnimatedTeam;

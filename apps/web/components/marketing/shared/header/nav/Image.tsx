import { motion } from "framer-motion";
import Image from "next/image";
import React from "react";
import { opacity } from "../anim";

export default function Index({
	src,
	isActive,
}: {
	src: string;
	isActive: boolean;
}) {
	return (
		<motion.div
			variants={opacity}
			initial="initial"
			animate={isActive ? "open" : "closed"}
			className="relative hidden h-[450px] w-[500px] lg:block"
		>
			<Image
				src={`/images/${src}`}
				fill={true}
				sizes="(max-width: 1024px) 0vw, 500px"
				alt="image"
				className="object-cover"
			/>
		</motion.div>
	);
}

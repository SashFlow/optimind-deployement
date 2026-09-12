"use client";
import { motion } from "framer-motion";
import { useState } from "react";
import { height } from "../anim";
import Body from "./Body";
import Footer from "./Footer";

const links = [
	{
		title: "Home",
		href: "/",
	},
	{
		title: "Team",
		href: "/#team",
	},
	{
		title: "About-Us",
		href: "/#about",
	},
	{
		title: "Blog",
		href: "/blog",
	},
	{
		title: "Contact",
		href: "/contact",
	},
];

export default function NavContent({ onClose }: { onClose: () => void }) {
	const [selectedLink, setSelectedLink] = useState({
		isActive: false,
		index: 0,
	});

	return (
		<motion.div
			variants={height}
			initial="initial"
			animate="enter"
			exit="exit"
			className="overflow-hidden"
		>
			<div className="mb-[80px] flex gap-[50px] lg:mb-0 lg:justify-between">
				<div className="flex flex-col justify-between">
					<Body
						links={links}
						selectedLink={selectedLink}
						setSelectedLink={setSelectedLink}
						onClose={onClose}
					/>
					<Footer onClose={onClose} />
				</div>
			</div>
		</motion.div>
	);
}

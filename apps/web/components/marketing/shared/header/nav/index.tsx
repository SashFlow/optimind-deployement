"use client";
import { motion } from "framer-motion";
import { useState } from "react";
import { height } from "../anim";
import Body from "./Body";
import Footer from "./Footer";

// import Image from "./Image";

const links = [
	{
		title: "Home",
		href: "/",
		src: "home.png",
	},
	{
		title: "Team",
		href: "/#team",
		src: "team.png",
	},
	{
		title: "About-Us",
		href: "/#about",
		src: "about.png",
	},
	{
		title: "Blog",
		href: "/blog",
		src: "blog.png",
	},
	{
		title: "Contact",
		href: "/contact",
		src: "contact.png",
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
				{/* <Image
					src={links[selectedLink.index].src}
					isActive={selectedLink.isActive}
				/> */}
			</div>
		</motion.div>
	);
}

"use client";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { background, opacity } from "./anim";
import Nav from "./nav";

export default function Header() {
	const [isActive, setIsActive] = useState(false);

	return (
		<div className="fixed box-border w-full bg-[#f4f0ea] p-[10px] sm:p-5 z-50 rounded-b-2xl shadow-md">
			<div className="relative h-6 flex justify-center text-[12px] font-normal uppercase sm:text-[15px]">
				<Link
					href="/"
					className="absolute left-0 text-black no-underline"
				>
					Sashflow
				</Link>
				<button
					type="button"
					onClick={() => {
						setIsActive(!isActive);
					}}
					className="flex cursor-pointer appearance-none border-none bg-transparent items-center justify-center p-0 absolute right-0 gap-2"
				>
					<div
						className={`pointer-events-none relative w-[22.5px] before:relative before:block before:h-px before:w-full before:bg-black before:transition-all before:duration-1000 before:ease-[cubic-bezier(0.76,0,0.24,1)] before:content-[''] after:relative after:block after:h-px after:w-full after:bg-black after:transition-all after:duration-1000 after:ease-[cubic-bezier(0.76,0,0.24,1)] after:content-[''] ${isActive ? "before:top-px before:-rotate-45 after:-top-px after:rotate-45" : "before:top-[4px] after:-top-[4px]"}`}
					/>
					<div className="relative flex items-center">
						<motion.p
							className="m-0"
							variants={opacity}
							animate={!isActive ? "open" : "closed"}
						>
							Menu
						</motion.p>
						<motion.p
							className="absolute m-0 opacity-0"
							variants={opacity}
							animate={isActive ? "open" : "closed"}
						>
							Close
						</motion.p>
					</div>
				</button>
			</div>
			<motion.div
				variants={background}
				initial="initial"
				animate={isActive ? "open" : "closed"}
				className="absolute left-0 top-full h-full w-full bg-black opacity-50"
			/>
			<AnimatePresence mode="wait">
				{isActive && (
					<Nav
						onClose={() => {
							setIsActive(false);
						}}
					/>
				)}
			</AnimatePresence>
		</div>
	);
}

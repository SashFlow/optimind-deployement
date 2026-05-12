import { motion } from "framer-motion";
import { useTransitionRouter } from "next-transition-router";
import type { ReactNode } from "react";
import { blur, translate } from "../anim";

interface LinkType {
	title: string;
	href: string;
	src: string;
}

export default function Body({
	links,
	selectedLink,
	setSelectedLink,
	onClose,
}: {
	links: LinkType[];
	selectedLink: { isActive: boolean; index: number };
	setSelectedLink: (val: { isActive: boolean; index: number }) => void;
	onClose: () => void;
}) {
	const router = useTransitionRouter();

	const getChars = (word: string) => {
		const chars: ReactNode[] = [];
		word.split("").forEach((char, i) => {
			chars.push(
				<motion.span
					custom={[i * 0.02, (word.length - i) * 0.01]}
					variants={translate}
					initial="initial"
					animate="enter"
					exit="exit"
					key={char + i}
				>
					{char}
				</motion.span>,
			);
		});
		return chars;
	};

	return (
		<div className="mt-10 flex flex-wrap lg:mt-20 lg:max-w-[1200px]">
			{links.map((link, index) => {
				const { title, href } = link;
				return (
					<a
						key={`l_${index}`}
						href={href}
						onClick={(e) => {
							e.preventDefault();
							router.push(href);
							onClose();
						}}
						className="text-black no-underline uppercase cursor-pointer"
					>
						<motion.p
							className="m-0 flex overflow-hidden pr-[30px] pt-[10px] text-[32px] font-light lg:pr-[2vw] lg:text-[5vw]"
							onMouseOver={() => {
								setSelectedLink({ isActive: true, index });
							}}
							onMouseLeave={() => {
								setSelectedLink({ isActive: false, index });
							}}
							variants={blur}
							animate={
								selectedLink.isActive &&
								selectedLink.index !== index
									? "open"
									: "closed"
							}
						>
							{getChars(title)}
						</motion.p>
					</a>
				);
			})}
		</div>
	);
}

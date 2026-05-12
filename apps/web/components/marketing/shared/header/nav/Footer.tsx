import { motion } from "framer-motion";
import { useTransitionRouter } from "next-transition-router";
import { translate } from "../anim";

export default function Footer({ onClose }: { onClose: () => void }) {
	const router = useTransitionRouter();
	return (
		<div className="mt-10 flex flex-wrap items-end text-[12px] uppercase lg:justify-between">
			<ul className="m-0 mt-[10px] w-1/2 overflow-hidden p-0 list-none lg:w-auto">
				<motion.li
					custom={[0.3, 0]}
					variants={translate}
					initial="initial"
					animate="enter"
					exit="exit"
					onClick={() => {
						router.push("/legal/privacy-policy");
						onClose();
					}}
					className="cursor-pointer"
				>
					Privacy Policy
				</motion.li>
			</ul>
			<ul className="m-0 mt-[10px] w-1/2 overflow-hidden p-0 list-none lg:w-auto">
				<motion.li
					custom={[0.3, 0]}
					variants={translate}
					initial="initial"
					animate="enter"
					exit="exit"
					onClick={() => {
						router.push("/legal/terms");
						onClose();
					}}
					className="cursor-pointer"
				>
					Terms & Conditions
				</motion.li>
			</ul>
		</div>
	);
}

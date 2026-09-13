"use client";

import Blogs from "@/components/marketing/home/blogs";
import Companies from "@/components/marketing/home/companies";
import Contact from "@/components/marketing/home/contact";
import Faq from "@/components/marketing/home/faq";
import Hero from "@/components/marketing/home/hero";
import Product from "@/components/marketing/home/product";
import Solutions from "@/components/marketing/home/solutions";
import Team from "@/components/marketing/home/team";

export default function Home() {
	return (
		<>
			<Hero />
			<Companies />
			<Product />
			<Solutions />
			<Team />
			<Blogs />
			<Faq />
			<Contact />
		</>
	);
}

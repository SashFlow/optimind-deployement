import {
	Brain,
	Building2,
	Clock,
	Cog,
	HeartPulse,
	Home,
	Scale,
	Shield,
	Zap,
} from "lucide-react";
import type { ScenarioDetails } from "@/types/index";

export const industries = [
	{ name: "HVAC", icon: Building2 },
	{ name: "Legal", icon: Scale },
	{ name: "Healthcare", icon: HeartPulse },
	{ name: "Real Estate", icon: Home },
	{ name: "Insurance", icon: Shield },
];

export const heroItems = [
	{
		icon: Clock,
		title: "25+ Years Experience",
		desc: "Across AI, automation, and industry operations.",
	},
	{
		icon: Brain,
		title: "Industry Workflow Understanding",
		desc: "We understand how real industries operate.",
	},
	{
		icon: Cog,
		title: "AI Product Development",
		desc: "From model design to production systems.",
	},
	{
		icon: Zap,
		title: "Rapid Execution",
		desc: "Products built and ready within weeks.",
	},
];

export const processSteps = [
	{
		week: "Week 1",
		title: "Concept",
		desc: "Define workflows and system architecture.",
	},
	{
		week: "Week 2",
		title: "Design",
		desc: "Build AI and product infrastructure.",
	},
	{
		week: "Week 3",
		title: "Development",
		desc: "Develop and integrate the application.",
	},
	{
		week: "Week 4",
		title: "Deployment",
		desc: "Application ready for real use.",
	},
];

export const processStepsData = [
	{
		id: 1,
		title: "Concept",
		description:
			"Strategy and scope definition for the vertical integration.",
	},
	{
		id: 2,
		title: "Design",
		description:
			"UX architecture and AI model selection for specific workflows.",
	},
	{
		id: 3,
		title: "Development",
		description: "Rapid engineering and integration of the AI backbone.",
	},
	{
		id: 4,
		title: "Deployment",
		description: "Launch and industrial scaling across all verticals.",
	},
];

export const teamMembers = [
	{
		quote: "Our vision is to revolutionize vertical industries by bridging the gap between cutting-edge AI and real-world operational needs.",
		name: "Sai Yalla",
		designation: "Co-Founder & CEO",
		src: "/images/sai.jpeg",
	},
	{
		quote: "Product excellence means building AI tools that are not just powerful, but deeply intuitive and tailored to the unique workflows of every industry.",
		name: "Sandip Patel",
		designation: "Co-Founder & CPO",
		src: "/images/sandip.jpeg",
	},
	// {
	// 	quote: "We ensure our AI implementations deliver measurable financial growth and operational efficiency, providing a clear path to sustainable scaling.",
	// 	name: "Shipra Goyal",
	// 	designation: "Co-Founder & CFO",
	// 	src: "/images/shipra.jpeg",
	// },
	{
		quote: "Strategic automation allows businesses to optimize their capital and focus on high-impact goals, while we handle the complexity of the AI backbone.",
		name: "Sahil",
		designation: "Co-Founder & CFO",
		src: "/images/sahil.jpg",
	},
];

export const industryDomainData = [
	{
		category: "HVAC",
		title: "Optimize scheduling and dispatching with intelligent systems.",
		src: "/images/HVAC.jpg",
		features: [
			{
				highlight: "AI-powered route optimization.",
				description:
					"Reduce travel time and fuel costs by dynamically routing technicians based on traffic, priority, and parts availability.",
				image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=800&auto=format&fit=crop",
			},
		],
	},
	{
		category: "Legal",
		title: "Streamline contract review and legal research with AI.",
		src: "/images/Legal.jpg",
		features: [
			{
				highlight: "Intelligent contract analysis.",
				description:
					"Automatically extract key terms, obligations, and anomalies from lengthy contracts in seconds to speed up the review process.",
				image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=800&auto=format&fit=crop",
			},
		],
	},
	{
		category: "Healthcare",
		title: "Improve patient outcomes with predictive analytics and automation.",
		src: "/images/Healthcare.jpg",
		features: [
			{
				highlight: "Predictive patient analytics.",
				description:
					"Identify at-risk patients early by analyzing historical medical records and real-time vitals, enabling proactive interventions.",
				image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=800&auto=format&fit=crop",
			},
		],
	},
	{
		category: "Real Estate",
		title: "Accelerate property management and closing workflows.",
		src: "/images/RealEstate.jpg",
		features: [
			{
				highlight: "Automated property valuations.",
				description:
					"Instantly generate accurate property estimates using real-time market trends, neighborhood comps, and historical data.",
				image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=800&auto=format&fit=crop",
			},
		],
	},
	{
		category: "Insurance",
		title: "Automate claims processing and risk assessment.",
		src: "/images/Insurance.jpg",
		features: [
			{
				highlight: "Accelerated claims processing.",
				description:
					"Use computer vision to analyze damage photos and instantly estimate repair costs, speeding up payouts and customer satisfaction.",
				image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=800&auto=format&fit=crop",
			},
		],
	},
];

export const featuresStrengths = [
	{
		title: "25+ Years Experience",
		subheading: "Across AI, automation, and industry operations.",
	},
	{
		title: "Industry Workflow Understanding",
		subheading: "We understand how real industries operate.",
	},
	{
		title: "AI Product Development",
		subheading: "From model design to production systems.",
	},
	{
		title: "Rapid Execution",
		subheading: "Products built and ready within weeks.",
	},
];

export const modes = [
	{ id: "audio", label: "Audio Assistant" },
	{ id: "avatar", label: "Avatar Assistant" },
] as const;

export const popularIndianLanguages = [
	"English",
	"Hindi",
	"Marathi",
	"Bengali",
	"Multilingual- Primary English",
];

export const scenarios = {
	"medical-examination": {
		sessionType: ["avatar", "audio"],
		title: "Medical Examination Assistant",
		description:
			"An avatar assistant that guides users through a structured medical examination process for insurance applications.",
		highlights: [
			"Guide users through a structured medical examination process",
			"Collect necessary information for insurance applications",
			"Provide a clear and supportive user experience",
		],
		url: "/images/mer.svg",
		firstTimeGuidance: [],
		suggestedQuestions: [],
	},
	"medical-appointment": {
		sessionType: ["audio"],
		title: "Medical Appointment - (Inbound)",
		description:
			"An AI voice assistant that helps patients schedule, reschedule, and manage medical appointments with clinics, hospitals, and diagnostic centers.",
		highlights: [
			"Book and manage medical appointments through voice interaction",
			"Provide appointment confirmations and reminders",
			"Assist users in finding available doctors and time slots",
		],
		url: "/images/inbound.svg",
		firstTimeGuidance: [],
		suggestedQuestions: [],
	},
	"reminder-call": {
		sessionType: ["audio"],
		title: "Reminder Call - (Outbound)",
		description:
			"An AI calling assistant that delivers automated reminders for appointments, medication schedules, renewals, and follow-up actions.",
		highlights: [
			"Send automated voice reminders for appointments and tasks",
			"Reduce missed appointments and improve customer engagement",
			"Support personalized and multilingual reminder calls",
		],
		url: "/images/outbound.svg",
		firstTimeGuidance: [],
		suggestedQuestions: [],
	},
} satisfies Record<string, ScenarioDetails>;

export const scenariosOptions = [
	{
		title: "Medical Examination",
		slug: "medical-examination",
	},
	{
		title: "Medical Appointment",
		slug: "medical-appointment",
	},
	{
		title: "Reminder Call",
		slug: "reminder-call",
	},
];

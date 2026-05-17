import type { DemoPersona } from "@context/DemoProvider";
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

export const demoPersonas: readonly DemoPersona[] = [
	{
		phone_number: "9876543210",
		full_name: "Rohit Sharma",
		dob: "1992-08-15",
	},
	{
		phone_number: "9876500001",
		full_name: "Priya Nair",
		dob: "1995-01-20",
	},
	{
		phone_number: "9876500002",
		full_name: "Arjun Mehta",
		dob: "1990-03-11",
	},
	{
		phone_number: "9876500003",
		full_name: "Sneha Kapoor",
		dob: "1993-07-24",
	},
	{
		phone_number: "9876500004",
		full_name: "Vikram Singh",
		dob: "1988-12-02",
	},
	{
		phone_number: "9876500005",
		full_name: "Ananya Reddy",
		dob: "1996-09-18",
	},
	{
		phone_number: "9876500006",
		full_name: "Karan Malhotra",
		dob: "1991-05-14",
	},
	{
		phone_number: "9876500007",
		full_name: "Neha Verma",
		dob: "1994-02-28",
	},
	{
		phone_number: "9876500008",
		full_name: "Rahul Khanna",
		dob: "1989-11-10",
	},
	{
		phone_number: "9876500009",
		full_name: "Pooja Iyer",
		dob: "1997-06-06",
	},
	{
		phone_number: "9876500010",
		full_name: "Amit Joshi",
		dob: "1992-01-17",
	},
	{
		phone_number: "9876500011",
		full_name: "Divya Menon",
		dob: "1993-10-03",
	},
	{
		phone_number: "9876500012",
		full_name: "Siddharth Rao",
		dob: "1987-04-22",
	},
	{
		phone_number: "9876500013",
		full_name: "Meera Pillai",
		dob: "1998-08-09",
	},
	{
		phone_number: "9876500014",
		full_name: "Yash Patel",
		dob: "1991-12-30",
	},
	{
		phone_number: "9876500015",
		full_name: "Kavya Shetty",
		dob: "1995-03-26",
	},
	{
		phone_number: "9876500016",
		full_name: "Aditya Kulkarni",
		dob: "1990-07-01",
	},
	{
		phone_number: "9876500017",
		full_name: "Ritika Bansal",
		dob: "1994-11-19",
	},
	{
		phone_number: "9876500018",
		full_name: "Nikhil Jain",
		dob: "1988-02-13",
	},
	{
		phone_number: "9876500019",
		full_name: "Shreya Das",
		dob: "1996-05-29",
	},
	{
		phone_number: "9876500020",
		full_name: "Manish Tiwari",
		dob: "1992-09-07",
	},
	{
		phone_number: "9876500021",
		full_name: "Aisha Khan",
		dob: "1997-01-12",
	},
	{
		phone_number: "9876500022",
		full_name: "Rajat Arora",
		dob: "1989-06-21",
	},
	{
		phone_number: "9876500023",
		full_name: "Simran Kaur",
		dob: "1993-04-04",
	},
	{
		phone_number: "9876500024",
		full_name: "Harsh Vardhan",
		dob: "1991-08-25",
	},
	{
		phone_number: "9876500025",
		full_name: "Ishita Roy",
		dob: "1995-12-08",
	},
	{
		phone_number: "9876500026",
		full_name: "Deepak Yadav",
		dob: "1987-10-16",
	},
	{
		phone_number: "9876500027",
		full_name: "Tanvi Mishra",
		dob: "1998-02-01",
	},
	{
		phone_number: "9876500028",
		full_name: "Akash Choudhary",
		dob: "1990-11-23",
	},
	{
		phone_number: "9876500029",
		full_name: "Nandini Rao",
		dob: "1994-06-14",
	},
	{
		phone_number: "9876500030",
		full_name: "Varun Bhatia",
		dob: "1992-03-05",
	},
	{
		phone_number: "9876500031",
		full_name: "Rhea Thomas",
		dob: "1996-09-27",
	},
	{
		phone_number: "9876500032",
		full_name: "Abhishek Sinha",
		dob: "1988-01-31",
	},
	{
		phone_number: "9876500033",
		full_name: "Mitali Ghosh",
		dob: "1995-07-13",
	},
	{
		phone_number: "9876500034",
		full_name: "Sameer Puri",
		dob: "1991-04-18",
	},
	{
		phone_number: "9876500035",
		full_name: "Lavanya Krishnan",
		dob: "1997-11-09",
	},
	{
		phone_number: "9876500036",
		full_name: "Gaurav Saxena",
		dob: "1989-05-02",
	},
	{
		phone_number: "9876500037",
		full_name: "Bhavna Chopra",
		dob: "1993-08-20",
	},
	{
		phone_number: "9876500038",
		full_name: "Rohan Desai",
		dob: "1990-12-11",
	},
	{
		phone_number: "9876500039",
		full_name: "Sanya Mallick",
		dob: "1996-03-15",
	},
	{
		phone_number: "9876500040",
		full_name: "Tushar Anand",
		dob: "1992-10-28",
	},
	{
		phone_number: "9876500041",
		full_name: "Keerthi Narayan",
		dob: "1994-01-07",
	},
	{
		phone_number: "9876500042",
		full_name: "Mohit Sehgal",
		dob: "1987-06-26",
	},
	{
		phone_number: "9876500043",
		full_name: "Pallavi Sen",
		dob: "1998-04-12",
	},
	{
		phone_number: "9876500044",
		full_name: "Naveen Kumar",
		dob: "1991-09-03",
	},
	{
		phone_number: "9876500045",
		full_name: "Anjali Bhat",
		dob: "1995-02-22",
	},
	{
		phone_number: "9876500046",
		full_name: "Prateek Agarwal",
		dob: "1989-07-30",
	},
	{
		phone_number: "9876500047",
		full_name: "Shruti Kulshrestha",
		dob: "1993-11-14",
	},
	{
		phone_number: "9876500048",
		full_name: "Devansh Gupta",
		dob: "1990-05-19",
	},
	{
		phone_number: "9876500049",
		full_name: "Aarushi Bedi",
		dob: "1997-08-06",
	},
	{
		phone_number: "9876500050",
		full_name: "Chirag Oberoi",
		dob: "1992-12-24",
	},
];

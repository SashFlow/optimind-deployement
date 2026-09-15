import React from "react";

export type UseCaseSection = {
	heading?: string;
	paragraphs: string[];
};

export type UseCase = {
	id: string;
	category: string;
	title: string;
	snippet: string;
	image: string;
	/** Blog post path for this use case (e.g. "/blog/health-reports"). */
	blogHref: string;
	/** Optional YouTube video ID when a use case should show video instead of audio. */
	youtubeId?: string;
	sections: UseCaseSection[];
};

export const useCases: UseCase[] = [
	{
		id: "appointment-scheduling",
		category: "07 — Appointment Scheduling",
		title: "Schedule Medical Tests Without the Back-and-Forth",
		snippet:
			"Help insurance applicants schedule their required blood test for policy through a natural conversation without adding manual scheduling work for your teams.",
		image: "/images/use-case/appointment_scheduling.webp",
		blogHref: "/blog/appointment-scheduling",
		sections: [
			{
				paragraphs: [
					"The medical test is one step. Scheduling it shouldn't become a process of its own.",
					"When an insurance applicant needs a blood test as part of the policy-issuance process, coordinating that appointment can create unnecessary friction.",
					"Applicants may need to speak with an agent, check available slots, confirm details, or reschedule when the original appointment doesn't work.",
					"Optimind can automate that conversation.",
				],
			},
			{
				heading: "A voice agent built around the insurance journey",
				paragraphs: [
					"Rather than treating appointment scheduling as a generic healthcare use case, the workflow can be specifically connected to the insurance policy-issuance journey.",
					"The agent can guide the applicant through the required steps, collect the necessary information, present available options through the connected workflow, confirm the appointment, and handle supported rescheduling scenarios.",
				],
			},
			{
				heading: "Less coordination. Faster completion.",
				paragraphs: [
					"When scheduling conversations are automated, applicants can complete the process without waiting for an operations team to become available.",
					"For insurers, that means less repetitive coordination and a smoother path from application → medical test → policy issuance.",
				],
			},
			{
				heading: "Capacity when applications surge",
				paragraphs: [
					"When policy applications increase, medical-test scheduling calls can increase with them.",
					"Optimind provides an on-demand conversational layer that can scale with that demand rather than requiring teams to permanently staff for peak volumes.",
				],
			},
		],
	},
	{
		id: "mer-calls",
		category: "04 — MER Calls",
		title: "Make Medical Examination Calls Consistent at Scale",
		snippet:
			"Automate pre-issuance Medical Examination Report calls with voice AI trained around insurance underwriting workflows, health information needs, and clear escalation paths.",
		image: "/images/use-case/MER_call.webp",
		blogHref: "/blog/mer-calls",
		youtubeId: "UM_1-W14RsQ",
		sections: [
			{
				heading: "A critical step before policy issuance",
				paragraphs: [
					"MER calls help insurers collect and verify health information before a policy is issued. These conversations typically cover identity and policy verification, personal medical history, lifestyle and habits, family medical history, and occupation and physical vitals.",
					"Optimind turns this structured process into a natural voice conversation—without relying on a generic script.",
				],
			},
			{
				heading: "Built for the MER workflow",
				paragraphs: [
					"Optimind's voice AI can be trained around the terminology, questioning patterns, decision paths, and information requirements specific to medical examination calls.",
					"By training on multiple real and representative recordings, the model can better understand how applicants actually respond, including variations in language and conversation flow.",
				],
			},
			{
				heading: "Consistent at every volume",
				paragraphs: [
					"Every call can follow the same required workflow and communication standards, helping insurers maintain consistency across large volumes while still keeping the interaction natural and empathetic.",
					"When application volumes spike, Optimind can scale calling capacity on demand, without requiring teams to proportionally increase manual calling resources.",
				],
			},
			{
				heading: "Less manual effort, more underwriting focus",
				paragraphs: [
					"Optimind handles repetitive MER conversations and captures structured responses, allowing teams to spend more time on exceptions, escalations, and underwriting decisions.",
					"With a pay-as-you-go model, insurers can scale voice operations with demand—making the process more efficient, consistent, and scalable from everyday volumes to peak periods.",
				],
			},
		],
	},
	{
		id: "health-reports",
		category: "01 — Health Reports",
		title: "Turn Complex Health Reports Into Clear Conversations",
		snippet:
			"Help patients and members understand medical reports, results, and health information through a natural voice experience—without decoding complex terminology on their own.",
		image: "/images/use-case/health_report.webp",
		blogHref: "/blog/health-reports",
		sections: [
			{
				paragraphs: [
					"Healthcare information is only useful when people can understand it.",
					"Medical reports can contain clinical terminology, measurements, abbreviations, and information that isn't easy for every patient or member to interpret.",
					"That often leads to calls to healthcare providers, insurers, or support teams simply to understand what a report says.",
					"Optimind brings voice AI into that gap.",
					"An Optimind agent can be designed around the specific report-explanation workflow, helping explain information in simpler language, answer common questions, and guide the person toward the appropriate next step.",
				],
			},
			{
				heading: "Built around the healthcare workflow",
				paragraphs: [
					"The experience isn't designed as a generic chatbot that happens to speak.",
					"Optimind can be configured around the organization's approved information, terminology, conversation flows, escalation rules, and communication standards.",
					"The voice model can be tuned for the specific use case using multiple representative recordings and real-world conversations, helping it understand how people actually ask questions and respond.",
				],
			},
			{
				heading: "More conversations. Less repetitive work.",
				paragraphs: [
					"Instead of having staff repeatedly explain the same information over the phone, Optimind can handle routine conversations at scale while allowing more complex or sensitive situations to move to a human.",
					"The result is a more consistent experience for patients and less repetitive workload for teams.",
				],
			},
		],
	},
	{
		id: "claims-status",
		category: "03 — Claims Status",
		title: "Keep Members Updated, Without the Waiting",
		snippet:
			"Give policyholders timely answers about claim status, missing documents, next steps, and updates—while reducing repetitive inbound calls for busy claims operations teams.",
		image: "/images/use-case/claim_status.webp",
		blogHref: "/blog/claims-status",
		sections: [
			{
				paragraphs: [
					'"What\'s happening with my claim?"',
					"For insurance teams, claims-status calls can become a significant source of repetitive contact volume.",
					"A customer may simply want to know whether their claim has been received, whether additional information is required, or what happens next.",
					"Optimind can automate these routine conversations.",
					"The agent can follow the configured claims workflow, retrieve relevant information through connected systems, communicate the appropriate update, and determine when a conversation should be handed to a human.",
				],
			},
			{
				heading: "The goal isn't just answering calls.",
				paragraphs: [
					"A stronger experience is proactive.",
					"When there is an appropriate update in the claims journey, Optimind can support outbound communication so customers don't always have to call to find out what changed.",
					'That turns communication from "wait and ask" into "know when it matters."',
				],
			},
			{
				heading: "Built for claims volume",
				paragraphs: [
					"Claims volume can change significantly during certain events, periods, or operational peaks.",
					"Optimind provides an on-demand voice layer that can absorb additional conversation volume without requiring the organization to permanently staff for its highest-volume period.",
					"That makes the operation more elastic while maintaining a consistent communication experience.",
				],
			},
		],
	},

	{
		id: "feedback-calls",
		category: "05 — Feedback Calls",
		title: "Turn Every Call Into Actionable Feedback",
		snippet:
			"Use natural voice conversations to understand how customers and members experienced their insurance, claims, or healthcare journey—not just whether they clicked a survey option.",
		image: "/images/use-case/feedback_call.webp",
		blogHref: "/blog/feedback-calls",
		sections: [
			{
				paragraphs: [
					"A survey can tell you what happened. A conversation can tell you why.",
					"Insurance and healthcare organizations need to understand customer and patient experience.",
					"But a rigid survey often limits the depth of the response.",
					"Optimind can conduct feedback calls as natural conversations, asking structured questions while giving people room to explain their experience in their own words.",
				],
			},
			{
				heading: "Designed for the experience you want to measure",
				paragraphs: [
					"Feedback can be collected after a claim experience, a policy issuance journey, a medical examination, a healthcare interaction, a customer-service interaction, or a hospital or patient experience.",
					"The voice workflow can be configured around the specific journey being evaluated.",
				],
			},
			{
				heading: "Consistency with a human tone",
				paragraphs: [
					"Every customer can receive the same core questions and communication standards, while the conversation remains flexible enough to feel natural.",
					"The agent can recognize when a response requires clarification, capture relevant information, and follow the configured path for escalation or human intervention.",
				],
			},
			{
				heading: "More feedback without more calling teams",
				paragraphs: [
					"Optimind makes it possible to run feedback programs across much larger populations without requiring a person to manually conduct every call.",
					"That means more consistent data, more customer voice, and less operational effort.",
				],
			},
		],
	},
	{
		id: "reminder-calls",
		category: "06 — Reminder Calls",
		title: "Keep Policyholders on Track for Their Insurance Health Check",
		snippet:
			"Automate timely reminders for medical health checks required during insurance policy issuance, helping applicants complete the next step without repeated manual follow-ups.",
		image: "/images/use-case/reminder_call.webp",
		blogHref: "/blog/reminder-calls",
		sections: [
			{
				paragraphs: [
					"A policy can only move forward when the required steps are completed.",
					"During insurance policy issuance, applicants may need to complete a medical examination or health check before the policy can progress.",
					"The challenge isn't always the examination itself. It is getting people to complete the required step on time.",
					"Applicants may miss calls, forget appointments, become busy, or simply need a reminder about what happens next.",
				],
			},
			{
				heading: "Optimind keeps the process moving",
				paragraphs: [
					"A voice agent can make reminder calls at the appropriate point in the policy journey.",
					"It can explain why the health check is required, remind the applicant about the scheduled step, answer routine questions within its configured scope, and follow the appropriate workflow when the applicant needs assistance.",
				],
			},
			{
				heading: "From repeated follow-ups to an automated workflow",
				paragraphs: [
					"Instead of teams repeatedly calling applicants who haven't completed the required step, Optimind can handle routine reminder conversations consistently.",
					"That allows teams to spend more time on exceptions while routine follow-up happens automatically.",
				],
			},
			{
				heading: "Scale during application peaks",
				paragraphs: [
					"Policy issuance volumes can fluctuate significantly.",
					"Optimind can provide additional calling capacity during high-volume periods without requiring the organization to maintain equivalent permanent staffing capacity throughout the year.",
				],
			},
		],
	},

	{
		id: "patient-intake",
		category: "08 — Patient Intake",
		title: "Collect Patient History Before the Visit",
		snippet:
			"Capture structured patient information through a natural voice conversation, helping healthcare teams reduce repetitive intake work before the patient reaches the clinician.",
		image: "/images/use-case/patient_intake.webp",
		blogHref: "/blog/patient-intake",
		sections: [
			{
				paragraphs: [
					"The first few minutes of a healthcare visit shouldn't be spent repeating information.",
					"Patient history is essential, but collecting it can be time-consuming.",
					"Patients may need to provide information through forms, calls, or repeated conversations before their appointment.",
					"Optimind can move that intake process into a voice conversation.",
				],
			},
			{
				heading: "Conversation instead of another form",
				paragraphs: [
					"Patients can answer questions naturally while the voice workflow captures the required information in a structured way.",
					"The experience can be designed around the organization's intake process, including the questions that need to be asked, the information that needs clarification, and situations that should be escalated.",
				],
			},
			{
				heading: "Trained for the workflow",
				paragraphs: [
					"Different healthcare organizations collect information differently.",
					"Optimind can tune the voice experience around the specific workflow and communication style, using multiple representative recordings and conversations to help the model better understand real patient interactions.",
				],
			},
			{
				heading: "Give clinical teams their time back",
				paragraphs: [
					"The objective is straightforward: collect routine information conversationally so healthcare professionals can spend more of their time on the patient—not the intake process.",
				],
			},
		],
	},
	{
		id: "health-coach",
		category: "12 — Health Coach",
		title: "Bring Chronic Care Management Into the Conversation",
		snippet:
			"Keep patients engaged between visits through personalized voice interactions that support chronic-condition management, routine check-ins, and remote monitoring workflows.",
		image: "/images/use-case/health_coach.webp",
		blogHref: "/blog/health-coach",
		sections: [
			{
				paragraphs: [
					"Chronic care happens between appointments.",
					"For patients managing long-term conditions, meaningful progress often depends on what happens between clinical visits.",
					"Regular check-ins, adherence, lifestyle changes, symptom tracking, and ongoing engagement can all become part of the broader care journey.",
					"But healthcare teams have limited time to maintain frequent one-to-one communication with every patient.",
				],
			},
			{
				heading: "Optimind adds a conversational layer between visits",
				paragraphs: [
					"A voice-based health coach can conduct scheduled check-ins, ask configured questions, capture patient-reported information, reinforce approved guidance, and identify situations that need attention.",
					"The goal is not to replace the care team. It is to extend their reach.",
				],
			},
			{
				heading: "Personalized, not robotic",
				paragraphs: [
					"A chronic-care conversation is different from a claims call or an appointment reminder.",
					"The model needs to understand the context, cadence, language, and workflow of the particular use case.",
					"Optimind can tune voice experiences around these workflows using representative conversations and recordings, creating interactions that are more consistent while still feeling conversational.",
				],
			},
			{
				heading: "Scale ongoing engagement",
				paragraphs: [
					"A care team may have limited capacity for regular manual calls.",
					"Voice AI can extend that capacity across a much larger patient population.",
					"That creates the possibility of more frequent touchpoints without requiring healthcare organizations to increase manual calling capacity at the same rate.",
				],
			},
		],
	},
	// {
	// 	id: "discharge-assistant",
	// 	category: "10 — Discharge Assistant",
	// 	title: "Make the Journey Home Easier to Follow",
	// 	snippet:
	// 		"Use conversational voice AI to reinforce post-discharge instructions, answer routine questions, and help patients stay connected to their next steps after leaving the hospital.",
	// 	image: "/images/use-case/discharge_assistant.webp",
	// 	blogHref: "/blog/discharge-assistant",
	// 	sections: [
	// 		{
	// 			paragraphs: [
	// 				"Discharge is a transition—not an ending.",
	// 				"Patients leave with information they need to remember and follow.",
	// 				"Instructions may cover medications, follow-up appointments, recovery steps, and other post-discharge guidance.",
	// 				"Once home, questions naturally arise.",
	// 			],
	// 		},
	// 		{
	// 			heading: "Optimind extends the conversation beyond discharge",
	// 			paragraphs: [
	// 				"An Optimind voice agent can provide scheduled post-discharge conversations around the organization's approved workflow.",
	// 				"It can reinforce relevant instructions, answer routine questions within its configured scope, collect updates, and escalate situations according to predefined rules.",
	// 			],
	// 		},
	// 		{
	// 			heading: "Designed around the organization's process",
	// 			paragraphs: [
	// 				"The agent can be tuned to the specific discharge journey, communication standards, and escalation requirements.",
	// 				"Training with representative conversations can help create a voice experience that is more natural and consistent than a rigid automated message.",
	// 			],
	// 		},
	// 		{
	// 			heading: "Support at scale",
	// 			paragraphs: [
	// 				"Healthcare teams don't always have the capacity to manually follow up with every patient.",
	// 				"Optimind can provide additional conversational capacity without requiring the organization to add the same number of people to make those calls.",
	// 			],
	// 		},
	// 	],
	// },
	// {
	// 	id: "hospital-navigation",
	// 	category: "11 — Hospital Navigation",
	// 	title: "Help Patients Find Their Way",
	// 	snippet:
	// 		"Give patients a voice-first way to find departments, clinics, check-in points, pharmacies and key hospital services—reducing confusion and unnecessary calls to busy front-desk teams.",
	// 	image: "/images/use-case/hospital_navigation.webp",
	// 	blogHref: "/blog/hospital-navigation",
	// 	sections: [
	// 		{
	// 			paragraphs: [
	// 				"Hospitals can be difficult to navigate—even when you know where you're going.",
	// 				'Patients and visitors may need quick answers: "Where do I check in?" "Where is the blood test department?" "How do I get to this clinic?"',
	// 				"These questions are simple, but answering them repeatedly can place unnecessary demand on front-desk and support teams.",
	// 			],
	// 		},
	// 		{
	// 			heading: "Optimind makes navigation conversational",
	// 			paragraphs: [
	// 				"Instead of searching through pages or navigating a complicated phone menu, patients can simply ask.",
	// 				"The voice agent can provide information based on the hospital's configured locations, services, departments, and navigation workflows.",
	// 			],
	// 		},
	// 		{
	// 			heading: "Designed for the environment",
	// 			paragraphs: [
	// 				"Hospital navigation isn't just about knowing a list of departments.",
	// 				"The experience needs to reflect the organization's actual structure and the way patients ask for help.",
	// 				"Optimind can be configured around those workflows and communication patterns.",
	// 			],
	// 		},
	// 		{
	// 			heading: "Less friction at the front desk",
	// 			paragraphs: [
	// 				"When routine navigation questions can be answered automatically, staff can focus on patients who need direct assistance.",
	// 				"And during busy periods, the voice layer can absorb additional demand without requiring the front desk to scale linearly with every increase in volume.",
	// 			],
	// 		},
	// 	],
	// },
	// {
	// 	id: "insurance",
	// 	category: "02 — Insurance",
	// 	title: "Make Every Policy Easier to Understand",
	// 	snippet:
	// 		"Explain coverage, benefits, exclusions, and policy details through a conversational voice experience designed specifically for insurance communication and member questions.",
	// 	image: "/images/use-case/insurance_policydetails.webp",
	// 	blogHref: "/blog/insurance",
	// 	sections: [
	// 		{
	// 			paragraphs: [
	// 				"Insurance shouldn't require a decoder.",
	// 				"Policy documents can be long, detailed, and difficult to navigate.",
	// 				'Customers often call because they want a simple answer: "What does my policy cover?" "Is this included?" "What does this benefit mean?"',
	// 				"Optimind can turn those questions into natural voice conversations.",
	// 				"The agent can be designed around the insurer's policies, approved information, product structures, and customer-service workflows.",
	// 			],
	// 		},
	// 		{
	// 			heading: "Industry context matters",
	// 			paragraphs: [
	// 				"Insurance conversations have their own terminology, rules, and communication requirements.",
	// 				"Optimind's approach is to build the voice experience around the actual use case rather than treating every conversation as a generic support call.",
	// 				"Models can be tuned using multiple representative recordings and conversations so the system can better reflect the language, patterns, and flow of the specific workflow.",
	// 			],
	// 		},
	// 		{
	// 			heading: "Consistent communication at scale",
	// 			paragraphs: [
	// 				"The same communication standards can be maintained across thousands of conversations without requiring every interaction to be handled manually.",
	// 				"Customers get an immediate conversational experience, while teams can focus on cases that genuinely require human judgment.",
	// 			],
	// 		},
	// 	],
	// },
	// {
	// 	id: "patient-follow-up",
	// 	category: "09 — Patient Follow-Up",
	// 	title: "Stay Connected After the Visit",
	// 	snippet:
	// 		"Automate routine patient follow-ups with voice conversations that check in, reinforce next steps, capture updates, and surface situations that need human attention and care.",
	// 	image: "/images/use-case/patient_followup.webp",
	// 	blogHref: "/blog/patient-follow-up",
	// 	sections: [
	// 		{
	// 			paragraphs: [
	// 				"Care doesn't stop when the appointment ends.",
	// 				"Patients may need follow-up communication after a consultation, procedure, test, or treatment.",
	// 				"But manually calling every patient is difficult to sustain.",
	// 				"Optimind can create an automated follow-up layer that keeps patients connected between interactions with the healthcare team.",
	// 			],
	// 		},
	// 		{
	// 			heading: "A conversation that knows why it is calling",
	// 			paragraphs: [
	// 				"The agent can follow a workflow specific to the patient's journey.",
	// 				"It can ask the appropriate questions, collect responses, reinforce approved information, and recognize when the configured workflow requires escalation.",
	// 			],
	// 		},
	// 		{
	// 			heading: "Human when it matters",
	// 			paragraphs: [
	// 				"Not every conversation should end with AI.",
	// 				"If the interaction reaches a situation that requires clinical or human attention, Optimind can follow the configured escalation and handoff process.",
	// 				"This creates a practical balance: AI handles the routine. People handle what needs people.",
	// 			],
	// 		},
	// 		{
	// 			heading: "Extend the team's reach",
	// 			paragraphs: [
	// 				"Instead of choosing between limited manual follow-up and no follow-up at all, healthcare organizations can create a scalable voice layer for routine patient engagement.",
	// 			],
	// 		},
	// 	],
	// },
];

export function UseCaseContent({
	snippet,
	sections,
}: {
	snippet: string;
	sections: UseCaseSection[];
}) {
	return (
		<div className="space-y-8">
			<p className="text-muted-foreground text-lg text-pretty">
				{snippet}
			</p>
			{sections.map((section) => (
				<div
					key={section.heading ?? section.paragraphs[0]}
					className="space-y-3"
				>
					{section.heading ? (
						<h4 className="text-foreground text-xl font-medium tracking-tight">
							{section.heading}
						</h4>
					) : null}
					{section.paragraphs.map((paragraph) => (
						<p
							key={paragraph.slice(0, 48)}
							className="text-muted-foreground text-base text-pretty"
						>
							{paragraph}
						</p>
					))}
				</div>
			))}
		</div>
	);
}

Role
You are a Recruitment & Interview Operations Agent responsible for managing the end-to-end candidate screening and interview workflow.
Your responsibilities include:
Uploading and managing Job Descriptions (JDs) and candidate resumes.
Assessing resumes against a Job Description.
Shortlisting candidates.
Ranking candidates using objective, job-relevant criteria.
Generating Interview Questions
Sending interview invites when requested.
Reviewing interview transcripts and responses.
Scoring candidates based on interview performance.
Providing clear hiring insights and recommendations.
You must be professional, objective, consistent, and explain your reasoning using job-relevant evidence.

Core Principles
1. Be Objective
Evaluate candidates only against information relevant to the role.
Consider factors such as:
Required skills
Relevant experience
Years of experience
Education requirements
Certifications
Domain experience
Responsibilities performed
Technical capabilities
Relevant achievements
Interview performance
Do not make decisions based on protected or irrelevant personal characteristics.
Never infer protected characteristics from a candidate's name, photo, location, language, or other personal information.

2. Never Invent Candidate Information
Only use information explicitly available in:
The Job Description
The candidate's resume
Interview transcripts
Interview scores
Other information explicitly provided by the user
If information is missing, say:
"Not provided."
Do not assume that a candidate has a skill, certification, degree, experience, or achievement that is not stated.

3. Understand the Job Description
When a JD is uploaded or provided, extract and organize:
Role Information
Job title
Department
Seniority
Location
Employment type
Required Qualifications
Mandatory skills
Required years of experience
Required education
Required certifications
Required domain experience
Preferred Qualifications
Nice-to-have skills
Preferred experience
Additional certifications
Additional domain knowledge
Responsibilities
Identify the primary responsibilities and capabilities needed to perform the role successfully.
Use these requirements as the basis for candidate evaluation.

4. Resume Assessment
When a resume is provided, compare it against the active Job Description.
Evaluate:
Skills Match
Identify:
Matching skills
Missing required skills
Additional relevant skills
Experience Match
Evaluate:
Relevant years of experience
Similar roles
Relevant responsibilities
Relevant industries/domains
Education & Certification
Compare stated education and certifications against the JD.
Responsibilities Match
Determine how closely the candidate's previous responsibilities align with the role.
Evidence
For every significant positive or negative assessment, identify the resume evidence supporting the conclusion.
Do not treat keyword presence alone as proof of competency.

5. Candidate Assessment Score
When sufficient information is available, calculate a candidate score using the following framework:
Resume Score — 100 points
Required Skills Match: 30
Relevant Experience: 25
Responsibilities Alignment: 20
Education & Certifications: 10
Domain/Industry Experience: 10
Preferred Skills: 5
Adjust the scoring categories when the JD clearly requires a different weighting.
Mandatory requirements should be treated as gating criteria where appropriate.
For example:
Missing a mandatory certification may make a candidate ineligible.
Missing a required skill may significantly reduce the candidate's score.
Preferred qualifications should not outweigh mandatory qualifications.
Always show the score along with the reasoning.

6. Shortlisting
When asked to shortlist candidates:
Assess every available candidate against the JD.
Apply mandatory requirements.
Calculate comparable scores.
Identify strengths and gaps.
Produce a shortlist.
Explain why each shortlisted candidate was selected.
Use categories such as:
Strong Match
Good Match
Partial Match
Weak Match
Not Qualified
Do not automatically reject a candidate solely because information is missing. Distinguish between:
"Requirement not met"
"Requirement not mentioned"
These are not the same.

7. Candidate Ranking
When asked to rank candidates:
Rank candidates from strongest to weakest based on job-relevant evidence.
Use a structure such as:
RankCandidateScoreMatchKey StrengthsKey Gaps
The ranking should be explainable and reproducible.
If two candidates have similar scores, explain the tie-breaker.
Never claim that a ranking is objectively perfect. It is an evidence-based assessment against the provided JD and candidate information.

8. Interview Invite
When the user asks to schedule an interview:
Collect the required information.
Required information may include:
Candidate Name or identifires

To send an invite you have to provide the following information:
Title: Interview Invite
1. Candidate Name
2. Interview Questions (At least 10)
3. Job Role

Before creating the interview, confirm the final:
Candidate
Job Role
TO CALL THE TOOL YOU NEED TO OUTPUT A JSON WITH THE FOLLOWING INFORMATION 
candidateName, role, questions

If scheduling information is incomplete, ask only for the missing information for candidate name and job description dont ask for any other detail.

To

9. Interview Transcript Analysis
When an interview transcript is available, analyze the candidate's responses.
Evaluate:
Technical Competence
Understanding of relevant concepts
Problem-solving ability
Technical depth
Accuracy
Communication
Clarity
Structure
Ability to explain concepts
Responsiveness
Problem Solving
Reasoning
Approach
Trade-off awareness
Ability to handle ambiguity
Role-Specific Competencies
Evaluate competencies explicitly relevant to the JD.
Behavioral Signals
Where applicable, assess evidence of:
Ownership
Collaboration
Adaptability
Leadership
Accountability
Do not infer personality traits beyond what is reasonably supported by the transcript.

10. Interview Scoring
Use a 100-point interview score unless the configured interview rubric specifies otherwise.
Suggested weighting:
Technical Competence: 35
Problem Solving: 25
Role-Specific Skills: 20
Communication: 10
Behavioral Competencies: 10
For each category provide:
Score
Evidence
Explanation
Example:
Technical Competence: 82/100
Evidence:
The candidate correctly explained X and demonstrated understanding of Y, but struggled with Z.

11. Overall Candidate Assessment
When both resume and interview data are available, provide a combined assessment.
Suggested weighting:
Resume Assessment: 40%
Interview Assessment: 60%
Calculate:
Overall Score = Resume Score × 0.40 + Interview Score × 0.60
However, do not allow a strong interview score to completely compensate for failure to meet mandatory job requirements.
Provide:
Overall score
Resume score
Interview score
Key strengths
Key concerns
Requirement gaps
Hiring recommendation
Possible recommendations:
Strongly Recommend
Recommend
Consider
Do Not Recommend
Insufficient Information

14. Available Operations
When tools are available, use the appropriate operation for the user's request.
Conceptually, the agent should support operations such as:
Upload JD

Parse JD
View JD
Candidate Management
Upload Resume
Parse Resume
View Candidate
Assess Candidate
Shortlist Candidate
Rank Candidates
Interview Invite
Interview Evaluation
View Transcript
Score Interview
Compare Interview Results
Generate Candidate Recommendation
Always use the actual tool result as the source of truth.

20. Important Constraints
Never:
Fabricate candidate information.
Fabricate interview transcripts.
Fabricate interview scores unless explicitly requested as dummy data.
Claim an interview was scheduled without successful tool execution.
Infer protected characteristics.
Use protected characteristics in candidate ranking.
Make hiring decisions based on irrelevant personal information.
Treat missing information as evidence that a requirement is not met.
Hide significant gaps in a candidate's qualifications.
Claim certainty when the evidence is insufficient.
Always:
Use the JD as the evaluation baseline.
Use evidence from the resume and transcript.
Clearly distinguish facts from assessments.
Make scoring criteria transparent.
Identify missing information.
Keep rankings job-related and explainable.


Default Response Format
When assessing a candidate:
Candidate Assessment
Candidate: {name}
Overall Match: {Strong Match / Good Match / Partial Match / Weak Match}
Score: {score}/100
Strengths
...
...
...
Gaps
...
...
...
Requirement Match
Required Skill 1: Met
Required Skill 2: Partially Met
Required Skill 3: Not Mentioned

When ranking candidates:
Candidate Ranking
RankCandidateScoreMatchKey StrengthKey Gap
1
Candidate A
91
Strong
...
...
2
Candidate B
84
Good
...
...
3
Candidate C
72
Partial
...
...


When analyzing an interview:
Interview Evaluation
Candidate: {name}
Interview Score: {score}/100
CompetencyScoreAssessment
Technical Competence
/35
...
Problem Solving
/25
...
Role-Specific Skills
/20
...
Communication
/10
...
Behavioral Competencies
/10
...
Key Evidence
...
...
...

---
Memory:
Candidate List
RESUMES - 

Candidate 1 :
{
  "candidate": {
    "title": "Mr.",
    "firstName": "Gajanan",
    "middleName": "Raghunath",
    "lastName": "Bhosale",
    "fullname": "Gajanan Raghunath Bhosale",
    "gender": "Male",
    "dateOfBirth": "22/06/1985",
    "maritalStatus": "Married",
    "nationality": "",
    "languages": [
      "Marathi",
      "Hindi",
      "English"
    ]
  },
  "contact": {
    "emails": [
      "gaj.bhosale@gmail.com"
    ],
    "phones": [
      "+91-9922843901",
      "+91-7972116990"
    ],
    "linkedin": "linkedin.com/in/gajanan-bhosale-3162a728",
    "address": {
      "fullAddress": "At post Falawani, Tal. Malshiras, Dist – Solapur 413306",
      "villageOrPost": "Falawani",
      "taluka": "Malshiras",
      "district": "Solapur",
      "state": "Maharashtra",
      "country": "India",
      "postalCode": "413306"
    }
  },
  "profileSummary": "Dedicated Maintenance Manager with more than 14 years of total experience, Bachelor degree in Mechanical Engineering, Diploma in Mechanical Engineering, NCTVT and ITI in Motor Mechanic. Experienced in MEP, mechanical, automobile, construction and facility equipment maintenance, with responsibility for Mechanical Department activities at head office and project sites.",
  "careerObjective": "To work in a challenging environment where qualifications and skills can contribute to organizational growth while learning new things and building a result-oriented professional career.",
  "totalExperience": {
    "declaredInResume": "more than 14 years",
    "computedAsOf": "09/09/2026",
    "computedFromExactDatedEmployment": "15 years 7 months",
    "computedFromExactDatedEmploymentMonths": 187,
    "additionalStatedYearOnlyExperience": "2 years",
    "additionalStatedYearOnlyExperienceMonths": 24,
    "computedIncludingStatedYearOnlyExperience": "17 years 7 months",
    "computedIncludingStatedYearOnlyExperienceMonths": 211,
    "notes": [
      "Current employment at Vascon Engineering Ltd. is calculated up to 09/09/2026.",
      "Mercedes Benz and Irrigation Department experience is stated as 2 years, but exact joining and leaving dates are not available.",
      "Millennium leaving date appears as '31-June 2018' in the resume; normalized to 30/06/2018 because June has 30 days."
    ]
  },
  "currentJobTitle": {
    "name": "manager plant and machinery",
    "aliases": [
      "plant and machinery manager",
      "p&m manager",
      "plant manager",
      "machinery manager",
      "equipment manager",
      "maintenance manager"
    ]
  },
  "employmentHistory": [
    {
      "employer": "Vascon Engineering Ltd.",
      "employerAliases": [
        "Vascon Engineers Ltd.",
        "Vascon Engineering Ltd"
      ],
      "jobTitle": {
        "name": "manager plant and machinery",
        "aliases": [
          "plant and machinery manager",
          "p&m manager",
          "plant manager",
          "machinery manager",
          "equipment manager",
          "maintenance manager"
        ]
      },
      "dateofjoining": "09/10/2018",
      "dateofleaving": "",
      "isCurrent": true,
      "originalDurationText": "9 Oct 2018 Continue",
      "computedExperience": "7 years 11 months",
      "computedExperienceMonths": 95,
      "projects": [
        "PMAY",
        "Good Life",
        "Godrej Greens",
        "BMRCL Bangalore"
      ]
    },
    {
      "employer": "ABL Infra Nashik",
      "employerAliases": [
        "ABIL Nashik",
        "Anil Bansilala Lodha Group",
        "ABL Infra Nashik"
      ],
      "jobTitle": {
        "name": "senior manager maintenance",
        "aliases": [
          "sr. manager maintenance",
          "senior maintenance manager",
          "maintenance manager",
          "maintenance head"
        ]
      },
      "dateofjoining": "12/07/2018",
      "dateofleaving": "30/09/2018",
      "isCurrent": false,
      "originalDurationText": "12 July 2018 to 30 Sept 2018",
      "computedExperience": "0 years 2 months 18 days",
      "computedExperienceMonths": 2,
      "projects": [
        "Supreme Jadcherla Hyderabad"
      ]
    },
    {
      "employer": "Millennium Engineer and Contract Pvt. Ltd.",
      "employerAliases": [
        "Millennium Engineers",
        "Millinium Engineers",
        "Millennium Engineer and Contract Pvt Ltd"
      ],
      "jobTitle": {
        "name": "site maintenance in charge",
        "aliases": [
          "site maintenance in-charge",
          "site maintenance head",
          "maintenance in charge",
          "site maintenance supervisor",
          "site maintenance lead"
        ]
      },
      "dateofjoining": "07/11/2016",
      "dateofleaving": "30/06/2018",
      "isCurrent": false,
      "originalDurationText": "07-Nov-16 to 31-June 2018",
      "computedExperience": "1 year 7 months 23 days",
      "computedExperienceMonths": 19,
      "projects": [
        "Godrej Infinity",
        "Kalpataru Jade Baner Pune"
      ],
      "notes": [
        "Original leaving date is written as 31-June 2018; normalized to 30/06/2018."
      ]
    },
    {
      "employer": "A 2 Z Online Service Pvt. Ltd.",
      "employerAliases": [
        "A2Z Online Service Pvt Ltd",
        "A 2 Z Online Service Pvt Ltd",
        "Panchshil Reality"
      ],
      "jobTitle": {
        "name": "assistant manager",
        "aliases": [
          "asst. manager",
          "assistant maintenance manager",
          "deputy manager",
          "junior manager"
        ]
      },
      "dateofjoining": "09/12/2010",
      "dateofleaving": "19/10/2016",
      "isCurrent": false,
      "originalDurationText": "9 Dec 2010 to 19 Oct 2016",
      "computedExperience": "5 years 10 months 10 days",
      "computedExperienceMonths": 70,
      "projects": [
        "One North",
        "Yoo Pune",
        "Bath Pod Factory"
      ]
    },
    {
      "employer": "Mercedes Benz and Irrigation Department",
      "employerAliases": [
        "Mercedes Benz",
        "Daimler Chrysler Group",
        "PWD Irrigation Department",
        "PWD Irrigation Dept"
      ],
      "jobTitle": {
        "name": "",
        "aliases": []
      },
      "dateofjoining": "",
      "dateofleaving": "",
      "isCurrent": false,
      "originalDurationText": "2006 to 2008",
      "statedExperience": "2 years",
      "computedExperience": "",
      "computedExperienceMonths": 0,
      "projects": [
        "Chikhli Plant",
        "Mechanical Repair Shop No-2 Vehicles Department"
      ],
      "notes": [
        "Position is stated as 'On the basis of ITI & NCTVT'; exact job title and dates are not provided."
      ]
    }
  ],
  "education": [
    {
      "qualification": "B.E.",
      "degree": "Bachelor of Engineering",
      "specialization": "Mechanical Engineering",
      "institutionOrBoard": "IEI / AMIE",
      "dateofjoining": "18/03/2012",
      "dateofleaving": "19/09/2016",
      "yearText": "18-03-2012 to 19 Sept 2016",
      "percentage": "74%"
    },
    {
      "qualification": "Diploma",
      "degree": "Diploma in Mechanical Engineering",
      "specialization": "Mechanical Engineering",
      "institutionOrBoard": "MSBTE",
      "dateofjoining": "",
      "dateofleaving": "",
      "yearText": "2008 to 2010",
      "percentage": "85%"
    },
    {
      "qualification": "ITI",
      "degree": "Industrial Training Institute",
      "specialization": "Mechanic Motor Vehicle",
      "institutionOrBoard": "Delhi Board",
      "dateofjoining": "",
      "dateofleaving": "01/07/2005",
      "yearText": "Jul-2005",
      "percentage": "82%"
    },
    {
      "qualification": "NCTVT",
      "degree": "National Council for Training in Vocational Trades",
      "specialization": "Mechanic Motor Vehicle",
      "institutionOrBoard": "DTE Mumbai",
      "dateofjoining": "",
      "dateofleaving": "13/10/2006",
      "yearText": "13-Oct-2006",
      "percentage": "80%"
    },
    {
      "qualification": "Energy auditor and Energy manager exam",
      "degree": "",
      "specialization": "Mechanical",
      "institutionOrBoard": "National Certification Exam",
      "dateofjoining": "",
      "dateofleaving": "",
      "yearText": "2018",
      "percentage": "Appear"
    },
    {
      "qualification": "SSC",
      "degree": "Secondary School Certificate",
      "specialization": "",
      "institutionOrBoard": "Pune University",
      "dateofjoining": "",
      "dateofleaving": "",
      "yearText": "Mar-2001",
      "percentage": "67.33%"
    },
    {
      "qualification": "HSC",
      "degree": "Higher Secondary Certificate",
      "specialization": "Science",
      "institutionOrBoard": "Kolhapur University",
      "dateofjoining": "",
      "dateofleaving": "",
      "yearText": "Feb-2003",
      "percentage": "64.66%"
    }
  ],
  "certificationsAndCourses": [
    {
      "name": "MS-CIT",
      "aliases": [
        "maharashtra state certificate in information technology",
        "ms cit"
      ],
      "date": "01/03/2005",
      "location": "Solapur",
      "score": "85%"
    },
    {
      "name": "MS Office",
      "aliases": [
        "microsoft office",
        "office suite",
        "ms-office"
      ],
      "date": "02/04/2005",
      "location": "Solapur",
      "score": ""
    },
    {
      "name": "AutoCAD",
      "aliases": [
        "auto-cad",
        "autodesk autocad",
        "cad drafting"
      ],
      "date": "07/01/2008",
      "location": "Pune",
      "score": "64%"
    },
    {
      "name": "PLC basic advance course",
      "aliases": [
        "programmable logic controller course",
        "plc course",
        "plc training"
      ],
      "date": "",
      "location": "",
      "score": ""
    },
    {
      "name": "MEP basic foundation course",
      "aliases": [
        "mechanical electrical plumbing course",
        "mep foundation course",
        "mep training"
      ],
      "date": "",
      "location": "MEPA organization",
      "score": ""
    }
  ],
  "skills": [
    {
      "name": "maintenance management",
      "aliases": [
        "maintenance manager",
        "plant maintenance",
        "equipment maintenance",
        "machinery maintenance"
      ]
    },
    {
      "name": "plant and machinery management",
      "aliases": [
        "p&m management",
        "plant machinery management",
        "plant and equipment management",
        "equipment management"
      ]
    },
    {
      "name": "preventive maintenance",
      "aliases": [
        "planned maintenance",
        "scheduled maintenance",
        "pm"
      ]
    },
    {
      "name": "breakdown maintenance",
      "aliases": [
        "break down maintenance",
        "corrective maintenance",
        "emergency repair",
        "machine breakdown handling"
      ]
    },
    {
      "name": "maintenance planning",
      "aliases": [
        "maintenance scheduling",
        "service scheduling",
        "yearly maintenance program",
        "maintenance tracker"
      ]
    },
    {
      "name": "installation and commissioning",
      "aliases": [
        "testing and commissioning",
        "machine commissioning",
        "equipment installation",
        "site commissioning"
      ]
    },
    {
      "name": "construction equipment maintenance",
      "aliases": [
        "construction machinery maintenance",
        "heavy equipment maintenance",
        "construction plant maintenance"
      ]
    },
    {
      "name": "mep",
      "aliases": [
        "mechanical electrical plumbing",
        "mep services",
        "mep maintenance"
      ]
    },
    {
      "name": "mechanical engineering",
      "aliases": [
        "mechanical engg",
        "mechanical",
        "mechanical systems"
      ]
    },
    {
      "name": "automobile maintenance",
      "aliases": [
        "vehicle maintenance",
        "automotive maintenance",
        "motor vehicle mechanic"
      ]
    },
    {
      "name": "facility maintenance",
      "aliases": [
        "facilities maintenance",
        "utility maintenance",
        "building services maintenance"
      ]
    },
    {
      "name": "electrical maintenance",
      "aliases": [
        "electrical knowledge",
        "electrical systems maintenance",
        "electrical equipment maintenance"
      ]
    },
    {
      "name": "sap",
      "aliases": [
        "sap erp",
        "sap service entry",
        "sap grn",
        "sap billing",
        "sap indent"
      ]
    },
    {
      "name": "inventory management",
      "aliases": [
        "spare parts inventory",
        "plant inventory",
        "abc analysis",
        "stock management"
      ]
    },
    {
      "name": "vendor management",
      "aliases": [
        "supplier development",
        "vendor development",
        "supplier management",
        "work order verification"
      ]
    },
    {
      "name": "cost control",
      "aliases": [
        "cost cutting",
        "cost optimization",
        "maintenance cost control",
        "cost saving"
      ]
    },
    {
      "name": "reverse engineering",
      "aliases": [
        "re-engineering",
        "spare reverse engineering",
        "component reverse engineering"
      ]
    },
    {
      "name": "iso 9001:2008",
      "aliases": [
        "iso",
        "quality management system",
        "qms",
        "iso documentation"
      ]
    },
    {
      "name": "total productive maintenance",
      "aliases": [
        "tpm",
        "productive maintenance",
        "lean maintenance"
      ]
    },
    {
      "name": "kaizen",
      "aliases": [
        "kizen",
        "continuous improvement",
        "lean improvement"
      ]
    },
    {
      "name": "5s",
      "aliases": [
        "five s",
        "5s methodology",
        "workplace organization"
      ]
    },
    {
      "name": "safety management",
      "aliases": [
        "site safety",
        "men machine material safety",
        "equipment safety"
      ]
    },
    {
      "name": "manpower management",
      "aliases": [
        "man power management",
        "team management",
        "workforce management"
      ]
    },
    {
      "name": "reporting and documentation",
      "aliases": [
        "maintenance reporting",
        "site records",
        "log books",
        "history cards",
        "performance reports"
      ]
    },
    {
      "name": "autocad",
      "aliases": [
        "auto-cad",
        "autodesk autocad",
        "cad"
      ]
    },
    {
      "name": "ms office",
      "aliases": [
        "microsoft office",
        "office suite",
        "ms-office"
      ]
    },
    {
      "name": "plc",
      "aliases": [
        "programmable logic controller",
        "plc systems",
        "industrial automation"
      ]
    },
    {
      "name": "allen-bradley plc",
      "aliases": [
        "allen bradley",
        "rockwell automation plc",
        "ab plc"
      ]
    },
    {
      "name": "siemens plc",
      "aliases": [
        "simence",
        "siemens automation",
        "siemens programmable logic controller"
      ]
    },
    {
      "name": "schneider electric plc",
      "aliases": [
        "schneider plc",
        "schneider automation",
        "schneider electric"
      ]
    },
    {
      "name": "omron plc",
      "aliases": [
        "omron automation",
        "omron programmable logic controller"
      ]
    },
    {
      "name": "batching plant",
      "aliases": [
        "concrete batching plant",
        "batch plant",
        "rmc plant"
      ]
    },
    {
      "name": "concrete pump",
      "aliases": [
        "concrete pumping equipment",
        "stationary concrete pump",
        "moli pump"
      ]
    },
    {
      "name": "transit mixer",
      "aliases": [
        "tm",
        "concrete transit mixer",
        "truck mixer"
      ]
    },
    {
      "name": "tower crane",
      "aliases": [
        "construction tower crane",
        "fixed tower crane",
        "crane maintenance"
      ]
    },
    {
      "name": "material hoist",
      "aliases": [
        "passenger hoist",
        "material and passenger hoist",
        "construction hoist"
      ]
    },
    {
      "name": "air compressor",
      "aliases": [
        "compressor",
        "single stage compressor",
        "double stage compressor"
      ]
    },
    {
      "name": "bar bending machine",
      "aliases": [
        "rebar bending machine",
        "steel bar bender",
        "bbm"
      ]
    },
    {
      "name": "bar cutting machine",
      "aliases": [
        "rebar cutting machine",
        "steel bar cutter",
        "bcm"
      ]
    },
    {
      "name": "dewatering pump",
      "aliases": [
        "water pump",
        "site dewatering pump",
        "submersible pump"
      ]
    },
    {
      "name": "forklift",
      "aliases": [
        "fork lift",
        "forklift truck",
        "material handling forklift"
      ]
    },
    {
      "name": "excavator",
      "aliases": [
        "hydraulic excavator",
        "earthmoving excavator",
        "crawler excavator"
      ]
    },
    {
      "name": "backhoe loader",
      "aliases": [
        "jcb",
        "loader backhoe",
        "backhoe"
      ]
    },
    {
      "name": "dumper",
      "aliases": [
        "tipper",
        "dump truck",
        "site dumper"
      ]
    },
    {
      "name": "motor grader",
      "aliases": [
        "grader",
        "road grader",
        "construction grader"
      ]
    },
    {
      "name": "road roller",
      "aliases": [
        "roller",
        "vibro roller",
        "compactor roller"
      ]
    },
    {
      "name": "dg set",
      "aliases": [
        "diesel generator",
        "generator set",
        "genset"
      ]
    },
    {
      "name": "fire fighting utility",
      "aliases": [
        "fire pump",
        "fire fighting pump",
        "fire utility system"
      ]
    },
    {
      "name": "hydraulic press maintenance",
      "aliases": [
        "hydraulic press",
        "press maintenance",
        "hydraulic machine maintenance"
      ]
    },
    {
      "name": "water jet machine",
      "aliases": [
        "waterjet machine",
        "water jet cutting machine",
        "high pressure water jet"
      ]
    },
    {
      "name": "cnc wire mesh machine",
      "aliases": [
        "cnc wire mesh",
        "wire mesh machine",
        "cnc mesh welding machine"
      ]
    }
  ],
  "equipmentKnowledge": {
    "constructionMachinery": [
      "Batching plant",
      "Concrete pump",
      "Transit mixer",
      "Power tools",
      "Tower crane",
      "Material and passenger hoist",
      "Silo blower",
      "Silo",
      "Air compressor",
      "Boom placer",
      "Earth compactor",
      "Bar bending machine",
      "Bar cutting machine",
      "Mobile tower crane",
      "Welding machine",
      "Electric motors",
      "Concrete mixer",
      "Vibrator and needle",
      "Sand screening machine",
      "Mini crane",
      "Dewatering pump",
      "Rope suspended platform",
      "Plumbing related machinery",
      "Water jet floor cleaning machine",
      "Cube test machine",
      "Battery operated golf car",
      "Forklift",
      "Spider cleaning machine"
    ],
    "roadAndBridgeConstructionEquipment": [
      "Piling rig",
      "Excavator",
      "Hydra crane",
      "Hyva",
      "Dumper",
      "Vibro roller",
      "Backhoe loader",
      "Tractor",
      "Motor grader",
      "Road roller",
      "Trailer"
    ],
    "specialMachines": [
      "CNC wire mesh machine",
      "Water jet machine",
      "Hydraulic cutting and folding machine",
      "Plate rolling machine",
      "Drilling machine",
      "Hydraulic press",
      "Bench grinder",
      "Air cleaners",
      "Automatic doors",
      "Standing board cutting machine",
      "Engraver machine"
    ],
    "facilityEquipment": [
      "DG sets",
      "Fire fighting utility pump",
      "Garden equipment",
      "Air compressor",
      "Exhaust fan",
      "Automatic gates",
      "Auto doors dryer",
      "Chemical spraying machine"
    ]
  },
  "industryDomains": [
    "Mechanical maintenance",
    "Plant and machinery",
    "Construction equipment",
    "Road and bridge construction equipment",
    "Automobile",
    "Facility equipment",
    "MEP",
    "Industrial maintenance"
  ],
  "projects": [
    {
      "organization": "Vascon Engineers Ltd.",
      "projects": [
        "PMAY",
        "Good Life",
        "Godrej Greens",
        "BMRCL Bangalore"
      ]
    },
    {
      "organization": "ABIL Nashik",
      "projects": [
        "Supreme Jadcherla Hyderabad"
      ]
    },
    {
      "organization": "Millennium Engineers",
      "projects": [
        "Godrej Infinity",
        "Kalpataru Jade Baner Pune"
      ]
    },
    {
      "organization": "Panchshil Reality",
      "projects": [
        "One North",
        "Yoo Pune",
        "Bath Pod Factory"
      ]
    },
    {
      "organization": "Mercedes Benz Daimler Chrysler Group",
      "projects": [
        "Chikhli Plant"
      ]
    },
    {
      "organization": "PWD Irrigation Department",
      "projects": [
        "Mechanical Repair Shop No-2 Vehicles Department"
      ]
    }
  ]
}



---

Candidate 2 :
{
  "fullname": "Sagar Parmar",
  "first_name": "Sagar",
  "middle_name": "",
  "last_name": "Parmar",
  "current_job_title": {
    "title": "Mechanical Maintenance Manager",
    "aliases": [
      "maintenance manager",
      "mechanical manager",
      "mechanical maintenance lead",
      "maintenance engineering manager"
    ]
  },
  "email": "sagarparmar0@gmail.com",
  "phone": "+919313407319",
  "address": "ALAKHNANDA SOCIETY, MUNDRA",
  "date_of_birth": "28/01/1989",
  "nationality": "Indian",
  "summary": "Results-driven Mechanical Maintenance Manager with experience overseeing equipment maintenance, troubleshooting, repair activities, efficiency improvement, downtime reduction, and maintenance process optimization.",
  "total_experience": {
    "years": 15,
    "months": 1,
    "days": 9,
    "calculated_from": "01/08/2011",
    "calculated_to": "09/09/2026"
  },
  "skills": [
    {
      "name": "preventive maintenance",
      "aliases": ["planned maintenance", "pm", "preventative maintenance"]
    },
    {
      "name": "predictive maintenance",
      "aliases": ["condition-based maintenance", "pdm", "predictive maintenance program"]
    },
    {
      "name": "hydraulics and pneumatics",
      "aliases": ["hydraulic and pneumatic system", "hydraulic systems", "pneumatic systems"]
    },
    {
      "name": "machinery installation",
      "aliases": ["machine installation", "equipment installation", "installation and erection"]
    },
    {
      "name": "commissioning",
      "aliases": ["equipment commissioning", "machine commissioning", "plant commissioning"]
    },
    {
      "name": "maintenance planning",
      "aliases": ["scheduling and planning", "maintenance scheduling", "work planning"]
    },
    {
      "name": "customer assistance",
      "aliases": ["customer support", "client assistance", "technical customer support"]
    },
    {
      "name": "team leadership",
      "aliases": ["team management", "people leadership", "staff supervision"]
    },
    {
      "name": "project planning",
      "aliases": ["project scheduling", "project coordination", "project management planning"]
    },
    {
      "name": "budget management",
      "aliases": ["cost control", "budget control", "financial planning"]
    },
    {
      "name": "safety procedures",
      "aliases": ["safety practices", "ehs procedures", "industrial safety"]
    },
    {
      "name": "vendor management",
      "aliases": ["supplier management", "contractor management", "vendor coordination"]
    },
    {
      "name": "performance analysis",
      "aliases": ["equipment performance analysis", "maintenance performance analysis", "kpi analysis"]
    },
    {
      "name": "sap s/4hana",
      "aliases": ["sap s4 hana", "sap s/4 hana", "sap hana"]
    },
    {
      "name": "technical expertise",
      "aliases": ["technical knowledge", "engineering expertise", "technical support"]
    },
    {
      "name": "breakdown maintenance",
      "aliases": ["breakdown diagnostics", "breakdown repair", "corrective maintenance"]
    },
    {
      "name": "root cause analysis",
      "aliases": ["failure analysis", "risk and failure analysis", "rca"]
    },
    {
      "name": "work permit system",
      "aliases": ["permit to work", "ptw", "work permit management"]
    },
    {
      "name": "iso 9001",
      "aliases": ["iso 9001:2015", "quality management system", "qms"]
    },
    {
      "name": "iatf 16949",
      "aliases": ["iatf 16949:2016", "automotive quality management system"]
    },
    {
      "name": "iso 14001",
      "aliases": ["iso 14001:2015", "environmental management system", "ems"]
    },
    {
      "name": "iso 45001",
      "aliases": ["iso 45001:2015", "occupational health and safety management system", "ohsms"]
    },
    {
      "name": "oee",
      "aliases": ["overall equipment effectiveness", "equipment effectiveness"]
    },
    {
      "name": "mttr",
      "aliases": ["mean time to repair", "maintenance repair time"]
    },
    {
      "name": "mtbf",
      "aliases": ["mean time between failures", "mttbf", "equipment reliability metric"]
    },
    {
      "name": "laser alignment",
      "aliases": ["machine alignment", "shaft alignment", "precision alignment"]
    },
    {
      "name": "cnc machines",
      "aliases": ["computer numerical control machines", "cnc equipment", "cnc machinery"]
    },
    {
      "name": "eot cranes",
      "aliases": ["electric overhead travelling cranes", "overhead cranes", "eot crane maintenance"]
    },
    {
      "name": "compressors",
      "aliases": ["air compressors", "industrial compressors", "compressor maintenance"]
    },
    {
      "name": "pumps",
      "aliases": ["centrifugal pumps", "hydraulic pumps", "chemical pumps", "acid pumps"]
    },
    {
      "name": "water treatment plants",
      "aliases": ["ro plant", "dmp plant", "reverse osmosis plant", "demineralization plant"]
    }
  ],
  "languages": [
    {
      "language": "Gujarati",
      "proficiency": "Native"
    },
    {
      "language": "Hindi",
      "proficiency": "Intermediate"
    },
    {
      "language": "English",
      "proficiency": "Intermediate"
    }
  ],
  "experience": [
    {
      "job_title": {
        "title": "Assistant Maintenance Manager",
        "aliases": [
          "assistant manager maintenance",
          "assistant mechanical maintenance manager",
          "maintenance assistant manager",
          "deputy maintenance manager"
        ]
      },
      "employer": "Vishakha Metals Pvt Ltd",
      "industry": "Solar energy",
      "location": "Adani Solar Park, Tunda, Kutch",
      "dateofjoining": "01/12/2021",
      "dateofleaving": "",
      "is_current": true,
      "duration": {
        "years": 4,
        "months": 9,
        "days": 9
      },
      "responsibilities": [
        "Maintained and repaired heavy mechanical equipment including rotary equipment, hydraulic pumps, chemical pumps, acid pumps, extrusion press, compressors, chillers, nitriding process equipment, cooling towers, EOT cranes, CNC machines, PHE, water treatment plants, conveyors, and melting furnaces.",
        "Provided day-to-day technical support for breakdown diagnostics and repairs including risk and failure analysis.",
        "Improved and updated preventive and predictive maintenance programs.",
        "Monitored work permit systems and ensured proper completion and closure of permits.",
        "Maintained and closed preventive maintenance and other orders in SAP S/4HANA on time.",
        "Assisted in capital improvement projects, equipment selection, and installation processes.",
        "Developed and implemented standard operating procedures for routine maintenance tasks.",
        "Handled installation, erection, and commissioning of new machines and projects with safety compliance."
      ]
    },
    {
      "job_title": {
        "title": "Maintenance Incharge",
        "aliases": [
          "maintenance in-charge",
          "maintenance supervisor",
          "maintenance lead",
          "mechanical maintenance incharge",
          "maintenance coordinator"
        ]
      },
      "employer": "Fishfa Group",
      "industry": "Reclaim rubber, fertilizer and API industry",
      "location": "Rajkot, Gujarat",
      "dateofjoining": "01/08/2011",
      "dateofleaving": "30/11/2021",
      "is_current": false,
      "duration": {
        "years": 10,
        "months": 3,
        "days": 29
      },
      "responsibilities": [
        "Maintained and repaired mechanical heavy equipment including centrifugal pumps, extrusion machinery, compressors, reactors with agitators, chillers, cooling towers, DG sets, EOT cranes, valves, boilers, high-pressure autoclaves, KUKA Robotics automatic packing machines, thermal fluid heaters, water treatment plants, bag filters, ash removal systems, conveyors, MIG welding machines, arc welding machines, and grinders.",
        "Provided breakdown diagnostics, repair support, risk analysis, and failure analysis.",
        "Improved preventive and predictive maintenance programs.",
        "Minimized production and quality loss through mechanical spare inventory management.",
        "Maintained documents and records according to ISO 9001:2015, IATF 16949:2016, ISO 14001:2015, and ISO 45001:2015 standards.",
        "Maintained OEE, MTTR, and MTBF records.",
        "Performed machine and laser alignment work.",
        "Monitored work permits and ensured closure of permits.",
        "Inspected safety equipment and ensured good operating condition.",
        "Conducted safety meetings, staff training, and toolbox talks.",
        "Performed accident investigation and prepared weekly and monthly safety reports.",
        "Managed hazardous waste minimization and environmental protection activities.",
        "Streamlined department processes and improved productivity.",
        "Reduced utility system downtime through routine preventive maintenance."
      ]
    }
  ],
  "education": [
    {
      "degree": "Bachelor degree of mechanical engineering",
      "institution": "V.V.P Engineering College",
      "location": "Rajkot, Gujarat",
      "dateofjoining": "01/06/2007",
      "dateofleaving": "31/07/2011",
      "field_of_study": "Mechanical Engineering"
    },
    {
      "degree": "Diploma degree of fire and safety",
      "institution": "CIFSE",
      "location": "Rajkot",
      "dateofjoining": "01/03/2017",
      "dateofleaving": "30/04/2018",
      "field_of_study": "Fire and Safety"
    }
  ],
  "projects": [
    {
      "name": "Integrated gasification of combined cycle power plant",
      "aliases": ["igcc power plant", "integrated gasification combined cycle"],
      "type": "Academic project"
    },
    {
      "name": "Case study on captive power plant at Tata Chemicals Ltd, Mithapur",
      "aliases": ["captive power plant case study", "tata chemicals power plant study"],
      "type": "Academic seminar"
    },
    {
      "name": "Rubber extrusion automation project",
      "aliases": ["rubber extrusion project", "extrusion automation"],
      "type": "Industrial project",
      "organization": "Fishfa Rubbers Ltd"
    },
    {
      "name": "Solid fuel-fired bubbling bed thermic fluid heater installation and commissioning",
      "aliases": ["thermic fluid heater project", "bag filter assembly project"],
      "type": "Industrial project"
    },
    {
      "name": "ETP/STP plant installation and erection",
      "aliases": ["effluent treatment plant project", "sewage treatment plant project"],
      "type": "Industrial project"
    },
    {
      "name": "PEB shed construction for logistics and thermic fluid heater areas",
      "aliases": ["pre-engineered building shed project", "peb shed project"],
      "type": "Industrial project"
    },
    {
      "name": "Safety equipment setup review and government design approval",
      "aliases": ["safety equipment approval project", "statutory safety approval"],
      "type": "Industrial project"
    },
    {
      "name": "Fully automatic CNC machine installation, erection, and commissioning",
      "aliases": ["cnc machine commissioning", "automatic cnc installation"],
      "type": "Industrial project"
    },
    {
      "name": "LNG plant installation, erection, and commissioning",
      "aliases": ["lng plant commissioning", "liquefied natural gas plant project"],
      "type": "Industrial project"
    }
  ],
  "achievements": [
    "Successfully completed all projects within designated timelines while prioritizing safety precautions.",
    "Modified CNC machines to enhance efficiency.",
    "Modified shot blasting machine to reduce air consumption by removing pneumatic cylinders and valve parts and installing a smoother material handling system to increase production."
  ],
  "certifications": [],
  "awards": [],
  "social_links": [],
  "portfolio_links": []
}

---

Candidate 3 :

{
  "candidate_profile": {
    "fullname": "Abhishek Kumar Singh",
    "first_name": "Abhishek",
    "middle_name": "Kumar",
    "last_name": "Singh",
    "email": "0894abhisingh@gmail.com",
    "phone_numbers": [
      "+91 8602739397",
      "+974 55134783"
    ],
    "date_of_birth": "08/10/1994",
    "nationality": "Indian",
    "gender": "",
    "marital_status": "",
    "address": {
      "full_address": "C/O Abinash Kumar Singh, Near Camford Public School, Brahmsthan, Kurthaul, Patna, Bihar, India - 804453",
      "city": "Patna",
      "state": "Bihar",
      "country": "India",
      "postal_code": "804453"
    },
    "linkedin": "https://www.linkedin.com/in/abhishek-singh-b49327163",
    "portfolio": "",
    "summary": "Engineering and plant operations professional with experience in site engineering, plant operations, shift supervision, mechanical maintenance, shutdown maintenance, safety compliance, troubleshooting, installation and commissioning, and team leadership across oil & gas, construction, steel plant, and industrial maintenance environments.",
    "total_experience": {
      "as_of_date": "09/09/2026",
      "years": 10,
      "months": 1,
      "days": 8,
      "total_months": 121,
      "decimal_years": 10.1
    }
  },
  "current_employment": {
    "job_title": {
      "title": "Site Engineer",
      "aliases": [
        "site engineer",
        "field engineer",
        "construction site engineer",
        "site execution engineer",
        "project site engineer"
      ]
    },
    "employer": "Tritorc",
    "location": "Qatar",
    "dateofjoining": "01/09/2023",
    "dateofleaving": "",
    "is_current": true
  },
  "employment_history": [
    {
      "job_title": {
        "title": "Site Engineer",
        "aliases": [
          "site engineer",
          "field engineer",
          "construction site engineer",
          "site execution engineer",
          "project site engineer"
        ]
      },
      "employer": "Tritorc",
      "location": "Qatar",
      "dateofjoining": "01/09/2023",
      "dateofleaving": "",
      "is_current": true,
      "responsibilities": [
        "Performed pipeline essential services including bolt torquing, flange tensioning, flange facing, hot tapping, and cold cutting.",
        "Managed periodical shutdown maintenance of oil and gas plants.",
        "Handled crew operations at Ras Laffan Industrial City, Qatar.",
        "Managed shutdown planning, client compliance, and safety compliance.",
        "Coordinated with operations teams for proper execution of site activities.",
        "Implemented quality control measures to ensure compliance.",
        "Led torquing crews to ensure efficient and timely completion of shutdown work.",
        "Conducted site inspections and collaborated with client site coordinators to resolve issues."
      ]
    },
    {
      "job_title": {
        "title": "Plant Operation Head",
        "aliases": [
          "plant operation head",
          "plant operations head",
          "plant operations manager",
          "operations head",
          "plant manager",
          "production operations head"
        ]
      },
      "employer": "M/S Blue Peter Engineers and Contractors",
      "location": "Kalinganagar, Jajpur, Orissa, India",
      "dateofjoining": "01/10/2021",
      "dateofleaving": "30/09/2023",
      "is_current": false,
      "responsibilities": [
        "Developed and implemented sales and marketing strategies to increase customer acquisition and retention.",
        "Identified and negotiated strategic partnerships with industry players to increase market reach and revenue growth.",
        "Led a team of 150+ employees to improve production efficiency.",
        "Implemented cost-saving measures resulting in 10-15% reduction in operational expenses.",
        "Developed and implemented safety protocols resulting in zero accident record for 2 consecutive years.",
        "Led supervisors and maintenance technicians in maintenance and troubleshooting of HSM, mechanical and hydraulic systems, and RMHS yard equipment.",
        "Worked on equipment including stacker cum reclaimer, blender reclaimer, belt conveyor, truck tippler, wagon tippler, and twin boom stacker.",
        "Managed installation and commissioning projects in RMHS, CRM, and SMS.",
        "Monitored day-to-day activities and conducted weekly review meetings with site engineers, HR/admin teams, and safety teams."
      ]
    },
    {
      "job_title": {
        "title": "Shift Incharge",
        "aliases": [
          "shift incharge",
          "shift in-charge",
          "shift supervisor",
          "shift lead",
          "shift manager",
          "operations shift supervisor"
        ]
      },
      "employer": "Vaaman Engineers India Limited",
      "location": "Meramandali, Orissa, India",
      "dateofjoining": "01/11/2020",
      "dateofleaving": "30/09/2021",
      "is_current": false,
      "responsibilities": [
        "Managed and directed a team of employees as shift incharge.",
        "Trained and supervised staff members while ensuring adherence to company policies and procedures.",
        "Handled customer complaints and resolved issues to ensure customer satisfaction.",
        "Implemented work schedules and maintained a productive work environment through effective communication.",
        "Led maintenance technicians in maintaining and troubleshooting RMHS yard equipment including stacker cum reclaimer, blender reclaimer, belt conveyor, truck tippler, wagon tippler, and twin boom stacker.",
        "Resolved technical issues promptly to ensure uninterrupted production operations."
      ]
    },
    {
      "job_title": {
        "title": "Site Supervisor",
        "aliases": [
          "site supervisor",
          "construction supervisor",
          "field supervisor",
          "site foreman",
          "site coordinator"
        ]
      },
      "employer": "M/S Blue Peter Engineers and Contractors",
      "location": "Jamshedpur, Jharkhand, India",
      "dateofjoining": "01/08/2018",
      "dateofleaving": "30/11/2020",
      "is_current": false,
      "responsibilities": [
        "Managed daily maintenance and coordinated resources for a site of up to 50 workers.",
        "Oversaw adherence to safety regulations and implemented preventive measures to minimize accidents.",
        "Collaborated with clients, subcontractors, and consultants to ensure timely project completion.",
        "Conducted site inspections and maintained detailed records to ensure quality control and project compliance."
      ]
    },
    {
      "job_title": {
        "title": "Supervisor",
        "aliases": [
          "supervisor",
          "team supervisor",
          "operations supervisor",
          "site supervisor",
          "frontline supervisor"
        ]
      },
      "employer": "General Construction",
      "location": "Jamshedpur, Jharkhand, India",
      "dateofjoining": "01/08/2016",
      "dateofleaving": "31/07/2018",
      "is_current": false,
      "responsibilities": [
        "Supervised a team of 10 employees to achieve department goals and targets.",
        "Implemented a new training program resulting in increased employee productivity."
      ]
    }
  ],
  "education": [
    {
      "degree": "Bachelor of Engineering",
      "field_of_study": "",
      "institution": "VNS Institute of Technology",
      "university_or_board": "R.G.P.V., Bhopal",
      "location": "Bhopal, Madhya Pradesh, India",
      "start_date": "01/01/2012",
      "end_date": "31/12/2016",
      "grade": "C.G.P.A. 7.77",
      "result": "Pass with Honours"
    },
    {
      "degree": "Intermediate",
      "field_of_study": "",
      "institution": "D.A.V. Public School",
      "university_or_board": "B.S.E.B. Patna",
      "location": "Patna, Bihar, India",
      "start_date": "01/01/2010",
      "end_date": "31/12/2012",
      "grade": "63%",
      "result": "Pass with 1st Division"
    }
  ],
  "skills": [
    {
      "name": "leadership",
      "aliases": [
        "team leadership",
        "people management",
        "team management",
        "crew leadership"
      ]
    },
    {
      "name": "communication",
      "aliases": [
        "communication skills",
        "verbal communication",
        "workplace communication",
        "stakeholder communication"
      ]
    },
    {
      "name": "problem solving",
      "aliases": [
        "analytical problem solving",
        "issue resolution",
        "troubleshooting",
        "root cause analysis"
      ]
    },
    {
      "name": "construction management",
      "aliases": [
        "site management",
        "construction supervision",
        "project site management",
        "field construction management"
      ]
    },
    {
      "name": "cost management",
      "aliases": [
        "cost control",
        "cost optimization",
        "budget control",
        "expense reduction"
      ]
    },
    {
      "name": "decision making",
      "aliases": [
        "decision-making",
        "operational decision making",
        "judgement",
        "critical decision making"
      ]
    },
    {
      "name": "budget management",
      "aliases": [
        "budgeting",
        "budget control",
        "financial planning",
        "cost budgeting"
      ]
    },
    {
      "name": "safety procedures",
      "aliases": [
        "safety compliance",
        "hse compliance",
        "industrial safety",
        "safety protocols"
      ]
    },
    {
      "name": "shutdown planning",
      "aliases": [
        "plant shutdown planning",
        "maintenance shutdown planning",
        "turnaround planning",
        "shutdown coordination"
      ]
    },
    {
      "name": "data analysis",
      "aliases": [
        "operational analysis",
        "performance analysis",
        "production data analysis",
        "report analysis"
      ]
    },
    {
      "name": "critical thinking",
      "aliases": [
        "analytical thinking",
        "logical reasoning",
        "structured thinking",
        "critical reasoning"
      ]
    },
    {
      "name": "attention to detail",
      "aliases": [
        "detail orientation",
        "accuracy",
        "quality focus",
        "meticulousness"
      ]
    },
    {
      "name": "technical analysis",
      "aliases": [
        "engineering analysis",
        "technical troubleshooting",
        "technical evaluation",
        "equipment analysis"
      ]
    },
    {
      "name": "time management",
      "aliases": [
        "schedule management",
        "prioritization",
        "deadline management",
        "work planning"
      ]
    },
    {
      "name": "troubleshooting",
      "aliases": [
        "fault finding",
        "technical troubleshooting",
        "equipment troubleshooting",
        "issue diagnosis"
      ]
    },
    {
      "name": "mechanical skills",
      "aliases": [
        "mechanical maintenance",
        "mechanical troubleshooting",
        "mechanical systems",
        "mechanical engineering skills"
      ]
    },
    {
      "name": "multitasking",
      "aliases": [
        "multi-tasking",
        "task management",
        "parallel task handling",
        "workload management"
      ]
    },
    {
      "name": "plant operations",
      "aliases": [
        "plant operation",
        "industrial operations",
        "production operations",
        "operations management"
      ]
    },
    {
      "name": "quality control",
      "aliases": [
        "qc",
        "quality assurance",
        "quality inspection",
        "compliance inspection"
      ]
    },
    {
      "name": "site inspection",
      "aliases": [
        "site inspections",
        "field inspection",
        "construction inspection",
        "quality inspection"
      ]
    },
    {
      "name": "bolt torquing",
      "aliases": [
        "bolt torqueing",
        "controlled bolting",
        "hydraulic bolt torquing",
        "torque tightening"
      ]
    },
    {
      "name": "flange tensioning",
      "aliases": [
        "bolt tensioning",
        "hydraulic tensioning",
        "flange bolt tensioning",
        "controlled tensioning"
      ]
    },
    {
      "name": "flange facing",
      "aliases": [
        "flange resurfacing",
        "flange machining",
        "on-site flange facing",
        "flange refacing"
      ]
    },
    {
      "name": "hot tapping",
      "aliases": [
        "hot tap",
        "pressure tapping",
        "live line tapping",
        "in-service tapping"
      ]
    },
    {
      "name": "cold cutting",
      "aliases": [
        "pipe cold cutting",
        "mechanical cold cutting",
        "cold pipe cutting",
        "non-spark cutting"
      ]
    },
    {
      "name": "hydraulics",
      "aliases": [
        "hydraulic systems",
        "hydraulic maintenance",
        "mechanical hydraulics",
        "hydraulic troubleshooting"
      ]
    },
    {
      "name": "installation and commissioning",
      "aliases": [
        "erection and commissioning",
        "equipment commissioning",
        "project commissioning",
        "site commissioning"
      ]
    },
    {
      "name": "conveyor systems",
      "aliases": [
        "belt conveyor",
        "material handling conveyor",
        "conveyor maintenance",
        "conveyor erection"
      ]
    },
    {
      "name": "rmhs equipment",
      "aliases": [
        "raw material handling system",
        "rmhs yard equipment",
        "material handling equipment",
        "bulk material handling equipment"
      ]
    },
    {
      "name": "stacker cum reclaimer",
      "aliases": [
        "stacker reclaimer",
        "scr",
        "yard stacker reclaimer",
        "bulk material stacker reclaimer"
      ]
    },
    {
      "name": "truck tippler",
      "aliases": [
        "truck tipper",
        "tippler system",
        "bulk unloading truck tippler",
        "truck unloading system"
      ]
    },
    {
      "name": "wagon tippler",
      "aliases": [
        "rail wagon tippler",
        "wagon unloading system",
        "railcar tippler",
        "rotary wagon tippler"
      ]
    },
    {
      "name": "sales and marketing",
      "aliases": [
        "business development",
        "sales strategy",
        "marketing strategy",
        "customer acquisition"
      ]
    }
  ],
  "languages": [
    {
      "language": "English",
      "proficiency": "Advanced"
    },
    {
      "language": "Hindi",
      "proficiency": "Native"
    }
  ],
  "projects": [
    {
      "name": "Revival Project of RMHS Yard Equipment",
      "description": "Revival project involving stacker cum reclaimer, twin boom stacker, blender reclaimer, truck tipplers, and wagon tipplers."
    },
    {
      "name": "Erection & Commissioning of Conveyor System",
      "description": "Worked on erection and commissioning activities for conveyor systems."
    },
    {
      "name": "Stacker Cum Reclaimer Slew Bearing Changing",
      "description": "Performed or supported slew bearing replacement for stacker cum reclaimer equipment."
    },
    {
      "name": "Changing of Screens and Feeders in RMBB",
      "description": "Worked on changing coke screens, flux screens, vibro feeder, and weigh feeder in RMBB."
    }
  ],
  "certifications": [
    {
      "name": "JNTVTI Certification of High Risk Supervisor",
      "issuing_organization": "JNTVTI",
      "issue_date": "",
      "expiry_date": "",
      "credential_id": ""
    },
    {
      "name": "JNTVTI Certification of Rigger",
      "issuing_organization": "JNTVTI",
      "issue_date": "",
      "expiry_date": "",
      "credential_id": ""
    }
  ],
  "honors_and_awards": [
    "Won 1st prize in inter-college singing competition twice.",
    "Won 2nd prize in group singing event.",
    "Participated in state-level cricket tournament.",
    "Represented college in Nodal tournament of university as captain of kabaddi, basketball, and badminton teams."
  ],
  "references": [
    {
      "name": "Mr. Sandeep Singh Bhatti",
      "designation": "GM",
      "organization": "M/S Blue Peter Engineers & Contractors",
      "phone": "+91 9334811387",
      "email": ""
    },
    {
      "name": "Mr. Rohit",
      "designation": "Manager",
      "organization": "M/S Blue Peter Engineers & Contractors",
      "phone": "+91 9234275917",
      "email": ""
    },
    {
      "name": "Mr. Chandan Kumar",
      "designation": "Safety Head",
      "organization": "General Construction",
      "phone": "+91 7209114991",
      "email": ""
    }
  ]
}
---

Candidate 4 :
{
  "fullname": "M.R. Hariharan",
  "first_name": "Hariharan",
  "middle_name": "",
  "last_name": "",
  "email": "hariharanmr62@gmail.com",
  "phone": "9940631187",
  "date_of_birth": "03/06/1981",
  "gender": "",
  "marital_status": "Married",
  "nationality": "",
  "current_location": "Coimbatore, Tamil Nadu, India",
  "address": {
    "line1": "13/28, Ayyavu Nagar 2nd Street",
    "line2": "Landmark – EB Office, Vedapatti (PO), Thondamuthur (Via)",
    "city": "Coimbatore",
    "district": "Coimbatore",
    "state": "Tamil Nadu",
    "country": "India",
    "postal_code": "641007"
  },
  "career_objective": "A challenging and growth oriented position in a progressive company, where I contribute to the organization's success with my financial expertise and through my innovative ideas and desire to achieve excellence.",
  "total_experience": {
    "as_of_date": "09/09/2026",
    "years": 21.04,
    "display": "Approximately 21 years 0 months",
    "computed_from_employer_dates": true
  },
  "notice_period": "2 Months from Offer Letter",
  "languages": [
    "Tamil",
    "English"
  ],
  "skills": [
    {
      "name": "sap",
      "aliases": [
        "sap erp",
        "systems applications and products",
        "sap system"
      ]
    },
    {
      "name": "erp",
      "aliases": [
        "enterprise resource planning",
        "erp system",
        "erp software"
      ]
    },
    {
      "name": "microsoft office",
      "aliases": [
        "ms office",
        "office suite",
        "microsoft word",
        "microsoft excel",
        "microsoft powerpoint"
      ]
    },
    {
      "name": "supply chain management",
      "aliases": [
        "scm",
        "supply chain",
        "supply chain operations"
      ]
    },
    {
      "name": "stores management",
      "aliases": [
        "store management",
        "stores",
        "warehouse stores",
        "material stores"
      ]
    },
    {
      "name": "procurement",
      "aliases": [
        "purchase",
        "purchasing",
        "material procurement",
        "procure-to-pay"
      ]
    },
    {
      "name": "inventory control",
      "aliases": [
        "inventory management",
        "stock control",
        "material inventory"
      ]
    },
    {
      "name": "vendor management",
      "aliases": [
        "supplier management",
        "vendor development",
        "supplier coordination"
      ]
    },
    {
      "name": "purchase order management",
      "aliases": [
        "po preparation",
        "purchase order",
        "po approval process"
      ]
    },
    {
      "name": "request for quotation",
      "aliases": [
        "rfq",
        "quotation request",
        "supplier quotation"
      ]
    },
    {
      "name": "goods receipt note",
      "aliases": [
        "grn",
        "goods receipt",
        "material receipt note"
      ]
    },
    {
      "name": "logistics coordination",
      "aliases": [
        "logistics",
        "vehicle arrangement",
        "dispatch coordination",
        "freight coordination"
      ]
    },
    {
      "name": "import documentation",
      "aliases": [
        "imports clearance",
        "customs documentation",
        "bill of entry checklist",
        "import consignment clearance"
      ]
    },
    {
      "name": "fifo",
      "aliases": [
        "first in first out",
        "fifo method",
        "stock rotation"
      ]
    },
    {
      "name": "barcoding",
      "aliases": [
        "bar coding",
        "barcode labeling",
        "barcode stickers"
      ]
    },
    {
      "name": "iso documentation",
      "aliases": [
        "iso audit documentation",
        "iso records",
        "quality audit documentation"
      ]
    },
    {
      "name": "5s",
      "aliases": [
        "5s auditing",
        "5s methodology",
        "workplace organization"
      ]
    },
    {
      "name": "cad",
      "aliases": [
        "computer-aided design",
        "cad drawing",
        "engineering drawing"
      ]
    },
    {
      "name": "gis",
      "aliases": [
        "geographic information system",
        "gis updating",
        "network gis"
      ]
    },
    {
      "name": "mis reporting",
      "aliases": [
        "mis",
        "management information system",
        "management reporting"
      ]
    },
    {
      "name": "network planning",
      "aliases": [
        "telecom network planning",
        "fiber network planning",
        "network design"
      ]
    }
  ],
  "job_titles": [
    {
      "title": "executive - stores",
      "aliases": [
        "stores executive",
        "executive stores",
        "scm stores executive",
        "store executive"
      ]
    },
    {
      "title": "engineer - purchase and stores",
      "aliases": [
        "purchase engineer",
        "stores engineer",
        "engineer purchase",
        "engineer stores",
        "scm purchase engineer"
      ]
    },
    {
      "title": "assistant engineer - stores",
      "aliases": [
        "assistant engineer stores",
        "scm stores assistant engineer",
        "assistant stores engineer"
      ]
    },
    {
      "title": "senior lead officer - network planning and gis",
      "aliases": [
        "senior lead officer",
        "network planning officer",
        "gis officer",
        "senior network planning officer",
        "telecom planning officer"
      ]
    }
  ],
  "work_experience": [
    {
      "employer": "Adwaith Lakshmi Industries Private Limited",
      "employer_aliases": [
        "M/s Adwaith Lakshmi Industries Private Limited",
        "Adwaith Lakshmi Industries Pvt Ltd",
        "Group of LMW Ltd"
      ],
      "location": "Kaniyur, Coimbatore",
      "dateofjoining": "23/10/2020",
      "dateofleaving": "",
      "is_current_employer": true,
      "duration": {
        "as_of_date": "09/09/2026",
        "years": 5.88,
        "display": "5 years 10 months"
      },
      "job_title": {
        "title": "executive - stores",
        "aliases": [
          "stores executive",
          "executive stores",
          "scm stores executive",
          "store executive"
        ]
      },
      "department": "SCM - Stores",
      "responsibilities": [
        "Handled incoming raw materials, child parts and general items.",
        "Supervised unloading of materials and checked quantities against supplier invoices.",
        "Checked materials for damage or shortage and prepared Goods Receipt Note in the system.",
        "Coordinated quality inspection and moved accepted materials to correct store locations.",
        "Prepared debit notes and goods rejection documents for rejected materials and returned materials to suppliers.",
        "Sent GRN and original bill documents to accounts department.",
        "Prepared subcontract job work challans for outside processing parts.",
        "Issued materials to production team against production orders.",
        "Maintained documentation for goods inward bills, production orders and consumable orders.",
        "Coordinated with planning and marketing teams for sale invoice preparation.",
        "Coordinated with logistics team for vehicle arrangement after invoice preparation.",
        "Participated in external stock audits every six months and reported to management.",
        "Ensured daily dispatch of materials to customers.",
        "Maintained storage facilities, housekeeping and material handling equipment.",
        "Maintained documentation for ISO and 5S audits.",
        "Prepared reports required by management."
      ]
    },
    {
      "employer": "Lakshmi Electrical Control System Limited",
      "employer_aliases": [
        "M/s Lakshmi Electrical Control System Limited",
        "LECS",
        "Group of LMW Ltd"
      ],
      "location": "Arasur, Coimbatore",
      "dateofjoining": "01/04/2013",
      "dateofleaving": "31/07/2020",
      "is_current_employer": false,
      "duration": {
        "years": 7.33,
        "display": "7 years 4 months"
      },
      "job_title": {
        "title": "engineer - purchase and stores",
        "aliases": [
          "purchase engineer",
          "stores engineer",
          "engineer purchase",
          "engineer stores",
          "scm purchase engineer",
          "assistant engineer - stores"
        ]
      },
      "department": "SCM - Purchase / SCM - Stores",
      "responsibilities": [
        "Received purchase requisitions from various departments.",
        "Prepared RFQs and forwarded them to relevant suppliers and dealers for quotations.",
        "Negotiated material prices with vendors and prepared comparative statements.",
        "Prepared purchase orders for raw materials, bought-out items, consumables, general items and import procurement items.",
        "Obtained order acceptance and delivery schedules from suppliers.",
        "Followed up with suppliers to receive materials on time.",
        "Ensured procured items met required quality standards and specifications.",
        "Coordinated with accounts for payments through cheque, TT or LC.",
        "Handled import purchase order preparation and approval process.",
        "Coordinated advance TT payment using order acknowledgement and proforma invoice.",
        "Tracked ETD, ETA, invoices and packing lists from foreign suppliers.",
        "Coordinated air and sea freight cost, transit time and freight mode approvals.",
        "Coordinated with forwarders for material pickup and AWB/BOL copies.",
        "Arranged insurance and prepared import consignment clearance documents.",
        "Coordinated bill of entry checklist approval and customs duty payment.",
        "Followed up with stores for GRN preparation in SAP and bill closure with accounts.",
        "Coordinated quality inspection for import and domestic materials.",
        "Managed inventory control and inventory requirements.",
        "Handled new vendor development and vendor master creation in SAP."
      ],
      "achievements": [
        "Introduced barcoding color stickers and FIFO pasting methods in stores.",
        "Onboarded domestic vendors into LECS supplier portal and trained suppliers to create ASN during material delivery.",
        "Identified non-moving items and sold common items to other suppliers to reduce inventory levels.",
        "Developed alternate sources for consumable items and reduced procurement cost.",
        "Improved supplier material packing standards to reduce wastage and increase productivity.",
        "Insisted suppliers maintain safety stock for regular items based on consumption pattern to avoid inventory issues and line stoppage."
      ]
    },
    {
      "employer": "Bharti Airtel Limited",
      "employer_aliases": [
        "M/s Bharti Airtel Limited",
        "Bharti Airtel Ltd",
        "Airtel"
      ],
      "location": "Chennai",
      "dateofjoining": "01/06/2005",
      "dateofleaving": "31/03/2013",
      "is_current_employer": false,
      "duration": {
        "years": 7.83,
        "display": "7 years 10 months"
      },
      "job_title": {
        "title": "senior lead officer - network planning and gis",
        "aliases": [
          "senior lead officer",
          "network planning officer",
          "gis officer",
          "senior network planning officer",
          "telecom planning officer"
        ]
      },
      "department": "Network Planning & GIS",
      "responsibilities": [
        "Performed route survey and route finalization.",
        "Prepared planning diagrams and sent them to project team.",
        "Obtained execution work orders from Airtel team.",
        "Prepared quarterly material projections.",
        "Handled CAD drawing and GIS updating for planning and reference.",
        "Produced MIS reports for management decision-making regarding network.",
        "Checked ECRM fiber feasibility and located sites in updated fiber ABD.",
        "Checked nearest fiber route and node availability.",
        "Handled field survey details for copper and fiber.",
        "Fixed customer appointments for in-building survey for wiring and space availability.",
        "Completed IB and OSP surveys with physical measurements.",
        "Captured bridge, culvert, milestone and reference point details for ROW purpose.",
        "Oversaw site planning and feasibility studies.",
        "Prepared solution drawings with current and proposed network conditions for field execution."
      ]
    }
  ],
  "education": [
    {
      "qualification": "Diploma in Electrical & Electronics Engineering",
      "qualification_aliases": [
        "DEEE",
        "Diploma in EEE",
        "Electrical and Electronics Engineering Diploma"
      ],
      "institution": "Annai J.K.K. Sampoorani Ammal Polytechnic College",
      "location": "T.N. Palayam, Gobi, Erode-DT",
      "year_of_completion": "2004",
      "percentage": 93,
      "dateofcompletion": ""
    },
    {
      "qualification": "HSC",
      "qualification_aliases": [
        "Higher Secondary Certificate",
        "12th Standard",
        "Higher Secondary"
      ],
      "institution": "G.H.S. School, Mohanur",
      "location": "Mohanur",
      "year_of_completion": "1998",
      "percentage": 71,
      "dateofcompletion": ""
    },
    {
      "qualification": "SSLC",
      "qualification_aliases": [
        "Secondary School Leaving Certificate",
        "10th Standard",
        "Secondary School"
      ],
      "institution": "G.H.S. School, Mohanur",
      "location": "Mohanur",
      "year_of_completion": "1996",
      "percentage": 71.2,
      "dateofcompletion": ""
    }
  ],
  "personal_details": {
    "father_name": "Mr. S. Ramanathan",
    "mother_name": "Mrs. R. Jayalakshmi",
    "children": 2,
    "hobbies": [
      "Listening Music",
      "Playing Chess",
      "Trekking",
      "Traveling Hills side"
    ]
  },
  "declaration_place": "Coimbatore",
  "declaration_date": ""
}

---

Candidate 5 :

{
  "personal_information": {
    "fullname": "Chennuri Reddy Supraja",
    "first_name": "Chennuri",
    "middle_name": "Reddy",
    "last_name": "Supraja",
    "email": "suprajachennuri31@gmail.com",
    "phone": "+919502122479",
    "current_location": "Bangalore",
    "country": "India"
  },
  "professional_summary": "1 year of experience as Associate Software Engineer / Software Developer at HCL Technologies through A&A Innovative Solutions Pvt Ltd. Experienced in Core Java, web technologies, databases, and application development.",
  "total_experience": {
    "years": 0,
    "months": 10,
    "days": 0,
    "source": "Computed from employment/project dates: 01/09/2020 to 30/06/2021"
  },
  "job_titles": [
    {
      "title": "associate software engineer",
      "aliases": [
        "associate software developer",
        "junior software engineer",
        "software engineer associate"
      ]
    },
    {
      "title": "software developer",
      "aliases": [
        "software engineer",
        "application developer",
        "java developer"
      ]
    },
    {
      "title": "team member",
      "aliases": [
        "project team member",
        "development team member"
      ]
    }
  ],
  "employment_history": [
    {
      "employer": "HCL Technologies",
      "employer_aliases": [
        "HCL",
        "HCL Technologies Ltd",
        "HCL TECHNOLOGIES"
      ],
      "payroll_or_vendor_company": "A&A Innovative Solutions Pvt Ltd",
      "job_title": "software developer",
      "job_title_aliases": [
        "software engineer",
        "application developer",
        "java developer"
      ],
      "dateofjoining": "01/09/2020",
      "dateofleaving": "30/06/2021",
      "is_current": false,
      "duration": {
        "years": 0,
        "months": 10,
        "days": 0
      },
      "responsibilities": [
        "Designed the back end for the application using Core Java and Spring framework.",
        "Designed the database and created required tables using Oracle."
      ]
    }
  ],
  "projects": [
    {
      "name": "Standard Chartered Bank",
      "client": "Standard Chartered Bank",
      "domain": "Banking",
      "role": "team member",
      "team_size": 12,
      "dateofjoining": "01/09/2020",
      "dateofleaving": "30/06/2021",
      "description": "Developed an application to provide effective management of staff and customer data in banks, using data mining concepts for customer care management.",
      "responsibilities": [
        "Designed backend components using Core Java and Spring framework.",
        "Created database tables and worked with Oracle database.",
        "Worked on application features for bank customer and staff data management."
      ],
      "technologies": [
        "html",
        "css",
        "bootstrap",
        "javascript",
        "angular",
        "core java",
        "hibernate",
        "mvc",
        "dao",
        "dto",
        "factory pattern",
        "oracle",
        "eclipse",
        "visual studio code",
        "mysql workbench",
        "tomcat"
      ]
    }
  ],
  "skills": [
    {
      "name": "html",
      "aliases": [
        "hypertext markup language",
        "html5"
      ]
    },
    {
      "name": "css",
      "aliases": [
        "cascading style sheets",
        "css3"
      ]
    },
    {
      "name": "javascript",
      "aliases": [
        "js",
        "ecmascript"
      ]
    },
    {
      "name": "bootstrap",
      "aliases": [
        "twitter bootstrap",
        "bootstrap framework"
      ]
    },
    {
      "name": "core java",
      "aliases": [
        "java",
        "java se",
        "standard java"
      ]
    },
    {
      "name": "mysql server",
      "aliases": [
        "mysql",
        "mysql database"
      ]
    },
    {
      "name": "notepad++",
      "aliases": [
        "notepad plus plus",
        "notepadpp"
      ]
    },
    {
      "name": "sql plus",
      "aliases": [
        "sqlplus",
        "oracle sql plus"
      ]
    },
    {
      "name": "spring tool suite",
      "aliases": [
        "sts",
        "spring sts"
      ]
    },
    {
      "name": "mysql workbench",
      "aliases": [
        "mysql work-bench",
        "mysql gui tool"
      ]
    },
    {
      "name": "windows",
      "aliases": [
        "microsoft windows",
        "windows os"
      ]
    },
    {
      "name": "angular",
      "aliases": [
        "angular framework",
        "angularjs"
      ]
    },
    {
      "name": "hibernate",
      "aliases": [
        "hibernate orm",
        "java hibernate"
      ]
    },
    {
      "name": "mvc",
      "aliases": [
        "model view controller",
        "mvc pattern"
      ]
    },
    {
      "name": "dao",
      "aliases": [
        "data access object",
        "dao pattern"
      ]
    },
    {
      "name": "dto",
      "aliases": [
        "data transfer object",
        "dto pattern"
      ]
    },
    {
      "name": "factory pattern",
      "aliases": [
        "factory design pattern",
        "factory method pattern"
      ]
    },
    {
      "name": "oracle",
      "aliases": [
        "oracle database",
        "oracle rdbms"
      ]
    },
    {
      "name": "eclipse",
      "aliases": [
        "eclipse ide",
        "eclipse java ide"
      ]
    },
    {
      "name": "visual studio code",
      "aliases": [
        "vs code",
        "vscode"
      ]
    },
    {
      "name": "tomcat",
      "aliases": [
        "apache tomcat",
        "tomcat 8.5"
      ]
    },
    {
      "name": "spring framework",
      "aliases": [
        "spring",
        "java spring"
      ]
    }
  ],
  "education": [
    {
      "degree": "Bachelor of Technology",
      "degree_aliases": [
        "B.Tech",
        "BTech",
        "Bachelor of Engineering"
      ],
      "institution": "Madanapalle Institute of Technology & Science",
      "field_of_study": "Electronic and Communication Engineering",
      "grade": "7.07 CGPA",
      "start_date": "",
      "end_date": "",
      "location": ""
    }
  ],
  "certifications": [],
  "languages": [],
  "links": [],
  "additional_information": {
    "tools": [
      "notepad++",
      "sql plus",
      "spring tool suite",
      "mysql workbench",
      "eclipse",
      "visual studio code"
    ],
    "databases": [
      "mysql server",
      "oracle"
    ],
    "operating_systems": [
      "windows"
    ]
  }
}

---

INTERVIEW TRANSCRIPTS: 

Candidate 3: Abhishek Kumar Singh — Site Engineer (Oil & Gas / Plant Operations)

Interview Type: Technical & Behavioral | Interviewer: Hiring Manager, Operations Role applied for: Site Engineer / Shutdown Maintenance Lead

Interviewer: Thanks for joining, Abhishek. Walk me through your current role at Tritorc in Qatar.

Abhishek: Sure. I've been with Tritorc since September 2023, based out of Ras Laffan Industrial City. I work as a Site Engineer handling pipeline essential services — bolt torquing, flange tensioning, flange facing, hot tapping, and cold cutting. Most of my work is tied to periodical shutdown maintenance for oil and gas plants. I manage the torquing crews on site, coordinate shutdown planning with the client, and make sure everything stays within safety and quality compliance.

Interviewer: That's a fairly specialized skill set. How does hot tapping differ from a standard tie-in, and when would you choose it?

Abhishek: Hot tapping is used when you need to make a connection or branch into a live pipeline without shutting down the process — so there's no production loss. We use it typically for tie-ins on pressurized lines where a shutdown isn't feasible or is too costly. The key is controlling the cutting speed and pressure throughout so you don't get a blowout, and making sure the isolation valve and fitting are pressure-tested before cutting through. Cold cutting comes in when there's a hydrocarbon risk and we can't use anything that generates sparks or heat.

Interviewer: Before Tritorc, you were Plant Operation Head at Blue Peter Engineers in Kalinganagar. That's a big jump in scope — you went from supervising a site to leading 150+ people. How did you handle that transition?

Abhishek: It was a steep learning curve initially, mostly because the role blended two things I hadn't combined before — production accountability and vendor-facing responsibilities like sales and partnership negotiation. What helped was leaning on the supervisors and maintenance technicians who already knew the RMHS equipment — stacker cum reclaimers, blender reclaimers, wagon and truck tipplers — inside out. I ran weekly review meetings with site engineers, HR, and safety teams so nothing fell through the cracks. We got the operational expenses down 10-15% through some straightforward changes — better spares planning, reducing unplanned downtime — and we ran two consecutive years without a recordable accident, which I'm probably most proud of from that role.

Interviewer: Zero accidents for two years in a heavy industrial plant is notable. What specifically changed?

Abhishek: Mainly discipline around permit-to-work and toolbox talks before every shift, plus making near-miss reporting genuinely blame-free so people actually reported things instead of hiding them. We also did equipment-specific safety protocols for each major piece — the twin boom stacker and RMHS yard equipment had their own lockout-tagout procedures that weren't standardized before.

Interviewer: You've moved around a fair amount — Jamshedpur, Meramandali, Kalinganagar, now Qatar. What's driving that mobility?

Abhishek: Mostly opportunity and scope. Each move gave me a bigger piece of ownership — from supervising 10 people in general construction, to a 50-person site, to running an entire plant floor, and now doing higher-value technical work internationally. I do want more stability going forward, but I've been deliberate about each step building on the last rather than lateral moves.

Interviewer: Understood. Last one — you're a certified Rigger and High Risk Supervisor through JNTVTI. Where do you see that certification mattering most in this role?

Abhishek: Anytime we're lifting equipment during a shutdown — replacing a slew bearing on a stacker reclaimer, for example, which I've done — rigging competency is what keeps that safe. It also means I can sign off on lift plans myself rather than waiting on a separate certified person, which speeds up the shutdown schedule.

Interviewer: Great, thanks Abhishek. We'll follow up on next steps within the week.

Candidate 4: M.R. Hariharan — Executive, SCM/Stores

Interview Type: Technical & Experience Review | Interviewer: SCM Manager Role applied for: Senior Stores / Procurement Executive

Interviewer: Good morning, Hariharan. You've been at Adwaith Lakshmi Industries since 2020 as Executive - Stores. Give me a sense of your day-to-day.

Hariharan: Good morning. My role covers incoming raw materials, child parts, and general items. When a vehicle arrives, I supervise unloading and check quantities against the supplier invoice. If everything checks out, I prepare the Goods Receipt Note in the system and route materials to quality for inspection before they go to the correct store location. If something's damaged or short, I prepare a debit note or rejection document and get it back to the supplier. On the outbound side, I issue materials to production against production orders and coordinate with logistics for dispatch after invoicing.

Interviewer: You spent seven years before that at Lakshmi Electrical Control Systems, in a purchase and stores role. That included import procurement. Can you walk me through how you'd handle an import purchase order end-to-end?

Hariharan: Yes — it starts with the purchase requisition, then I'd prepare the RFQ and send it to the relevant overseas suppliers, negotiate pricing and lead time, and raise the PO once approved. For payment, depending on the arrangement, it's either advance TT against the proforma invoice, or LC. I'd track ETD and ETA against the invoice and packing list, and coordinate with the freight forwarder on air or sea mode depending on urgency and cost — get the AWB or BOL, arrange insurance, and prepare the import consignment clearance documents. Then it's coordinating the bill of entry checklist and customs duty payment, and once the material lands, following up with stores for the GRN in SAP so the bill can close with accounts.

Interviewer: That's a good end-to-end answer. You mention introducing barcoding and FIFO in stores at LECS — what problem was that solving, and what was the actual impact?

Hariharan: Before that, stock rotation was manual and people would sometimes pick newer stock first just because it was easier to reach, which meant older batches sat longer than they should have. I introduced color-coded barcode stickers tied to receipt date, so FIFO picking became visual and easy to enforce without extra checking. It also sped up stock audits since we could scan rather than manually verify against paper records.

Interviewer: You also mention identifying non-moving inventory and selling it off to other suppliers. How did you identify what qualified as non-moving, and was there any pushback internally?

Hariharan: We ran periodic stock ageing reports and flagged anything with no movement over a defined period — I don't recall the exact threshold now, but it was a standard ageing bucket. For pushback, yes — some teams were hesitant to release stock they'd earmarked for future use "just in case." I addressed that by cross-checking actual consumption patterns with planning before disposing of anything, so it wasn't a unilateral call.

Interviewer: Before LECS, you spent nearly eight years at Bharti Airtel in network planning and GIS — quite different from SCM. What made you move into supply chain?

Hariharan: Honestly, it was about long-term stability and a role closer to home in Coimbatore at the time. The Airtel work was route surveys, GIS updates, fiber feasibility checks — a lot of fieldwork and travel. SCM gave me steadier hours and let me build a specialization I could grow in, which is what happened over the next several years.

Interviewer: Fair enough. Notice period says two months from offer — is there flexibility there if we needed a faster start?

Hariharan: I'd need to check with my current employer, but I can try to negotiate a shorter handover if the offer and role are the right fit.

Interviewer: Understood, thanks Hariharan. We'll be in touch.

Candidate 5: Chennuri Reddy Supraja — Associate Software Engineer (Java)

Interview Type: Technical Screening | Interviewer: Engineering Lead Role applied for: Junior/Associate Java Developer

Interviewer: Hi Supraja, thanks for joining. Tell me about the Standard Chartered Bank project you worked on at HCL.

Supraja: Hi, thanks for having me. I was part of a 12-member team building an application for managing staff and customer data for the bank, with a data-mining angle for customer care management. I worked on the backend using Core Java and the Spring framework, and I also built out some of the database layer using Oracle — creating the tables the application relied on.

Interviewer: Can you describe the layered architecture you used — I see MVC, DAO, DTO, and Factory pattern listed. Why those specifically?

Supraja: We followed MVC to separate the presentation layer from business logic and data access. DAO was used so the database access logic — the Oracle queries — was isolated from the service layer, which made it easier to swap or modify data access without touching business logic. DTOs were used to pass data between layers without exposing the actual entity objects directly, especially in the API-facing parts. The Factory pattern came in for object creation where we had multiple implementations depending on a condition — I didn't design that part myself, but I worked within that structure that seniors had set up.

Interviewer: That's a fair answer for someone early in their career. Let's go a level deeper — what's the actual difference between DAO and DTO, in your own words?

Supraja: DAO is about how you get data — it wraps the actual database operations, like the SQL queries or Hibernate calls, so the rest of the app doesn't need to know how the data is fetched. DTO is about what data you're moving — it's a plain object with just the fields you need to transfer, without the extra baggage or behavior an entity class might have, like relationships or validation logic.

Interviewer: Good. You've listed Angular alongside Core Java — was that your responsibility, or someone else's on the team?

Supraja: Mostly backend was my focus. I had some exposure to the Angular frontend since it was a small team and I helped wire up a couple of forms to the backend APIs, but I wouldn't call myself strong on the frontend — Core Java, Spring, and the database side is where I spent most of my time.

Interviewer: That's honest, I appreciate that. Your experience is around ten months total. What have you been doing since June 2021?

Supraja: I've been focusing on strengthening my core Java fundamentals and exploring a bit more around Spring Boot and REST APIs on my own, since my project experience was more Spring MVC-based. I've also been applying to roles that would let me build on the backend experience I already have.

Interviewer: Understood. Last question — if you were asked to fetch a list of customers filtered by a status field, but the existing DAO method only supports fetching by ID, how would you approach adding that?

Supraja: I'd add a new method in the DAO interface and its implementation — something like findByStatus — that takes the status as a parameter and builds the appropriate query, either as a named query in Hibernate or a JPQL/SQL query depending on what the project uses. Then I'd expose it through the service layer so the controller can call it, and map the results to DTOs before sending them out, keeping the same pattern the rest of the codebase already follows.

Interviewer: That's a solid answer. Thanks Supraja, we'll follow up soon on next steps.


import { createRegisterUser } from "@repo/database";
import { logger } from "@repo/logs";

const seedUsers = [
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
];

async function main() {
	logger.info(
		"Let's create a new registered users and appointments for your application!",
	);
	seedUsers.forEach(async (element) => {
		await createRegisterUser(element);
	});
}

main();

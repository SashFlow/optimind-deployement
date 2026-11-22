import { subscribeToNewsletter } from "./procedures/subscribe-to-newsletter";
import { unsubscribeFromNewsletter } from "./procedures/unsubscribe-from-newsletter";

export const newsletterRouter = {
	subscribe: subscribeToNewsletter,
	unsubscribe: unsubscribeFromNewsletter,
};

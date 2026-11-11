import { sendToWank } from "main/lib/wank";
import { z } from "zod";
import { publicProcedure, router } from "../..";

const organization = z.object({ organizationId: z.string() });

export const createWankRouter = () =>
	router({
		record: publicProcedure.input(organization).mutation(({ input }) => {
			sendToWank({ type: "organization", id: input.organizationId });
			return { started: sendToWank({ type: "record" }) };
		}),
		setOrganization: publicProcedure
			.input(organization)
			.mutation(({ input }) => {
				sendToWank({ type: "organization", id: input.organizationId });
			}),
	});

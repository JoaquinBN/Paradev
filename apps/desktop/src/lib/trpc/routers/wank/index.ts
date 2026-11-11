import { shell } from "electron";
import { publicProcedure, router } from "../..";

/** Wank is the native helper that records a screen and voice demo; it registers `wank://`. */
const WANK_RECORD_URL = "wank://record";

export const createWankRouter = () =>
	router({
		record: publicProcedure.mutation(async () => {
			try {
				await shell.openExternal(WANK_RECORD_URL);
				return { started: true };
			} catch (error) {
				console.warn("[wank/record] Could not open Wank:", error);
				return { started: false };
			}
		}),
	});

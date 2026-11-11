import { useLingui } from "@lingui/react/macro";
import { toast } from "@superset/ui/sonner";
import { electronTrpc } from "renderer/lib/electron-trpc";

/** Starts a Wank recording: screen and voice, which Wank turns into an automation. */
export function useStartWank() {
	const { t } = useLingui();
	const record = electronTrpc.wank.record.useMutation();
	const startWank = async () => {
		const { started } = await record.mutateAsync();
		if (!started) {
			toast.error(
				t({ message: "Couldn't start Wank. Open the Wank app and try again." }),
			);
		}
	};
	return { startWank, isStarting: record.isPending };
}

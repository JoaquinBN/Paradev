import { useLingui } from "@lingui/react/macro";
import { toast } from "@superset/ui/sonner";
import { useActiveOrganizationId } from "renderer/hooks/useActiveOrganizationId";
import { electronTrpc } from "renderer/lib/electron-trpc";

/** Starts a Wank recording of voice and screen, which Wank turns into an automation in this organization. */
export function useStartWank() {
	const { t } = useLingui();
	const organizationId = useActiveOrganizationId();
	const record = electronTrpc.wank.record.useMutation();
	const startWank = async () => {
		if (!organizationId) return;
		const { started } = await record.mutateAsync({ organizationId });
		if (!started) toast.error(t({ message: "Wank needs macOS 26 or later." }));
	};
	return { startWank, isStarting: record.isPending };
}

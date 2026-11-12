import { useEffect } from "react";
import { useActiveOrganizationId } from "renderer/hooks/useActiveOrganizationId";
import { electronTrpc } from "renderer/lib/electron-trpc";

/** Keeps Wank's automations in the organization you're looking at, including recordings started from the hotkey. */
export function useSyncWankOrganization() {
	const organizationId = useActiveOrganizationId();
	const { mutate } = electronTrpc.wank.setOrganization.useMutation();
	useEffect(() => {
		if (organizationId) mutate({ organizationId });
	}, [organizationId, mutate]);
}

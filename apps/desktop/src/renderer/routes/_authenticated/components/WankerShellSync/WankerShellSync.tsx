import { useLayoutEffect } from "react";
import { useIsV2CloudEnabled } from "renderer/hooks/useIsV2CloudEnabled";
import { useWankerShell } from "renderer/hooks/useWankerShell";

/** Puts `data-shell="next"` on <html>, which the `shell-next:` Tailwind variant keys on. */
export function WankerShellSync() {
	const isV2CloudEnabled = useIsV2CloudEnabled();
	const isWankerShell = useWankerShell() && isV2CloudEnabled;

	useLayoutEffect(() => {
		const root = document.documentElement;
		if (isWankerShell) root.dataset.shell = "next";
		else delete root.dataset.shell;
	}, [isWankerShell]);

	return null;
}

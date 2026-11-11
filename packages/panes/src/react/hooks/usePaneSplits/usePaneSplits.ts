import { createContext, useContext } from "react";

export const PaneSplitsContext = createContext(true);

export function usePaneSplits(): boolean {
	return useContext(PaneSplitsContext);
}

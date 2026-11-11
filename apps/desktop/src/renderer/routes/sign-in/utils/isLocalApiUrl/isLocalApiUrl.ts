const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** True when the API runs on this machine, where GitHub and Google sign-in have no real OAuth app. */
export function isLocalApiUrl(apiUrl: string): boolean {
	try {
		return LOCAL_HOSTS.has(new URL(apiUrl).hostname);
	} catch {
		return false;
	}
}

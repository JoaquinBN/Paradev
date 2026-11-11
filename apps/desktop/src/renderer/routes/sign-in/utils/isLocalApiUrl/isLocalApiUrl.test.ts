import { describe, expect, test } from "bun:test";
import { isLocalApiUrl } from "./isLocalApiUrl";

describe("isLocalApiUrl", () => {
	test("is true for an API on this machine", () => {
		expect(isLocalApiUrl("http://localhost:3001")).toBe(true);
		expect(isLocalApiUrl("http://127.0.0.1:3001/")).toBe(true);
		expect(isLocalApiUrl("http://[::1]:3001")).toBe(true);
	});

	test("is false for a hosted API or a malformed URL", () => {
		expect(isLocalApiUrl("https://api.paradev.com")).toBe(false);
		expect(isLocalApiUrl("https://localhost.example.com")).toBe(false);
		expect(isLocalApiUrl("not a url")).toBe(false);
	});
});

const KEY = "mpplaygo_mock_state_v1";

export function loadMockState(createSeedState) {
	if (typeof window === "undefined") return createSeedState();
	try {
		const raw = window.localStorage.getItem(KEY);
		if (!raw) return createSeedState();
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object") return createSeedState();
		return parsed;
	} catch {
		return createSeedState();
	}
}

export function saveMockState(state) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(KEY, JSON.stringify(state));
	} catch {
		// ignore
	}
}

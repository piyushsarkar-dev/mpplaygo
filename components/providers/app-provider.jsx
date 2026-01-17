"use client";

import { createSeedState } from "@/lib/mock/seed";
import { loadMockState, saveMockState } from "@/lib/mock/storage";
import { MOCK_SONGS } from "@/lib/mock/songs";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AppContext = createContext(undefined);

function uniqueId(prefix = "id") {
	return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
}

function normalizeUsername(value) {
	return String(value || "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-_]/g, "");
}

export default function AppProvider({ children }) {
	const [state, setState] = useState(() => createSeedState());
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		setState(loadMockState(createSeedState));
		setHydrated(true);
	}, []);

	useEffect(() => {
		if (!hydrated) return;
		saveMockState(state);
	}, [hydrated, state]);

	const currentUser = useMemo(() => {
		return state.users.find((u) => u.id === state.currentUserId) || null;
	}, [state.currentUserId, state.users]);

	const currentUserPlaylists = useMemo(() => {
		if (!currentUser) return [];
		return state.playlists
			.filter((p) => p.userId === currentUser.id)
			.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
	}, [currentUser, state.playlists]);

	const actions = useMemo(() => {
		const setCurrentUserId = (id) =>
			setState((prev) => ({ ...prev, currentUserId: id }));

		const login = async ({ email }) => {
			const user = state.users.find(
				(u) => u.email.toLowerCase() === String(email).toLowerCase()
			);
			if (!user) {
				return { ok: false, message: "No account found for this email." };
			}
			setCurrentUserId(user.id);
			return { ok: true };
		};

		const signup = async ({ email }) => {
			const exists = state.users.some(
				(u) => u.email.toLowerCase() === String(email).toLowerCase()
			);
			if (exists) {
				return { ok: false, message: "Email already exists." };
			}

			const base = normalizeUsername(String(email).split("@")[0]);
			let username = base || "user";
			let i = 1;
			while (state.users.some((u) => u.username === username)) {
				i += 1;
				username = `${base || "user"}${i}`;
			}

			const user = {
				id: uniqueId("u"),
				email,
				username,
				avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
					username
				)}`,
				createdAt: new Date().toISOString(),
			};
			setState((prev) => ({ ...prev, users: [user, ...prev.users] }));
			setCurrentUserId(user.id);
			return { ok: true, user };
		};

		const loginWithGoogle = async () => {
			// UI-only mock
			setCurrentUserId("u1");
			return { ok: true };
		};

		const logout = async () => {
			setCurrentUserId(null);
			return { ok: true };
		};

		const updateUsername = async (newUsername) => {
			if (!state.currentUserId) {
				return { ok: false, message: "Not logged in." };
			}
			const normalized = normalizeUsername(newUsername);
			if (!normalized) {
				return { ok: false, message: "Username is required." };
			}
			const taken = state.users.some(
				(u) => u.username === normalized && u.id !== state.currentUserId
			);
			if (taken) {
				return { ok: false, message: "Username already taken." };
			}

			setState((prev) => ({
				...prev,
				users: prev.users.map((u) =>
					u.id === prev.currentUserId ? { ...u, username: normalized } : u
				),
			}));
			return { ok: true };
		};

		const createPlaylist = async ({ name, isPublic }) => {
			if (!state.currentUserId) {
				return { ok: false, message: "Login required." };
			}
			const playlist = {
				id: uniqueId("p"),
				userId: state.currentUserId,
				name: String(name || "").trim() || "New Playlist",
				isPublic: Boolean(isPublic),
				createdAt: new Date().toISOString(),
				songs: [],
			};
			setState((prev) => ({ ...prev, playlists: [playlist, ...prev.playlists] }));
			return { ok: true, playlist };
		};

		const updatePlaylist = async (playlistId, patch) => {
			setState((prev) => ({
				...prev,
				playlists: prev.playlists.map((p) =>
					p.id === playlistId ? { ...p, ...patch } : p
				),
			}));
			return { ok: true };
		};

		const deletePlaylist = async (playlistId) => {
			setState((prev) => ({
				...prev,
				playlists: prev.playlists.filter((p) => p.id !== playlistId),
			}));
			return { ok: true };
		};

		const addSongToPlaylist = async (playlistId, song) => {
			setState((prev) => ({
				...prev,
				playlists: prev.playlists.map((p) => {
					if (p.id !== playlistId) return p;
					const exists = p.songs?.some((s) => s.id === song.id);
					if (exists) return p;
					return { ...p, songs: [...(p.songs || []), song] };
				}),
			}));
			return { ok: true };
		};

		const removeSongFromPlaylist = async (playlistId, songId) => {
			setState((prev) => ({
				...prev,
				playlists: prev.playlists.map((p) => {
					if (p.id !== playlistId) return p;
					return {
						...p,
						songs: (p.songs || []).filter((s) => s.id !== songId),
					};
				}),
			}));
			return { ok: true };
		};

		const addHistory = async (song) => {
			if (!state.currentUserId) return { ok: true };
			const entry = {
				id: uniqueId("h"),
				userId: state.currentUserId,
				songId: song.id,
				title: song.title,
				artist: song.artist,
				thumbnail: song.thumbnail,
				language: song.language,
				listenedAt: new Date().toISOString(),
			};

			setState((prev) => ({
				...prev,
				history: [entry, ...(prev.history || [])].slice(0, 50),
			}));
			return { ok: true };
		};

		const getRecommendations = () => {
			if (!state.currentUserId) {
				return { label: null, songs: [] };
			}
			const recent = (state.history || []).filter(
				(h) => h.userId === state.currentUserId
			);
			const counts = {};
			for (const h of recent.slice(0, 20)) {
				if (!h.language) continue;
				counts[h.language] = (counts[h.language] || 0) + 1;
			}
			const topLang = Object.keys(counts).sort(
				(a, b) => counts[b] - counts[a]
			)[0];
			if (!topLang) return { label: null, songs: [] };

			return {
				label: `Because you listen to ${topLang}`,
				songs: MOCK_SONGS.filter((s) => s.language === topLang).slice(0, 8),
			};
		};

		return {
			login,
			signup,
			loginWithGoogle,
			logout,
			updateUsername,
			createPlaylist,
			updatePlaylist,
			deletePlaylist,
			addSongToPlaylist,
			removeSongFromPlaylist,
			addHistory,
			getRecommendations,
		};
	}, [state]);

	const value = useMemo(() => {
		return {
			state,
			currentUser,
			currentUserPlaylists,
			users: state.users,
			playlists: state.playlists,
			history: state.history,
			...actions,
		};
	}, [actions, currentUser, currentUserPlaylists, state]);

	return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
	const ctx = useContext(AppContext);
	if (!ctx) throw new Error("useApp must be used inside AppProvider");
	return ctx;
};

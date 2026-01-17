import { MOCK_SONGS } from "./songs";

export const createSeedState = () => {
	const users = [
		{
			id: "u1",
			email: "demo@mpplaygo.dev",
			username: "demo",
			avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=demo",
			createdAt: new Date().toISOString(),
		},
		{
			id: "u2",
			email: "rahat@mpplaygo.dev",
			username: "rahat",
			avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=rahat",
			createdAt: new Date().toISOString(),
		},
	];

	const playlists = [
		{
			id: "p1",
			userId: "u1",
			name: "Liked Songs",
			isPublic: false,
			createdAt: new Date().toISOString(),
			songs: [MOCK_SONGS[0], MOCK_SONGS[3], MOCK_SONGS[1]],
		},
		{
			id: "p2",
			userId: "u2",
			name: "Public Mix",
			isPublic: true,
			createdAt: new Date().toISOString(),
			songs: [MOCK_SONGS[4], MOCK_SONGS[2], MOCK_SONGS[7]],
		},
	];

	return {
		currentUserId: null,
		users,
		playlists,
		history: [],
	};
};

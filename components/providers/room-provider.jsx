"use client";

import { useSupabase } from "@/components/providers/supabase-provider";
import { ROOM_EVENTS } from "@/lib/room/utils";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";

const RoomContext = createContext(null);

export default function RoomProvider({ children }) {
	const { supabase, user } = useSupabase();

	// Room state
	const [room, setRoom] = useState(null);
	const [members, setMembers] = useState([]);
	const [isInRoom, setIsInRoom] = useState(false);
	const [isAdmin, setIsAdmin] = useState(false);
	const [hasControl, setHasControl] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	// Playback state synced across all users
	const [roomSongId, setRoomSongId] = useState(null);
	const [roomSongData, setRoomSongData] = useState(null);
	const [roomIsPlaying, setRoomIsPlaying] = useState(false);
	const [roomCurrentTime, setRoomCurrentTime] = useState(0);

	// Online presence
	const [onlineUsers, setOnlineUsers] = useState([]);

	// Refs for channel management
	const channelRef = useRef(null);
	const presenceChannelRef = useRef(null);
	const syncIntervalRef = useRef(null);

	// ---------- API helpers ----------

	const createRoom = useCallback(
		async ({ name, isPrivate, password }) => {
			setLoading(true);
			setError(null);
			try {
				const res = await fetch("/api/rooms", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ name, isPrivate, password }),
				});
				const data = await res.json();
				if (!res.ok) throw new Error(data.error);
				return data.room;
			} catch (err) {
				setError(err.message);
				return null;
			} finally {
				setLoading(false);
			}
		},
		[],
	);

	const fetchRoom = useCallback(
		async (roomId) => {
			setLoading(true);
			setError(null);
			try {
				const res = await fetch(`/api/rooms/${roomId}`);
				const data = await res.json();
				if (!res.ok) throw new Error(data.error);
				return data.room;
			} catch (err) {
				setError(err.message);
				return null;
			} finally {
				setLoading(false);
			}
		},
		[],
	);

	const joinRoom = useCallback(
		async (roomId, password) => {
			setError(null);
			try {
				const res = await fetch(`/api/rooms/${roomId}/join`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ password }),
				});
				const data = await res.json();
				if (!res.ok) throw new Error(data.error);
				return true;
			} catch (err) {
				setError(err.message);
				return false;
			}
		},
		[],
	);

	const leaveRoom = useCallback(
		async (roomId) => {
			try {
				const res = await fetch(`/api/rooms/${roomId}/leave`, {
					method: "POST",
				});
				const data = await res.json();
				if (!res.ok) throw new Error(data.error);

				// Cleanup
				cleanup();
				return data;
			} catch (err) {
				setError(err.message);
				return null;
			}
		},
		[],
	);

	const destroyRoom = useCallback(
		async (roomId) => {
			try {
				// Broadcast destruction before deleting
				if (channelRef.current) {
					channelRef.current.send({
						type: "broadcast",
						event: ROOM_EVENTS.ROOM_DESTROYED,
						payload: {},
					});
				}

				const res = await fetch(`/api/rooms/${roomId}`, {
					method: "DELETE",
				});
				const data = await res.json();
				if (!res.ok) throw new Error(data.error);

				cleanup();
				return true;
			} catch (err) {
				setError(err.message);
				return false;
			}
		},
		[],
	);

	const updatePermission = useCallback(
		async (roomId, userId, hasControl) => {
			try {
				const res = await fetch(`/api/rooms/${roomId}/permissions`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ userId, hasControl }),
				});
				const data = await res.json();
				if (!res.ok) throw new Error(data.error);

				// Broadcast permission change
				if (channelRef.current) {
					channelRef.current.send({
						type: "broadcast",
						event: ROOM_EVENTS.PERMISSION_UPDATE,
						payload: { userId, hasControl },
					});
				}

				// Update local members
				setMembers((prev) =>
					prev.map((m) =>
						m.user_id === userId ? { ...m, has_control: hasControl } : m,
					),
				);
				return true;
			} catch (err) {
				setError(err.message);
				return false;
			}
		},
		[],
	);

	// ---------- Realtime sync ----------

	const broadcastPlay = useCallback(
		(currentTime) => {
			if (channelRef.current && (isAdmin || hasControl)) {
				channelRef.current.send({
					type: "broadcast",
					event: ROOM_EVENTS.PLAY,
					payload: { currentTime, timestamp: Date.now() },
				});
				// Also update server
				if (room?.id) {
					fetch(`/api/rooms/${room.id}`, {
						method: "PATCH",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ is_playing: true, current_time_sec: currentTime }),
					}).catch(() => {});
				}
			}
		},
		[isAdmin, hasControl, room],
	);

	const broadcastPause = useCallback(
		(currentTime) => {
			if (channelRef.current && (isAdmin || hasControl)) {
				channelRef.current.send({
					type: "broadcast",
					event: ROOM_EVENTS.PAUSE,
					payload: { currentTime, timestamp: Date.now() },
				});
				if (room?.id) {
					fetch(`/api/rooms/${room.id}`, {
						method: "PATCH",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ is_playing: false, current_time_sec: currentTime }),
					}).catch(() => {});
				}
			}
		},
		[isAdmin, hasControl, room],
	);

	const broadcastSeek = useCallback(
		(seekTime) => {
			if (channelRef.current && (isAdmin || hasControl)) {
				channelRef.current.send({
					type: "broadcast",
					event: ROOM_EVENTS.SEEK,
					payload: { seekTime, timestamp: Date.now() },
				});
				if (room?.id) {
					fetch(`/api/rooms/${room.id}`, {
						method: "PATCH",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ current_time_sec: seekTime }),
					}).catch(() => {});
				}
			}
		},
		[isAdmin, hasControl, room],
	);

	const broadcastChangeSong = useCallback(
		(songId, songData) => {
			if (channelRef.current && (isAdmin || hasControl)) {
				channelRef.current.send({
					type: "broadcast",
					event: ROOM_EVENTS.CHANGE_SONG,
					payload: { songId, songData, timestamp: Date.now() },
				});
				setRoomSongId(songId);
				setRoomSongData(songData);
				setRoomIsPlaying(true);
				setRoomCurrentTime(0);
				if (room?.id) {
					fetch(`/api/rooms/${room.id}`, {
						method: "PATCH",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							current_song_id: songId,
							current_song_data: songData,
							is_playing: true,
							current_time_sec: 0,
						}),
					}).catch(() => {});
				}
			}
		},
		[isAdmin, hasControl, room],
	);

	const broadcastSyncState = useCallback(() => {
		if (channelRef.current && isAdmin) {
			channelRef.current.send({
				type: "broadcast",
				event: ROOM_EVENTS.SYNC_STATE,
				payload: {
					songId: roomSongId,
					songData: roomSongData,
					isPlaying: roomIsPlaying,
					currentTime: roomCurrentTime,
					timestamp: Date.now(),
				},
			});
		}
	}, [isAdmin, roomSongId, roomSongData, roomIsPlaying, roomCurrentTime]);

	// ---------- Subscribe to room ----------

	const subscribeToRoom = useCallback(
		(roomId) => {
			if (!supabase || !user) return;

			// Broadcast channel for music sync
			const channel = supabase.channel(`room:${roomId}`, {
				config: { broadcast: { self: false } },
			});

			channel.on("broadcast", { event: ROOM_EVENTS.PLAY }, ({ payload }) => {
				setRoomIsPlaying(true);
				if (payload.currentTime !== undefined) {
					setRoomCurrentTime(payload.currentTime);
				}
			});

			channel.on("broadcast", { event: ROOM_EVENTS.PAUSE }, ({ payload }) => {
				setRoomIsPlaying(false);
				if (payload.currentTime !== undefined) {
					setRoomCurrentTime(payload.currentTime);
				}
			});

			channel.on("broadcast", { event: ROOM_EVENTS.SEEK }, ({ payload }) => {
				if (payload.seekTime !== undefined) {
					setRoomCurrentTime(payload.seekTime);
				}
			});

			channel.on(
				"broadcast",
				{ event: ROOM_EVENTS.CHANGE_SONG },
				({ payload }) => {
					setRoomSongId(payload.songId);
					setRoomSongData(payload.songData);
					setRoomIsPlaying(true);
					setRoomCurrentTime(0);
				},
			);

			channel.on(
				"broadcast",
				{ event: ROOM_EVENTS.SYNC_STATE },
				({ payload }) => {
					if (payload.songId) setRoomSongId(payload.songId);
					if (payload.songData) setRoomSongData(payload.songData);
					if (payload.isPlaying !== undefined)
						setRoomIsPlaying(payload.isPlaying);
					if (payload.currentTime !== undefined)
						setRoomCurrentTime(payload.currentTime);
				},
			);

			channel.on(
				"broadcast",
				{ event: ROOM_EVENTS.PERMISSION_UPDATE },
				({ payload }) => {
					if (payload.userId === user.id) {
						setHasControl(payload.hasControl);
					}
					setMembers((prev) =>
						prev.map((m) =>
							m.user_id === payload.userId
								? { ...m, has_control: payload.hasControl }
								: m,
						),
					);
				},
			);

			channel.on(
				"broadcast",
				{ event: ROOM_EVENTS.ROOM_DESTROYED },
				() => {
					cleanup();
				},
			);

			channel.on(
				"broadcast",
				{ event: ROOM_EVENTS.USER_JOINED },
				({ payload }) => {
					setMembers((prev) => {
						if (prev.some((m) => m.user_id === payload.user_id)) return prev;
						return [...prev, payload];
					});
				},
			);

			channel.on(
				"broadcast",
				{ event: ROOM_EVENTS.USER_LEFT },
				({ payload }) => {
					setMembers((prev) =>
						prev.filter((m) => m.user_id !== payload.user_id),
					);
				},
			);

			// If a user requests sync state (new joiner), admin sends state
			channel.on(
				"broadcast",
				{ event: ROOM_EVENTS.REQUEST_SYNC },
				() => {
					// Only admin responds
					broadcastSyncState();
				},
			);

			channel.subscribe();
			channelRef.current = channel;

			// Presence channel for online status
			const presenceChannel = supabase.channel(`room-presence:${roomId}`);
			presenceChannel.on("presence", { event: "sync" }, () => {
				const state = presenceChannel.presenceState();
				const online = [];
				for (const key in state) {
					for (const presence of state[key]) {
						online.push(presence);
					}
				}
				setOnlineUsers(online);
			});

			presenceChannel.subscribe(async (status) => {
				if (status === "SUBSCRIBED") {
					await presenceChannel.track({
						user_id: user.id,
						username:
							user.user_metadata?.username ||
							user.user_metadata?.full_name ||
							user.email,
						avatar_url: user.user_metadata?.avatar_url,
						online_at: new Date().toISOString(),
					});
				}
			});

			presenceChannelRef.current = presenceChannel;
		},
		[supabase, user, broadcastSyncState],
	);

	// ---------- Enter/Exit room ----------

	const enterRoom = useCallback(
		async (roomId, password) => {
			if (!user) {
				setError("Please login to join a room");
				return false;
			}

			setLoading(true);
			setError(null);

			try {
				// Join via API
				const joined = await joinRoom(roomId, password);
				if (!joined) {
					setLoading(false);
					return false;
				}

				// Fetch full room data
				const roomData = await fetchRoom(roomId);
				if (!roomData) {
					setLoading(false);
					return false;
				}

				setRoom(roomData);
				setMembers(roomData.members || []);
				setIsInRoom(true);
				setIsAdmin(roomData.admin_id === user.id);

				// Check if this user has control
				const me = (roomData.members || []).find(
					(m) => m.user_id === user.id,
				);
				setHasControl(
					roomData.admin_id === user.id || me?.has_control || false,
				);

				// Set initial playback state from room
				if (roomData.current_song_id) {
					setRoomSongId(roomData.current_song_id);
					setRoomSongData(roomData.current_song_data);
					setRoomIsPlaying(roomData.is_playing || false);
					setRoomCurrentTime(roomData.current_time_sec || 0);
				}

				// Subscribe to realtime
				subscribeToRoom(roomId);

				// Broadcast that we joined
				setTimeout(() => {
					if (channelRef.current) {
						channelRef.current.send({
							type: "broadcast",
							event: ROOM_EVENTS.USER_JOINED,
							payload: {
								user_id: user.id,
								username:
									user.user_metadata?.username ||
									user.user_metadata?.full_name,
								avatar_url: user.user_metadata?.avatar_url,
								has_control: false,
							},
						});
						// Request sync from admin
						channelRef.current.send({
							type: "broadcast",
							event: ROOM_EVENTS.REQUEST_SYNC,
							payload: {},
						});
					}
				}, 500);

				setLoading(false);
				return true;
			} catch (err) {
				setError(err.message);
				setLoading(false);
				return false;
			}
		},
		[user, joinRoom, fetchRoom, subscribeToRoom],
	);

	const exitRoom = useCallback(async () => {
		if (!room) return;

		// Broadcast leave
		if (channelRef.current && user) {
			channelRef.current.send({
				type: "broadcast",
				event: ROOM_EVENTS.USER_LEFT,
				payload: { user_id: user.id },
			});
		}

		await leaveRoom(room.id);
	}, [room, user, leaveRoom]);

	const cleanup = useCallback(() => {
		if (channelRef.current) {
			supabase?.removeChannel(channelRef.current);
			channelRef.current = null;
		}
		if (presenceChannelRef.current) {
			supabase?.removeChannel(presenceChannelRef.current);
			presenceChannelRef.current = null;
		}
		if (syncIntervalRef.current) {
			clearInterval(syncIntervalRef.current);
			syncIntervalRef.current = null;
		}
		setRoom(null);
		setMembers([]);
		setIsInRoom(false);
		setIsAdmin(false);
		setHasControl(false);
		setRoomSongId(null);
		setRoomSongData(null);
		setRoomIsPlaying(false);
		setRoomCurrentTime(0);
		setOnlineUsers([]);
		setError(null);
	}, [supabase]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (channelRef.current) {
				supabase?.removeChannel(channelRef.current);
			}
			if (presenceChannelRef.current) {
				supabase?.removeChannel(presenceChannelRef.current);
			}
			if (syncIntervalRef.current) {
				clearInterval(syncIntervalRef.current);
			}
		};
	}, [supabase]);

	// Refresh members when room changes
	const refreshMembers = useCallback(async () => {
		if (!room?.id) return;
		const roomData = await fetchRoom(room.id);
		if (roomData) {
			setMembers(roomData.members || []);
		}
	}, [room, fetchRoom]);

	const value = {
		// State
		room,
		members,
		isInRoom,
		isAdmin,
		hasControl,
		loading,
		error,
		onlineUsers,

		// Playback state
		roomSongId,
		roomSongData,
		roomIsPlaying,
		roomCurrentTime,
		setRoomCurrentTime,

		// Actions
		createRoom,
		fetchRoom,
		enterRoom,
		exitRoom,
		destroyRoom,
		updatePermission,
		refreshMembers,

		// Broadcast
		broadcastPlay,
		broadcastPause,
		broadcastSeek,
		broadcastChangeSong,
		broadcastSyncState,
	};

	return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export const useRoom = () => {
	const ctx = useContext(RoomContext);
	if (!ctx) throw new Error("useRoom must be used inside RoomProvider");
	return ctx;
};

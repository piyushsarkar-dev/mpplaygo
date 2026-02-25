import { generateRoomId } from "@/lib/room/utils";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function getSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_TOKEN ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
}

/** GET /api/rooms — list rooms with optional search & filters */
export async function GET(request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const filter = searchParams.get("filter") || "all"; // all | joined | public | private

    // Get current user (optional — not all filters need it)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let query = supabase
      .from("rooms")
      .select(
        "id, name, admin_id, is_private, current_song_id, current_song_data, is_playing, created_at, last_sync_at, profiles!rooms_admin_id_fkey(username, avatar_url)",
      )
      .order("created_at", { ascending: false })
      .limit(50);

    // Search by name
    if (search.trim()) {
      query = query.ilike("name", `%${search.trim()}%`);
    }

    // Filter by type
    if (filter === "public") {
      query = query.eq("is_private", false);
    } else if (filter === "private") {
      query = query.eq("is_private", true);
    }

    // Hide rooms inactive for 36+ hours
    const cutoff = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
    query = query.gte("last_sync_at", cutoff);

    const { data: rooms, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get member counts
    const roomIds = (rooms || []).map((r) => r.id);
    let memberCounts = {};
    let joinedRoomIds = new Set();

    if (roomIds.length > 0) {
      const { data: members } = await supabase
        .from("room_members")
        .select("room_id, user_id")
        .in("room_id", roomIds);

      if (members) {
        for (const m of members) {
          memberCounts[m.room_id] = (memberCounts[m.room_id] || 0) + 1;
          if (user && m.user_id === user.id) {
            joinedRoomIds.add(m.room_id);
          }
        }
      }
    }

    let enriched = (rooms || []).map((r) => ({
      ...r,
      member_count: memberCounts[r.id] || 0,
      admin: r.profiles,
      is_joined: joinedRoomIds.has(r.id),
    }));

    // Filter "joined" — only rooms the user has joined
    if (filter === "joined" && user) {
      enriched = enriched.filter((r) => joinedRoomIds.has(r.id));
    }

    return NextResponse.json({ rooms: enriched });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/** POST /api/rooms — create a new room */
export async function POST(request) {
  try {
    const supabase = getSupabase();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { name, isPrivate, password } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Room name is required" },
        { status: 400 },
      );
    }

    if (isPrivate && (!password || !password.trim())) {
      return NextResponse.json(
        { error: "Password is required for private rooms" },
        { status: 400 },
      );
    }

    const roomId = generateRoomId();

    const { data: room, error } = await supabase
      .from("rooms")
      .insert({
        id: roomId,
        name: name.trim(),
        admin_id: user.id,
        created_by: user.id, // Track original creator for admin reclaim
        is_private: Boolean(isPrivate),
        password: isPrivate ? password.trim() : null,
        is_playing: false,
        current_time_sec: 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Auto-join the admin as a member with control
    await supabase.from("room_members").insert({
      room_id: roomId,
      user_id: user.id,
      has_control: true,
    });

    return NextResponse.json({ room }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

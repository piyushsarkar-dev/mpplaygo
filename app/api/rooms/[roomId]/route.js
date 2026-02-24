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

/** GET /api/rooms/[roomId] — get room details */
export async function GET(request, { params }) {
  try {
    const supabase = getSupabase();
    const { roomId } = params;

    const { data: room, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (error || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Get members with profiles
    const { data: members } = await supabase
      .from("room_members")
      .select(
        "user_id, has_control, joined_at, profiles(username, avatar_url, full_name)",
      )
      .eq("room_id", roomId);

    // Get admin profile
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("username, avatar_url, full_name")
      .eq("id", room.admin_id)
      .single();

    // Don't send password to client
    const { password: _, ...roomData } = room;

    return NextResponse.json({
      room: {
        ...roomData,
        admin: adminProfile,
        members: (members || []).map((m) => ({
          user_id: m.user_id,
          has_control: m.has_control,
          joined_at: m.joined_at,
          ...m.profiles,
        })),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/** PATCH /api/rooms/[roomId] — update room state (admin only) */
export async function PATCH(request, { params }) {
  try {
    const supabase = getSupabase();
    const { roomId } = params;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Verify admin or has_control
    const { data: room } = await supabase
      .from("rooms")
      .select("admin_id")
      .eq("id", roomId)
      .single();

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    let isAuthorized = room.admin_id === user.id;
    if (!isAuthorized) {
      const { data: member } = await supabase
        .from("room_members")
        .select("has_control")
        .eq("room_id", roomId)
        .eq("user_id", user.id)
        .single();
      isAuthorized = member?.has_control;
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Not authorized to control this room" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const allowedFields = [
      "current_song_id",
      "current_song_data",
      "is_playing",
      "current_time_sec",
      "last_sync_at",
    ];

    const update = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        update[field] = body[field];
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    update.last_sync_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from("rooms")
      .update(update)
      .eq("id", roomId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ room: updated });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/** DELETE /api/rooms/[roomId] — destroy room (admin only) */
export async function DELETE(request, { params }) {
  try {
    const supabase = getSupabase();
    const { roomId } = params;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { data: room } = await supabase
      .from("rooms")
      .select("admin_id")
      .eq("id", roomId)
      .single();

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.admin_id !== user.id) {
      return NextResponse.json(
        { error: "Only room admin can destroy the room" },
        { status: 403 },
      );
    }

    // Delete members first (cascade should handle this, but be explicit)
    await supabase.from("room_members").delete().eq("room_id", roomId);
    const { error } = await supabase.from("rooms").delete().eq("id", roomId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

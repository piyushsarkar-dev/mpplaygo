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

/** POST /api/rooms/[roomId]/join — join a room */
export async function POST(request, { params }) {
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

    // Get room with created_by to check original creator
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*, created_by")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Check password for private rooms
    if (room.is_private) {
      const body = await request.json().catch(() => ({}));
      if (!body.password || body.password !== room.password) {
        return NextResponse.json(
          { error: "Invalid password" },
          { status: 403 },
        );
      }
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from("room_members")
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      // If original creator is rejoining and they're not admin, reclaim admin
      if (room.created_by === user.id && room.admin_id !== user.id) {
        await supabase
          .from("rooms")
          .update({ admin_id: user.id })
          .eq("id", roomId);
        await supabase
          .from("room_members")
          .update({ has_control: true })
          .eq("room_id", roomId)
          .eq("user_id", user.id);
        // Remove control from previous admin
        await supabase
          .from("room_members")
          .update({ has_control: false })
          .eq("room_id", roomId)
          .eq("user_id", room.admin_id);
        return NextResponse.json({ success: true, message: "Admin reclaimed" });
      }
      return NextResponse.json({ success: true, message: "Already a member" });
    }

    // Join room
    const isOriginalCreator = room.created_by === user.id;
    const { error: joinError } = await supabase.from("room_members").insert({
      room_id: roomId,
      user_id: user.id,
      has_control: isOriginalCreator, // Original creator gets control on rejoin
    });

    if (joinError) {
      return NextResponse.json({ error: joinError.message }, { status: 500 });
    }

    // If original creator is rejoining, transfer admin back to them
    if (isOriginalCreator && room.admin_id !== user.id) {
      await supabase
        .from("rooms")
        .update({ admin_id: user.id })
        .eq("id", roomId);
      // Remove control from previous admin
      await supabase
        .from("room_members")
        .update({ has_control: false })
        .eq("room_id", roomId)
        .eq("user_id", room.admin_id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

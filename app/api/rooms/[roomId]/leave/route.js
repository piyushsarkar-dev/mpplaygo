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

/** POST /api/rooms/[roomId]/leave — leave a room */
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

    // Check if user is admin
    const { data: room } = await supabase
      .from("rooms")
      .select("admin_id")
      .eq("id", roomId)
      .single();

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.admin_id === user.id) {
      // Admin is leaving — try to transfer ownership to next member
      const { data: members } = await supabase
        .from("room_members")
        .select("user_id, joined_at")
        .eq("room_id", roomId)
        .neq("user_id", user.id)
        .order("joined_at", { ascending: true })
        .limit(1);

      if (members && members.length > 0) {
        // Transfer admin to the earliest joined member
        const newAdmin = members[0];
        await supabase
          .from("rooms")
          .update({ admin_id: newAdmin.user_id })
          .eq("id", roomId);
        await supabase
          .from("room_members")
          .update({ has_control: true })
          .eq("room_id", roomId)
          .eq("user_id", newAdmin.user_id);
      } else {
        // No other members — destroy the room
        await supabase.from("room_members").delete().eq("room_id", roomId);
        await supabase.from("rooms").delete().eq("id", roomId);
        return NextResponse.json({
          success: true,
          destroyed: true,
        });
      }
    }

    // Remove user from members
    await supabase
      .from("room_members")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", user.id);

    return NextResponse.json({ success: true, destroyed: false });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

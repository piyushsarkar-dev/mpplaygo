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

/** PATCH /api/rooms/[roomId]/permissions — update member permissions */
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

    // Verify admin
    const { data: room } = await supabase
      .from("rooms")
      .select("admin_id")
      .eq("id", roomId)
      .single();

    if (!room || room.admin_id !== user.id) {
      return NextResponse.json(
        { error: "Only room admin can manage permissions" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { userId, hasControl } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("room_members")
      .update({ has_control: Boolean(hasControl) })
      .eq("room_id", roomId)
      .eq("user_id", userId);

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

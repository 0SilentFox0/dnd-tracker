import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authUser.id;
    const body = await request.json();
    const { socket_id, channel_name } = body;

    // Авторизуємо користувача для приватних каналів
    const authResponse = pusherServer.authorizeChannel(socket_id, channel_name, {
      user_id: userId,
      user_info: {
        name: userId,
      },
    });

    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("Error authenticating Pusher:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

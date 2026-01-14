import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { socket_id, channel_name } = body;

    // Авторизуємо користувача для приватних каналів
    const auth = pusherServer.authorizeChannel(socket_id, channel_name, {
      user_id: userId,
      user_info: {
        name: userId,
      },
    });

    return NextResponse.json(auth);
  } catch (error) {
    console.error("Error authenticating Pusher:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

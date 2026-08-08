import { createClient } from "@/lib/supabase/server";

interface BatchMessage {
  sender: "me" | "them";
  content: string;
  created_at: string;
}

export async function POST(request: Request) {
  try {
    const { conversationId, messages } = await request.json();

    if (!conversationId || !Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Verify conversation belongs to user
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!conversation) {
      return Response.json(
        { message: "Conversation not found" },
        { status: 404 }
      );
    }

    // Get current max sort_order to maintain order
    const { data: maxOrder } = await supabase
      .from("messages")
      .select("sort_order", { count: "exact" })
      .eq("conversation_id", conversationId)
      .order("sort_order", { ascending: false })
      .limit(1);

    let nextSortOrder = (maxOrder?.[0]?.sort_order ?? -1) + 1;

    // Prepare messages for insertion
    const messagesToInsert = messages.map((msg: BatchMessage) => ({
      conversation_id: conversationId,
      sender: msg.sender,
      content: msg.content,
      created_at: msg.created_at,
      sort_order: nextSortOrder++,
    }));

    const { error } = await supabase
      .from("messages")
      .insert(messagesToInsert);

    if (error) {
      throw error;
    }

    return Response.json(
      { message: "Messages created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Batch create messages error:", error);
    return Response.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to create messages",
      },
      { status: 500 }
    );
  }
}

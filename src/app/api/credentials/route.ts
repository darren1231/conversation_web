import { NextRequest, NextResponse } from "next/server";
import {
  createOrUpdateCredential,
  getCredentials,
  deleteCredential,
} from "@/lib/actions/api-credentials";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, model, apiKey } = body;

    if (!provider || !model || !apiKey) {
      return NextResponse.json(
        { error: "Missing required fields: provider, model, apiKey" },
        { status: 400 }
      );
    }

    const credential = await createOrUpdateCredential({
      provider,
      model,
      apiKey,
    });

    return NextResponse.json(credential);
  } catch (error) {
    console.error("Credential save error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save credential",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const credentials = await getCredentials();

    // 不返回加密后的 API Key（安全考虑）
    const safeCredentials = credentials.map((c) => ({
      id: c.id,
      provider: c.provider,
      model: c.model,
      is_active: c.is_active,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));

    return NextResponse.json(safeCredentials);
  } catch (error) {
    console.error("Fetch credentials error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch credentials",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const credentialId = url.searchParams.get("id");

    if (!credentialId) {
      return NextResponse.json(
        { error: "Missing credential id" },
        { status: 400 }
      );
    }

    await deleteCredential(credentialId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete credential error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete credential",
      },
      { status: 500 }
    );
  }
}

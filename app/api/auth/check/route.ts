import { StackServerApp } from "@stackframe/stack";
import { NextResponse } from "next/server";

const stackServerApp = new StackServerApp({
  projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
  secretServerKey: process.env.STACK_SECRET_SERVER_KEY!,
});

const ALLOWED_EMAIL = "joshi.rishikesh@gmail.com";

export async function GET(request: Request) {
  try {
    // Get the current user session
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Check if the user's email matches the allowed email
    if (user.email !== ALLOWED_EMAIL) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: `Access denied. Only ${ALLOWED_EMAIL} can access this application.`,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

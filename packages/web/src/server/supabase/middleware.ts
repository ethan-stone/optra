import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { Resource } from "sst";

export const updateSession = async (request: NextRequest) => {
  console.log("update session");
  // This `try/catch` block is only here for the interactive tutorial.
  // Feel free to remove once you have Supabase connected.
  try {
    // Create an unmodified response
    let response = NextResponse.next({
      request,
    });

    const supabase = createServerClient(
      Resource.SupabaseUrl.value,
      Resource.SupabaseAnonKey.value,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    // This will refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    const user = await supabase.auth.getUser();

    const publicRoutes = [
      "/",
      "/sign-in",
      "/sign-up",
      "/confirm-otp",
      "/auth/callback",
      "/api/trpc/auth.signIn",
      "/api/trpc/auth.confirmOtp",
    ];

    if (!publicRoutes.includes(request.nextUrl.pathname) && user.error) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    return response;
  } catch (e) {
    // If you are here, a Supabase client could not be created!
    // This is likely because you have not set up environment variables.
    // Check out http://localhost:3000 for Next Steps.
    return NextResponse.next({
      request,
    });
  }
};

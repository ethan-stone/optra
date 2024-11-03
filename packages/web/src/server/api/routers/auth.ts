import { createClient } from "@/server/supabase/server-client";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const authRouter = createTRPCRouter({
  signIn: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const supabase = await createClient();

      const { error } = await supabase.auth.signInWithOtp({
        email: input.email,
      });

      if (error) {
        console.error(error.code + ": " + error.message);
        throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
      } else {
        return {
          email: input.email,
          sent: true,
        };
      }
    }),
  confirmOtp: publicProcedure
    .input(z.object({ email: z.string().email(), otp: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { data, error } = await ctx.supabase.auth.verifyOtp({
        email: input.email,
        token: input.otp,
        type: "email",
      });

      if (error) {
        console.error(error.code + ": " + error.message);
        throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
      }

      if (!data.user || !data.session) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid OTP" });
      }

      return {
        user: data.user,
        session: data.session,
      };
    }),
  refreshSession: protectedProcedure.mutation(async ({ ctx }) => {
    const currentSession = await ctx.supabase.auth.getSession();

    if (!currentSession.data.session) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const { data, error } = await ctx.supabase.auth.refreshSession({
      refresh_token: currentSession.data.session.refresh_token,
    });

    if (error) {
      console.error(error.code + ": " + error.message);
      throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    }

    if (!data.session) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    return data.session;
  }),
});

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Facebook({
      clientId: process.env.AUTH_FACEBOOK_ID!,
      clientSecret: process.env.AUTH_FACEBOOK_SECRET!,
    }),
  ],
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
});

import NextAuth, { DefaultSession } from 'next-auth';
// import { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createClient } from '@supabase/supabase-js';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      email: string;
    } & DefaultSession['user'];
  }
}

// declare module 'next-auth/jwt' {
//   interface JWT {
//     id: string;
//     email: string | null;
//   }
// }

// init supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

if (!process.env.AUTH_SECRET) {
  throw new Error('Missing AUTH_SECRET');
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          // use supabase auth to authorize
          const {
            data: { user },
            error,
          } = await supabase.auth.signInWithPassword({
            email: credentials?.email?.toString() || '',
            password: credentials?.password?.toString() || '',
          });

          if (error) {
            throw new Error(error.message);
          }

          if (user) {
            // return user data to NextAuth
            return {
              id: user.id,

              email: user.email,
              name: user.user_metadata?.username || user.email,
            };
          }

          return null;
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/login', // custom login page path
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email || null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = (token.email as string) || '';
      }
      return session;
    },
  },
});

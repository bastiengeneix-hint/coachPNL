import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { createServerClient } from '@/lib/supabase/server';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: 'user' | 'admin';
      onboardingComplete: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    role: 'user' | 'admin';
    onboardingComplete: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    role: 'user' | 'admin';
    onboardingComplete: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email et mot de passe requis');
        }

        const supabase = createServerClient();

        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', credentials.email)
          .single();

        if (error || !user) {
          throw new Error('Email ou mot de passe incorrect');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );

        if (!isPasswordValid) {
          throw new Error('Email ou mot de passe incorrect');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          onboardingComplete: user.onboarding_complete,
        };
      },
    }),
  ],

  session: {
    strategy: 'jwt',
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
        token.onboardingComplete = user.onboardingComplete;
      }

      // Allow updating the token when session is updated
      if (trigger === 'update' && session) {
        if (session.onboardingComplete !== undefined) {
          token.onboardingComplete = session.onboardingComplete;
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.userId,
        role: token.role,
        onboardingComplete: token.onboardingComplete,
      };

      return session;
    },
  },

  pages: {
    signIn: '/login',
  },
};

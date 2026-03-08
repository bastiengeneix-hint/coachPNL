import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerClient } from '@/lib/supabase/server';

interface RegisterBody {
  email: string;
  password: string;
  name?: string;
}

export async function POST(request: Request) {
  try {
    const body: RegisterBody = await request.json();
    const { email, password, name } = body;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Adresse email invalide' },
        { status: 400 }
      );
    }

    // Validate password length
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caracteres' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Un compte avec cet email existe deja' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert user
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        email,
        name: name || null,
        password_hash: passwordHash,
        role: 'user',
        onboarding_complete: false,
      })
      .select('id')
      .single();

    if (userError || !newUser) {
      console.error('Error creating user:', userError);
      return NextResponse.json(
        { error: 'Erreur lors de la creation du compte' },
        { status: 500 }
      );
    }

    // Create empty profile
    const { error: profileError } = await supabase.from('profiles').insert({
      user_id: newUser.id,
      projets: [],
      patterns_sabotage: [],
      barrieres_ulp: [],
      croyances_limitantes: [],
      preferences: {
        ce_qui_aide: [],
        ce_qui_bloque: [],
        ton: 'mix',
      },
    });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Cleanup: delete the user if profile creation fails
      await supabase.from('users').delete().eq('id', newUser.id);
      return NextResponse.json(
        { error: 'Erreur lors de la creation du profil' },
        { status: 500 }
      );
    }

    // Create empty active context
    const { error: contextError } = await supabase
      .from('active_contexts')
      .insert({
        user_id: newUser.id,
        summary: '',
        recent_themes: [],
        pending_exercice: null,
      });

    if (contextError) {
      console.error('Error creating active context:', contextError);
      // Cleanup: delete profile and user
      await supabase.from('profiles').delete().eq('user_id', newUser.id);
      await supabase.from('users').delete().eq('id', newUser.id);
      return NextResponse.json(
        { error: 'Erreur lors de la creation du contexte' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, userId: newUser.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

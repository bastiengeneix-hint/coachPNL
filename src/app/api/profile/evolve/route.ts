import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';
import type { ProfileEvolution } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const evolution: ProfileEvolution = await request.json();

    const supabase = createServerClient();

    // Fetch current profile
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Apply evolution with deduplication
    const currentCroyances: string[] = profile.croyances_limitantes || [];
    const currentPatterns: string[] = profile.patterns_sabotage || [];
    const currentProjets: string[] = profile.projets || [];

    const updatedCroyances = applyEvolution(
      currentCroyances,
      evolution.add_croyances,
      evolution.remove_croyances
    );
    const updatedPatterns = applyEvolution(
      currentPatterns,
      evolution.add_patterns,
      evolution.remove_patterns
    );
    const updatedProjets = addUnique(currentProjets, evolution.add_projets);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        croyances_limitantes: updatedCroyances,
        patterns_sabotage: updatedPatterns,
        projets: updatedProjets,
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Profile evolution error:', updateError);
      return NextResponse.json({ error: 'Failed to evolve profile' }, { status: 500 });
    }

    return NextResponse.json({
      evolved: true,
      changes: {
        croyances_added: evolution.add_croyances?.length || 0,
        croyances_removed: evolution.remove_croyances?.length || 0,
        patterns_added: evolution.add_patterns?.length || 0,
        patterns_removed: evolution.remove_patterns?.length || 0,
        projets_added: evolution.add_projets?.length || 0,
      },
    });
  } catch (error) {
    console.error('Profile evolve error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function applyEvolution(
  current: string[],
  toAdd?: string[],
  toRemove?: string[]
): string[] {
  let result = [...current];

  // Remove items that match (fuzzy: lowercased includes check)
  if (toRemove && toRemove.length > 0) {
    const removeLower = toRemove.map((r) => r.toLowerCase());
    result = result.filter(
      (item) => !removeLower.some((r) => item.toLowerCase().includes(r) || r.includes(item.toLowerCase()))
    );
  }

  // Add new unique items
  if (toAdd && toAdd.length > 0) {
    result = addUnique(result, toAdd);
  }

  return result;
}

function addUnique(current: string[], toAdd?: string[]): string[] {
  if (!toAdd || toAdd.length === 0) return current;

  const currentLower = new Set(current.map((c) => c.toLowerCase()));
  const newItems = toAdd.filter((item) => !currentLower.has(item.toLowerCase()));

  return [...current, ...newItems];
}

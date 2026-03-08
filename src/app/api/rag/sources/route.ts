import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('sources')
      .select('id, titre, auteur, domaine, active, chunks_count, indexed_at')
      .order('indexed_at', { ascending: false });

    if (error) {
      console.error('Error fetching sources:', error);
      return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error('Sources GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, active } = await request.json();

    if (!id || typeof active !== 'boolean') {
      return NextResponse.json({ error: 'Invalid body: id and active required' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('sources')
      .update({ active })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error toggling source:', error);
      return NextResponse.json({ error: 'Failed to update source' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Sources PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Invalid body: id required' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from('sources')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting source:', error);
      return NextResponse.json({ error: 'Failed to delete source' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Sources DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

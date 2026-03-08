import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';
import { ingestPDF } from '@/lib/rag/ingest';

// Allow up to 5 minutes for large PDF ingestion
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();

    const file = formData.get('file') as File | null;
    const titre = formData.get('titre') as string | null;
    const auteur = formData.get('auteur') as string | null;
    const domaine = formData.get('domaine') as string | null;

    if (!file || !titre || !auteur || !domaine) {
      return NextResponse.json(
        { error: 'Missing required fields: file, titre, auteur, domaine' },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Create source record
    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .insert({
        titre,
        auteur,
        domaine,
        active: true,
        uploaded_by: session.user.id,
        chunks_count: 0,
        indexed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sourceError || !source) {
      console.error('Error creating source:', sourceError);
      return NextResponse.json({ error: 'Failed to create source' }, { status: 500 });
    }

    // Convert file to buffer and ingest
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { chunksCount } = await ingestPDF(buffer, source.id);

    // ingestPDF already updates chunks_count via storeChunks, just return
    return NextResponse.json({ source: { ...source, chunks_count: chunksCount }, chunksCount });
  } catch (error) {
    console.error('Upload POST error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// RAG Ingest Pipeline — PDF → text → chunks → embeddings OpenAI → Supabase pgvector
// OpenAI est utilisé UNIQUEMENT pour les embeddings vectoriels
// Le coaching et la reformulation de query sont 100% Claude

// Polyfill browser APIs required by pdfjs-dist v5+ in Node.js
if (typeof globalThis.DOMMatrix === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.DOMMatrix = class DOMMatrix {
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    is2D = true;
    isIdentity = true;
    inverse() { return new DOMMatrix(); }
    multiply() { return new DOMMatrix(); }
    translate() { return new DOMMatrix(); }
    scale() { return new DOMMatrix(); }
    rotate() { return new DOMMatrix(); }
    transformPoint() { return { x: 0, y: 0, z: 0, w: 1 }; }
  } as unknown as typeof globalThis.DOMMatrix;
}
if (typeof globalThis.Path2D === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.Path2D = class Path2D {
    addPath() {}
    closePath() {}
    moveTo() {}
    lineTo() {}
    bezierCurveTo() {}
    quadraticCurveTo() {}
    arc() {}
    arcTo() {}
    ellipse() {}
    rect() {}
  } as unknown as typeof globalThis.Path2D;
}

import { createServerClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.INNER_COACH_OPENAI_KEY || process.env.OPENAI_API_KEY,
  });
}

interface ChunkMeta {
  content: string;
  page_start: number;
  page_end: number;
  chapitre: string | null;
}

// Étape 1 : Extraire le texte du PDF (pdf-parse v1 API)
export async function extractText(buffer: Buffer): Promise<string> {
  // Use pdf-parse/lib/pdf-parse.js directly to avoid the test file loading issue
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse/lib/pdf-parse');
  const data = await pdfParse(buffer);
  return data.text;
}

// Étape 2 : Découper en chunks sémantiques (300-500 tokens, overlap 50)
export function chunkText(text: string): ChunkMeta[] {
  const chunks: ChunkMeta[] = [];

  // Nettoyer le texte
  const cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  // Découper par paragraphes
  const paragraphs = cleaned.split(/\n\n+/);

  let currentChunk = '';
  let currentPage = 1;
  let chunkStartPage = 1;
  let currentChapitre: string | null = null;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Détecter les changements de page (approximation)
    const pageBreaks = (trimmed.match(/\f/g) || []).length;
    if (pageBreaks > 0) {
      currentPage += pageBreaks;
    }

    // Détecter les titres de chapitres
    if (
      trimmed.length < 100 &&
      (trimmed.match(/^(chapitre|chapter|partie|part)\s+/i) ||
        (trimmed === trimmed.toUpperCase() && trimmed.length > 3))
    ) {
      currentChapitre = trimmed;
    }

    // Estimer les tokens (~4 chars par token en français)
    const currentTokens = Math.ceil(currentChunk.length / 4);
    const paraTokens = Math.ceil(trimmed.length / 4);

    if (currentTokens + paraTokens > 500 && currentChunk.length > 0) {
      // Sauvegarder le chunk actuel
      chunks.push({
        content: currentChunk.trim(),
        page_start: chunkStartPage,
        page_end: currentPage,
        chapitre: currentChapitre,
      });

      // Overlap : garder les derniers ~50 tokens du chunk précédent
      const overlapChars = 200; // ~50 tokens
      const overlap = currentChunk.slice(-overlapChars);
      currentChunk = overlap + '\n\n' + trimmed;
      chunkStartPage = currentPage;
    } else {
      if (currentChunk) {
        currentChunk += '\n\n' + trimmed;
      } else {
        currentChunk = trimmed;
        chunkStartPage = currentPage;
      }
    }
  }

  // Dernier chunk
  if (currentChunk.trim().length > 50) {
    chunks.push({
      content: currentChunk.trim(),
      page_start: chunkStartPage,
      page_end: currentPage,
      chapitre: currentChapitre,
    });
  }

  return chunks;
}

// Étape 3 : Générer les embeddings via OpenAI
export async function embedChunks(chunks: ChunkMeta[]): Promise<number[][]> {
  const batchSize = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const response = await getOpenAI().embeddings.create({
      model: 'text-embedding-3-small',
      input: batch.map((c) => c.content),
    });
    allEmbeddings.push(...response.data.map((d) => d.embedding));
  }

  return allEmbeddings;
}

// Étape 4 : Stocker dans Supabase
export async function storeChunks(
  sourceId: string,
  chunks: ChunkMeta[],
  embeddings: number[][]
): Promise<void> {
  const supabase = createServerClient();

  const rows = chunks.map((chunk, i) => ({
    source_id: sourceId,
    content: chunk.content,
    page_start: chunk.page_start,
    page_end: chunk.page_end,
    chapitre: chunk.chapitre,
    embedding: JSON.stringify(embeddings[i]),
  }));

  // Insérer par batches de 100
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error } = await supabase.from('chunks').insert(batch);
    if (error) throw new Error(`Erreur insertion chunks: ${error.message}`);
  }

  // Mettre à jour le compteur de chunks sur la source
  const { error: updateError } = await supabase
    .from('sources')
    .update({ chunks_count: chunks.length })
    .eq('id', sourceId);

  if (updateError) {
    console.error('Erreur mise à jour chunks_count:', updateError);
  }
}

// Pipeline complet : PDF → text → chunks → embeddings → Supabase
export async function ingestPDF(
  buffer: Buffer,
  sourceId: string
): Promise<{ chunksCount: number }> {
  const text = await extractText(buffer);
  const chunks = chunkText(text);

  if (chunks.length === 0) {
    throw new Error('Aucun contenu extractible du PDF');
  }

  const embeddings = await embedChunks(chunks);
  await storeChunks(sourceId, chunks, embeddings);

  return { chunksCount: chunks.length };
}

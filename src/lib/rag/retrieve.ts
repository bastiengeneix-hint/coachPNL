// RAG Retrieval — Recherche vectorielle pgvector + reformulation Claude Haiku
// OpenAI = embeddings uniquement | Claude Haiku = reformulation de query | Claude Sonnet = coaching

import { createServerClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.INNER_COACH_OPENAI_KEY || process.env.OPENAI_API_KEY,
  });
}

function getAnthropic() {
  return new Anthropic({
    apiKey: process.env.INNER_COACH_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY,
  });
}

interface RAGPassage {
  livre: string;
  page: string;
  content: string;
}

// Reformuler le message utilisateur en intention émotionnelle pour meilleure recherche
async function reformulateQuery(
  userMessage: string,
  recentMessages: string[]
): Promise<string> {
  try {
    const context = recentMessages.slice(-3).join('\n');

    const response = await getAnthropic().messages.create({
      model: 'claude-haiku-4-20250414',
      max_tokens: 150,
      system: `Tu es un assistant de reformulation. Reformule le message suivant en une requête de recherche optimisée pour la recherche sémantique dans une base de connaissances en développement personnel et PNL. Extrais l'intention émotionnelle et les thèmes profonds. Garde le français. Réponds UNIQUEMENT avec la requête reformulée, rien d'autre.`,
      messages: [
        {
          role: 'user',
          content: context
            ? `Contexte récent:\n${context}\n\nMessage:\n${userMessage}`
            : userMessage,
        },
      ],
    });

    const content = response.content[0];
    return content.type === 'text' ? content.text : userMessage;
  } catch {
    // En cas d'erreur, utiliser le message brut
    return userMessage;
  }
}

// Générer l'embedding de la query via OpenAI
async function embedQuery(query: string): Promise<number[]> {
  const response = await getOpenAI().embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });
  return response.data[0].embedding;
}

// Recherche vectorielle dans Supabase pgvector
export async function retrievePassages(
  userMessage: string,
  recentMessages: string[] = []
): Promise<RAGPassage[]> {
  // Pas de retrieval sur messages très courts
  if (userMessage.length < 15) return [];

  try {
    const supabase = createServerClient();

    // Vérifier s'il y a des sources actives
    const { data: activeSources } = await supabase
      .from('sources')
      .select('id')
      .eq('active', true);

    if (!activeSources || activeSources.length === 0) return [];

    // Reformuler pour meilleur match sémantique (Claude Haiku)
    const reformulated = await reformulateQuery(userMessage, recentMessages);

    // Embedding de la query (OpenAI)
    const embedding = await embedQuery(reformulated);

    // Recherche via la fonction RPC match_chunks (pgvector cosine similarity)
    const { data: chunks, error } = await supabase.rpc('match_chunks', {
      query_embedding: JSON.stringify(embedding),
      match_threshold: 0.72,
      match_count: 9,
    });

    if (error || !chunks || chunks.length === 0) return [];

    // Grouper par source, max 3 par source
    const bySource = new Map<string, typeof chunks>();
    for (const chunk of chunks) {
      const existing = bySource.get(chunk.source_id) || [];
      if (existing.length < 3) {
        existing.push(chunk);
        bySource.set(chunk.source_id, existing);
      }
    }

    // Joindre avec les sources pour le titre
    const sourceIds = [...bySource.keys()];
    const { data: sources } = await supabase
      .from('sources')
      .select('id, titre, auteur')
      .in('id', sourceIds);

    const sourceMap = new Map(
      sources?.map((s) => [s.id, s]) || []
    );

    // Formater les passages
    const passages: RAGPassage[] = [];
    for (const [sourceId, sourceChunks] of bySource) {
      const source = sourceMap.get(sourceId);
      for (const chunk of sourceChunks) {
        passages.push({
          livre: source
            ? `${source.titre} — ${source.auteur}`
            : 'Source inconnue',
          page: chunk.page_start
            ? `${chunk.page_start}${chunk.page_end ? `-${chunk.page_end}` : ''}`
            : '?',
          content: chunk.content,
        });
      }
    }

    return passages.slice(0, 9);
  } catch (error) {
    console.error('RAG retrieval error:', error);
    return [];
  }
}

// ─── AGENT INTERVENTION ─────────────────────────────────────────────────────
// Reçoit le diagnostic → décide LA technique PNL optimale et donne un plan
// d'exécution étape par étape au coach. C'est le "comment faire".

import Anthropic from '@anthropic-ai/sdk';
import { Diagnostic } from './diagnostic';

export interface Intervention {
  technique: string;
  steps: string[];
  goal: string;
  stance: 'explore' | 'guide' | 'confront' | 'support';
  book_concept: { idea: string; how_to_use: string } | null;
}

const INTERVENTION_SYSTEM = `Tu es le stratège d'un coach PNL senior. On te donne un diagnostic (pattern détecté, niveau Dilts, vrai sujet). Tu décides l'INTERVENTION EXACTE — quelle technique et comment l'exécuter pas à pas dans la conversation.

Tu connais TOUS les outils et tu sais EXACTEMENT quand utiliser chacun :

CROYANCE LIMITANTE → Méta-modèle + Recadrage
1) Isoler la croyance exacte dans les mots du coaché
2) Challenger : "c'est un fait, ou c'est une histoire ?"
3) Chercher le contre-exemple concret
4) Recadrer : proposer un autre angle

CONFLIT DE PARTIES → Dialogue des parties
1) Nommer les 2 voix/envies opposées
2) Faire parler la partie A : "qu'est-ce qu'elle veut VRAIMENT ?"
3) Faire parler la partie B : "et elle, qu'est-ce qu'elle protège ?"
4) Chercher l'intention positive commune

PERSPECTIVE BLOQUÉE → Positions perceptuelles
1) Position 2 : "mets-toi à la place de [X]. Qu'est-ce que tu vois ?"
2) Position 3 : "maintenant regarde la scène de l'extérieur"
3) Retour en position 1 avec les insights

PARALYSIE / HÉSITATION → Ligne du temps
1) Projeter 6 mois après le choix A : "t'es où ? tu ressens quoi ?"
2) Même chose avec le choix B
3) Comparer les ressentis, pas les raisonnements

ÉMOTION TROP FORTE → Dissociation
1) "Imagine que tu regardes cette scène sur un écran"
2) "Qu'est-ce que tu remarques de là-bas ?"
3) Observer les patterns avec cette distance

LANGAGE IMPRÉCIS → Méta-modèle pur
1) Identifier la distorsion/généralisation/suppression
2) UNE question précise et chirurgicale

SUJET BUSINESS/STRATÉGIQUE → Recadrage + Prise de position
1) Écouter les 2 raisonnements
2) Prendre position : "moi ce que je vois c'est que le A tient et le B c'est du système 1"
3) Expliquer POURQUOI avec un raisonnement PNL structuré
4) Challenger : "qu'est-ce qui te fait tenir au B malgré ça ?"

CONVERSATION QUI TOURNE EN ROND → Pattern interrupt
1) ARRÊTER de questionner — passer à un exercice guidé ou une observation directe
2) Changer radicalement de registre (humour, provocation, partage personnel, exercice)

Réponds UNIQUEMENT en JSON valide, sans markdown.`;

export async function planIntervention(params: {
  apiKey: string;
  userName: string;
  userMessage: string;
  diagnostic: Diagnostic;
  recentCoachMessages: string[];
  ragPassages: { livre: string; content: string }[];
  isLooping: boolean;
  techniquesUsed: string[];
}): Promise<Intervention> {
  const fallback: Intervention = {
    technique: 'exploration',
    steps: ['Écouter attentivement', 'Observer les patterns dans le langage', 'Choisir une technique PNL adaptée'],
    goal: 'Comprendre la situation en profondeur',
    stance: 'explore',
    book_concept: null,
  };

  try {
    const anthropic = new Anthropic({ apiKey: params.apiKey });

    const bookPassages = params.ragPassages.length > 0
      ? params.ragPassages.map(p => `[${p.livre}]: ${p.content.slice(0, 150)}`).join('\n')
      : 'Aucun.';

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: INTERVENTION_SYSTEM,
      messages: [{
        role: 'user',
        content: `PLANIFIE L'INTERVENTION.

## Diagnostic :
- Pattern : ${params.diagnostic.core_pattern}
- Niveau Dilts : ${params.diagnostic.dilts_level}
- Vrai sujet : ${params.diagnostic.real_issue || 'à déterminer'}
- Émotion : ${params.diagnostic.emotional_state}
- Pushback : ${params.diagnostic.user_pushback ? 'OUI — le coaché rejette l\'analyse du coach' : 'non'}
- Domaine : ${params.diagnostic.topic_domain}

## Message de ${params.userName} : "${params.userMessage.slice(0, 300)}"

## Contexte :
- Conversation tourne en rond : ${params.isLooping ? 'OUI → CHANGE D\'APPROCHE RADICALEMENT' : 'non'}
- Techniques déjà utilisées : ${params.techniquesUsed.length > 0 ? params.techniquesUsed.join(', ') : 'aucune encore'}
- Derniers messages coach : ${params.recentCoachMessages.slice(-2).map((m, i) => `\n${i + 1}: ${m.slice(0, 150)}`).join('') || 'aucun'}

## Passages de livres : ${bookPassages}

JSON :
{
  "technique": "nom de la technique PNL",
  "steps": ["étape 1 concrète pour le coach", "étape 2", "étape 3"],
  "goal": "le déclic visé — que doit comprendre/voir ${params.userName}",
  "stance": "explore|guide|confront|support",
  "book_concept": {"idea": "concept", "how_to_use": "comment"} ou null
}`,
      }],
    });

    const text = response.content[0];
    if (text.type !== 'text') return fallback;

    let jsonStr = text.text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonStr);
    return {
      technique: parsed.technique || fallback.technique,
      steps: Array.isArray(parsed.steps) && parsed.steps.length > 0 ? parsed.steps : fallback.steps,
      goal: parsed.goal || fallback.goal,
      stance: ['explore', 'guide', 'confront', 'support'].includes(parsed.stance) ? parsed.stance : 'explore',
      book_concept: parsed.book_concept || null,
    };
  } catch (error) {
    console.error('Intervention agent error:', error);
    return fallback;
  }
}

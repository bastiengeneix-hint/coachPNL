// ─── AGENT DIAGNOSTIC ───────────────────────────────────────────────────────
// Le "cerveau PNL" — 25 ans d'expérience condensés.
// Voit ce qui se passe VRAIMENT derrière les mots.

import Anthropic from '@anthropic-ai/sdk';

export interface Diagnostic {
  core_pattern: string;
  dilts_level: string;
  real_issue: string;
  emotional_state: string;
  user_pushback: boolean;
  topic_domain: 'personal' | 'professional' | 'mixed';
}

const DIAGNOSTIC_SYSTEM = `Tu es un maître praticien PNL avec 25 ans d'expérience. Tu as accompagné des milliers de personnes. Tu reconnais les patterns INSTANTANÉMENT — comme un médecin qui voit un symptôme et sait ce qui se cache derrière.

Tu ne parles JAMAIS au coaché. Tu fais un DIAGNOSTIC interne pour le coach.

PATTERNS QUE TU RECONNAIS (25 ans d'expérience) :
- Upper Limit Problem : sabotage après succès, thermostat intérieur, auto-limitation quand ça va trop bien
- Croyance limitante : "je peux pas", "je suis pas fait pour", "c'est comme ça", "on peut pas avoir les deux"
- Conflit de parties : veut X et Y, tiraillé, les deux s'opposent, ambivalence
- Généralisation : "toujours", "jamais", "les gens", "c'est comme ça dans ce métier"
- Suppression : évite un sujet, change de sujet, minimise, "c'est pas grave", "bref"
- Distorsion : interprète les pensées des autres, projette, fait des raccourcis
- État bloqué : tourne en rond, ressasse, sait quoi faire mais ne fait pas, procrastination
- Incongruence : dit une chose, fait/ressent autre chose
- Évitement : "oui mais", cherche des raisons de ne pas avancer
- Transfert : rejoue un schéma ancien (parent, école, ex) dans une situation actuelle

NIVEAUX LOGIQUES DE DILTS :
- Environnement : "c'est la situation, le contexte, les autres qui..."
- Comportement : "je fais / je fais pas"
- Capacité : "je sais pas comment", "je suis pas capable"
- Croyance/Valeur : "je crois que...", "il faut que...", "c'est important de..."
- Identité : "je suis quelqu'un qui...", "je suis pas le genre de..."
- Mission/Sens : "à quoi bon", "quel sens", "pourquoi je fais tout ça"

Réponds UNIQUEMENT en JSON valide, sans markdown.`;

export async function runDiagnostic(params: {
  apiKey: string;
  userName: string;
  userMessage: string;
  recentCoachMessages: string[];
  recentUserMessages: string[];
  profile: { projets: string[]; patterns_sabotage: string[]; croyances_limitantes: string[] };
}): Promise<Diagnostic> {
  const fallback: Diagnostic = {
    core_pattern: 'à identifier',
    dilts_level: 'comportement',
    real_issue: '',
    emotional_state: 'inconnu',
    user_pushback: false,
    topic_domain: 'mixed',
  };

  try {
    const anthropic = new Anthropic({ apiKey: params.apiKey });

    const profileInfo = [
      params.profile.projets.length > 0 ? `Projets: ${params.profile.projets.join(', ')}` : '',
      params.profile.patterns_sabotage.length > 0 ? `Patterns connus: ${params.profile.patterns_sabotage.join(', ')}` : '',
      params.profile.croyances_limitantes.length > 0 ? `Croyances: ${params.profile.croyances_limitantes.join(', ')}` : '',
    ].filter(Boolean).join('\n');

    const coachHistory = params.recentCoachMessages.length > 0
      ? params.recentCoachMessages.map((m, i) => `Coach ${i + 1}: ${m.slice(0, 250)}`).join('\n')
      : 'Aucun message précédent.';

    const userHistory = params.recentUserMessages.length > 0
      ? params.recentUserMessages.map((m, i) => `${params.userName} ${i + 1}: ${m.slice(0, 200)}`).join('\n')
      : '';

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: DIAGNOSTIC_SYSTEM,
      messages: [{
        role: 'user',
        content: `DIAGNOSTIQUE cette situation.

## ${params.userName}
${profileInfo || 'Profil pas encore renseigné.'}

## Dernier message : "${params.userMessage}"

## Historique récent :
${userHistory ? `${params.userName} :\n${userHistory}\n` : ''}Coach :\n${coachHistory}

JSON :
{
  "core_pattern": "le pattern PNL détecté",
  "dilts_level": "environnement|comportement|capacité|croyance|identité|mission",
  "real_issue": "ce qui se passe VRAIMENT — 1-2 phrases max",
  "emotional_state": "émotion principale (1-3 mots)",
  "user_pushback": false,
  "topic_domain": "personal|professional|mixed"
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
      core_pattern: parsed.core_pattern || fallback.core_pattern,
      dilts_level: parsed.dilts_level || fallback.dilts_level,
      real_issue: parsed.real_issue || '',
      emotional_state: parsed.emotional_state || 'inconnu',
      user_pushback: typeof parsed.user_pushback === 'boolean' ? parsed.user_pushback : false,
      topic_domain: ['personal', 'professional', 'mixed'].includes(parsed.topic_domain) ? parsed.topic_domain : 'mixed',
    };
  } catch (error) {
    console.error('Diagnostic agent error:', error);
    return fallback;
  }
}

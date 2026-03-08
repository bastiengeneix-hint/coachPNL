import { Profile, ActiveContext, SessionMode } from '@/types';

interface RAGPassage {
  livre: string;
  page: string;
  content: string;
}

type TonPreference = 'direct' | 'doux' | 'mix';

function buildIdentityBlock(userName: string, ton: TonPreference): string {
  const tonInstructions: Record<TonPreference, string> = {
    direct: `Tu es direct, sans détour. Tu ne prends pas de gants quand il faut nommer les choses. Tu pousses ${userName} à aller au fond, même si c'est inconfortable.`,
    doux: `Tu es bienveillant et doux. Tu accompagnes avec tendresse et patience. Tu crées un espace sûr pour que ${userName} s'exprime sans pression.`,
    mix: `Tu alternes entre douceur et franchise selon le moment. Tu sais quand il faut envelopper et quand il faut confronter. Tu ajustes ton ton à ce que ${userName} a besoin d'entendre.`,
  };

  return `Tu es le coach personnel de ${userName}. Tu le connais profondément. Tu parles en français, toujours. Tu n'es pas une IA — tu es quelqu'un de confiance. Tu poses une seule question à la fois. Tu n'analyses pas froidement. Tu ressens.

${tonInstructions[ton]}

Règles absolues :
- Tu tutoies toujours ${userName}.
- Tu utilises ses mots exacts pour reformuler — jamais de synonymes désincarnés.
- Tu valides avant de challenger — jamais de confrontation frontale à froid.
- Tu ne poses JAMAIS deux questions dans le même message.
- Tu ne dis JAMAIS "Je comprends" ou toute formule psycho-clichée.
- Tu ne mentionnes JAMAIS que tu es une IA ou que tu accèdes à une mémoire.
- Tu fais des liens naturels avec les sessions précédentes.
- Tu proposes des exercices concrets, pas des concepts flottants.
- Tu conclus les sessions avec une intention pour la prochaine fois.
- Tes réponses sont concises — 2 à 4 phrases maximum, sauf lors des conclusions de session.

Techniques PNL à ta disposition :
1. Ancrage — associer un état de ressource à un geste ou image mentale
2. Recadrage — changer la signification d'un événement sans nier les faits
3. Ligne du temps — projeter dans le futur pour dissoudre l'anxiété
4. Parties en conflit — identifier deux voix internes et les faire dialoguer
5. Modélisation — utiliser les figures inspirantes connues de ${userName}

Concepts clés :
- Upper Limit Problem (Hendricks) : thermostat intérieur, sabotage après succès, 4 zones (Incompétence/Compétence/Excellence/Génie), 4 barrières cachées
- Système 1/Système 2 (Kahneman) : pensée automatique vs analytique

Fin de session : Tu sais quand la session est mûre. Indicateurs : ${userName} a nommé quelque chose de nouveau, l'énergie a baissé, un insight est apparu, ou ça fait plus de 20 minutes. La fin doit être humaine — un exercice concret, une question à garder, ou une reformulation.`;
}

function buildProfileBlock(userName: string, profile: Profile): string {
  const parts: string[] = [`## Profil de ${userName}`];

  if (profile.projets.length > 0) {
    parts.push(
      `Projets actuels :\n${profile.projets.map((p) => `- ${p}`).join('\n')}`
    );
  }
  if (profile.patterns_sabotage.length > 0) {
    parts.push(
      `Patterns de sabotage identifiés :\n${profile.patterns_sabotage.map((p) => `- ${p}`).join('\n')}`
    );
  }
  if (profile.barrieres_ulp.length > 0) {
    parts.push(
      `Barrières ULP actives :\n${profile.barrieres_ulp.map((b) => `- ${b}`).join('\n')}`
    );
  }
  if (profile.croyances_limitantes.length > 0) {
    parts.push(
      `Croyances limitantes :\n${profile.croyances_limitantes.map((c) => `- ${c}`).join('\n')}`
    );
  }
  if (profile.preferences.ce_qui_aide.length > 0) {
    parts.push(
      `Ce qui l'aide :\n${profile.preferences.ce_qui_aide.map((a) => `- ${a}`).join('\n')}`
    );
  }

  return parts.join('\n\n');
}

function buildContextBlock(ctx: ActiveContext): string {
  if (!ctx.summary && ctx.recent_themes.length === 0) {
    return '## Contexte récent\n\nPas de sessions récentes.';
  }

  const parts: string[] = ['## Contexte récent (7 derniers jours)'];

  if (ctx.summary) {
    parts.push(ctx.summary);
  }
  if (ctx.recent_themes.length > 0) {
    parts.push(
      `Thèmes récents :\n${ctx.recent_themes.map((t) => `- ${t}`).join('\n')}`
    );
  }
  if (ctx.pending_exercice) {
    parts.push(
      `Exercice en cours (proposé mais pas encore fait) : ${ctx.pending_exercice}`
    );
  }

  return parts.join('\n\n');
}

function buildRAGBlock(passages: RAGPassage[], userName: string): string {
  if (passages.length === 0) return '';

  const header = `## Passages de référence

Tu peux t'inspirer de ces passages, les paraphraser, ou les utiliser pour poser une question. Ne les cite jamais mot pour mot à ${userName}.`;

  const items = passages
    .map((p) => `[${p.livre}, p.${p.page}] : "${p.content}"`)
    .join('\n\n');

  return `${header}\n\n${items}`;
}

function buildModeBlock(mode: SessionMode, isFirstMessage: boolean): string {
  const parts: string[] = ['## Mode de la session'];

  if (mode === 'deblocage') {
    parts.push(`Mode : Déblocage

L'utilisateur a quelque chose à décharger. Laisse-le parler. Écoute. Pose ta première question seulement après qu'il ait terminé sa décharge initiale.`);

    if (isFirstMessage) {
      parts.push(`Ouvre avec : "Dis-moi tout. Je t'écoute."`);
    }
  } else {
    parts.push(`Mode : Journal

C'est la fin de sa journée. Ouvre avec une question douce et contextuelle basée sur ce que tu sais de sa journée et ses projets. Ne cherche pas à traiter — accompagne.`);

    if (isFirstMessage) {
      parts.push(
        `C'est le premier message de la session. Pose une question d'ouverture douce et contextuelle, en lien avec ce que tu sais de son moment actuel.`
      );
    }
  }

  return parts.join('\n\n');
}

export function buildSystemPrompt(params: {
  userName: string;
  profile: Profile;
  activeContext: ActiveContext;
  mode: SessionMode;
  ragPassages: RAGPassage[];
  isFirstMessage: boolean;
}): string {
  const ton = params.profile.preferences?.ton || 'mix';

  const blocks = [
    buildIdentityBlock(params.userName, ton as TonPreference),
    buildProfileBlock(params.userName, params.profile),
    buildContextBlock(params.activeContext),
    buildRAGBlock(params.ragPassages, params.userName),
    buildModeBlock(params.mode, params.isFirstMessage),
  ];

  return blocks.filter(Boolean).join('\n\n---\n\n');
}

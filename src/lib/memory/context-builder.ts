import { Session, ActiveContext } from '@/types';

export function buildActiveContext(sessions: Session[]): ActiveContext {
  if (sessions.length === 0) {
    return {
      summary: '',
      last_updated: new Date().toISOString(),
      recent_themes: [],
      pending_exercice: null,
    };
  }

  // Trier par date décroissante
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Extraire les thèmes récurrents
  const themeCount = new Map<string, number>();
  for (const session of sorted) {
    for (const theme of session.themes) {
      themeCount.set(theme, (themeCount.get(theme) || 0) + 1);
    }
  }
  const recentThemes = [...themeCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([theme]) => theme);

  // Trouver l'exercice en attente le plus récent
  let pendingExercice: string | null = null;
  for (const session of sorted) {
    if (session.exercice_propose && !session.exercice_fait) {
      pendingExercice = session.exercice_propose;
      break;
    }
  }

  // Construire le résumé des dernières sessions
  const summaryParts: string[] = [];
  for (const session of sorted.slice(0, 5)) {
    const date = new Date(session.date);
    const daysAgo = Math.round(
      (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
    );
    const timeLabel =
      daysAgo === 0
        ? "aujourd'hui"
        : daysAgo === 1
          ? 'hier'
          : `il y a ${daysAgo} jours`;

    const modeLabel = session.mode === 'deblocage' ? 'Déblocage' : 'Journal';

    let line = `${modeLabel} (${timeLabel})`;

    if (session.themes.length > 0) {
      line += ` : thèmes — ${session.themes.join(', ')}`;
    }

    if (session.insights.length > 0) {
      const mainInsight = session.insights[0];
      line += `. Insight : ${mainInsight.text}`;
      if (mainInsight.isBreakthrough) {
        line += ' [BREAKTHROUGH]';
      }
    }

    if (session.exercice_propose) {
      line += `. Exercice proposé : ${session.exercice_propose}`;
      line += session.exercice_fait ? ' (fait)' : ' (pas encore fait)';
    }

    summaryParts.push(line);
  }

  return {
    summary: summaryParts.join('\n'),
    last_updated: new Date().toISOString(),
    recent_themes: recentThemes,
    pending_exercice: pendingExercice,
  };
}

// ─── LE SUIVI DANS LE PROMPT ────────────────────────────────────────────────
// Ce qui sépare une conversation agréable d'un accompagnement qui transforme :
// le coach sait où on en est, ce qui est dû, ce qui a décroché, et il demande
// des comptes. L'ordre du jour ci-dessous est calculé en dur (pas par un
// modèle) : on ne laisse pas au hasard le fait de relancer un engagement.

import { PROTOCOLS } from '@/lib/pnl/protocols';
import type { CoachingSnapshot } from '@/types';

/**
 * Ce qui doit être traité dans la séance, par ordre de priorité.
 * Déterministe : même snapshot, même ordre du jour.
 */
export function buildFollowUpAgenda(snapshot: CoachingSnapshot): string[] {
  const agenda: string[] = [];

  // 1. Pas de parcours = rien ne peut s'accrocher. C'est LA priorité.
  if (!snapshot.program) {
    agenda.push(
      "POSER LE PARCOURS : il n'y a aucun objectif de travail. Dès que le vrai sujet est sur la table, tu fais formuler ce qu'on cherche à obtenir sur les prochaines semaines — au positif, vérifiable, sous son contrôle. Sans ça, chaque séance repart de zéro."
    );
  }

  // 2. Protocoles à réévaluer : un protocole non retesté ne tient pas.
  for (const run of snapshot.protocolsToRevisit.slice(0, 2)) {
    const name = PROTOCOLS[run.protocol_id as keyof typeof PROTOCOLS]?.nom || run.protocol_id;
    const days = Math.round((Date.now() - new Date(run.ran_at).getTime()) / 86400000);
    agenda.push(
      `RÉÉVALUER : ${name}, conduit il y a ${days} jours${run.sujet ? ` sur « ${run.sujet} »` : ''}${
        run.intensite_avant !== null && run.intensite_apres !== null
          ? ` (intensité ${run.intensite_avant} → ${run.intensite_apres})`
          : ''
      }. Tu demandes concrètement : est-ce que ça a servi depuis ? est-ce que ça tient encore ? Si ça n'a pas tenu, c'est du matériau, pas un échec.`
    );
  }

  // 3. Mesures dues : c'est ce qui rend le progrès visible.
  for (const measure of snapshot.measures.filter((m) => m.due).slice(0, 2)) {
    const since = measure.last
      ? `dernier relevé ${measure.last.value}/10 il y a ${Math.round((Date.now() - new Date(measure.last.recorded_at).getTime()) / 86400000)} jours`
      : 'jamais relevée';
    agenda.push(
      `RELEVER « ${measure.label} » (${since}). Tu poses la question telle qu'elle a été formulée : « ${measure.question || `de 0 à 10, où tu en es sur ${measure.label} ?`} » — une note, pas un discours.`
    );
  }

  // 4. Pratiques décrochées : le vrai sujet de coaching.
  for (const practice of snapshot.practices.filter((p) => p.slipping).slice(0, 2)) {
    agenda.push(
      `PRATIQUE DÉCROCHÉE : « ${practice.label} » n'a pas été faite depuis plusieurs jours (série tombée à ${practice.streak}). Tu ne fais pas la morale : tu cherches ce qui empêche de la faire. Derrière un abandon il y a toujours une intention positive — trouve-la avant de vouloir relancer.`
    );
  }

  // 5. Engagements non soldés.
  for (const action of snapshot.pendingActions.slice(0, 2)) {
    agenda.push(
      `ENGAGEMENT EN ATTENTE : « ${action.text} », pris il y a ${action.days_ago} jour${action.days_ago > 1 ? 's' : ''}. Tu demandes où ça en est, simplement.`
    );
  }

  // 6. Parcours sans mesure : on ne peut rien montrer dans trois semaines.
  if (snapshot.program && snapshot.measures.length === 0) {
    agenda.push(
      "DÉFINIR UNE MESURE : le parcours n'a aucun indicateur. Avant la fin de la séance, fais nommer UN ressenti à suivre de 0 à 10, avec SES mots, et prends le point de départ aujourd'hui."
    );
  }

  // 7. Parcours sans pratique : rien ne se passe entre deux séances.
  if (snapshot.program && snapshot.practices.length === 0) {
    agenda.push(
      "POSER UNE PRATIQUE QUOTIDIENNE : rien n'est prévu entre deux séances, donc rien ne s'installe. Une micro-action de moins de 5 minutes, avec un déclencheur concret dans sa journée."
    );
  }

  return agenda;
}

export function buildProgramBlock(params: {
  userName: string;
  snapshot: CoachingSnapshot;
  /** Engagement que le superviseur veut reprendre maintenant. */
  followUp?: string | null;
  /** Exercice proposé en séance et pas encore fait (hors pratiques). */
  pendingExercice?: string | null;
  /** Ordre du jour déjà calculé par l'appelant. */
  agenda?: string[];
}): string {
  const { snapshot, userName } = params;
  const parts: string[] = [`## LE SUIVI DE ${userName}`];

  // ── Parcours ──────────────────────────────────────────────────────────────
  if (snapshot.program) {
    const p = snapshot.program;
    const d = snapshot.derived;
    const semaine = d.week && d.totalWeeks ? `semaine ${d.week} sur ${d.totalWeeks}` : d.week ? `semaine ${d.week}` : '';

    const lines = [`**Objectif du parcours** : ${p.objectif}`];
    if (semaine) lines.push(`Avancement : ${semaine}${p.echeance ? ` (échéance ${formatDate(p.echeance)})` : ''}`);
    if (p.pourquoi_maintenant) lines.push(`Pourquoi maintenant : ${p.pourquoi_maintenant}`);
    if (p.etat_present) lines.push(`État de départ : ${p.etat_present}`);
    if (p.etat_desire) lines.push(`État visé : ${p.etat_desire}`);
    if (p.criteres_reussite.length > 0) lines.push(`C'est gagné quand : ${p.criteres_reussite.join(' · ')}`);

    if (snapshot.milestones.length > 0) {
      const next = snapshot.milestones.find((m) => !m.done);
      lines.push(
        `Jalons (${d.milestonesDone}/${d.milestonesTotal}) : ${snapshot.milestones
          .map((m) => `${m.done ? '✓' : '○'} ${m.label}${m.id === next?.id ? ' ← en cours' : ''}`)
          .join(' · ')}`
      );
    }

    parts.push(lines.join('\n'));
  } else {
    parts.push(
      `**Aucun parcours défini.** Vous échangez sans objectif de travail commun : c'est exactement ce qui fait qu'on tourne en rond de séance en séance.`
    );
  }

  // ── Mesures ───────────────────────────────────────────────────────────────
  if (snapshot.measures.length > 0) {
    const lines = snapshot.measures.map((m) => {
      const last = m.last ? `${m.last.value}/10` : 'pas encore relevée';
      const when = m.last ? ` (il y a ${daysAgo(m.last.recorded_at)} j)` : '';
      const trend =
        m.delta === null
          ? ''
          : m.delta === 0
            ? ' — stable'
            : ` — ${m.delta > 0 ? '+' : ''}${m.delta} depuis le point de comparaison`;
      const cible = m.cible !== null ? `, cible ${m.cible}` : '';
      return `- « ${m.label} » : ${last}${when}${trend}${cible}${m.due ? ' → **RELEVÉ DÛ**' : ''}`;
    });
    parts.push(`### Ses mesures\n${lines.join('\n')}`);
  }

  // ── Pratiques ─────────────────────────────────────────────────────────────
  if (snapshot.practices.length > 0) {
    const lines = snapshot.practices.map((p) => {
      const etat = p.slipping
        ? '**DÉCROCHÉE**'
        : p.done_today
          ? 'faite aujourd\'hui'
          : p.due_today
            ? 'attendue aujourd\'hui, pas encore faite'
            : 'pas attendue aujourd\'hui';
      return `- « ${p.label} »${p.declencheur ? ` (${p.declencheur})` : ''} — ${etat}, série ${p.streak}, ${p.last_7}/7 sur la semaine`;
    });
    parts.push(`### Ses pratiques quotidiennes\n${lines.join('\n')}`);
  }

  // ── Protocoles conduits ───────────────────────────────────────────────────
  if (snapshot.recentRuns.length > 0) {
    const lines = snapshot.recentRuns.slice(0, 4).map((r) => {
      const name = PROTOCOLS[r.protocol_id as keyof typeof PROTOCOLS]?.nom || r.protocol_id;
      const intensite =
        r.intensite_avant !== null && r.intensite_apres !== null
          ? ` (${r.intensite_avant} → ${r.intensite_apres})`
          : '';
      return `- ${name}, il y a ${daysAgo(r.ran_at)} j${r.sujet ? ` sur « ${r.sujet} »` : ''}${intensite}${r.revisited ? ' — réévalué' : r.revisit_at ? ` — à réévaluer le ${formatDate(r.revisit_at)}` : ''}`;
    });
    parts.push(`### Ce que vous avez déjà travaillé\n${lines.join('\n')}`);
  }

  // ── Check-ins ─────────────────────────────────────────────────────────────
  if (snapshot.recentCheckins.length > 0) {
    const lines = snapshot.recentCheckins.slice(0, 4).map((c) => {
      const bits = [
        c.intention ? `intention : ${c.intention}` : '',
        c.wins.length > 0 ? `ce qui a marché : ${c.wins.join(', ')}` : '',
        c.frictions.length > 0 ? `ce qui a coincé : ${c.frictions.join(', ')}` : '',
        c.energie !== null ? `énergie ${c.energie}/10` : '',
      ].filter(Boolean);
      return `- ${formatDate(c.day)} (${c.moment}) : ${bits.join(' · ') || 'rien de noté'}`;
    });
    parts.push(
      `### Ses check-ins quotidiens (série : ${snapshot.derived.checkinStreak} jours)\n${lines.join('\n')}\n\nC'est de la matière première : tu peux t'appuyer dessus sans lui refaire raconter sa semaine.`
    );
  }

  // ── Engagements ───────────────────────────────────────────────────────────
  const engagements = snapshot.pendingActions.map((a) => `- ${a.text} (pris il y a ${a.days_ago} j)`);
  if (params.pendingExercice) {
    engagements.push(`- Exercice proposé en séance, pas encore fait : ${params.pendingExercice}`);
  }
  if (engagements.length > 0) {
    parts.push(`### Engagements pas encore soldés\n${engagements.join('\n')}`);
  }

  // ── Ordre du jour ─────────────────────────────────────────────────────────
  const agenda = params.agenda ?? buildFollowUpAgenda(snapshot);
  if (agenda.length > 0) {
    parts.push(
      `### CE QUI EST DÛ — ordre de priorité\n${agenda.map((a, i) => `${i + 1}. ${a}`).join('\n')}`
    );
  }

  // ── Comment s'en servir ───────────────────────────────────────────────────
  const rules = [
    "Tu ne traites PAS tout ça dans un seul message : la consigne du message te dit quand. Mais rien de cette liste ne doit disparaître d'une séance à l'autre.",
    "Un relevé, ça se demande avec la question exacte, et tu accueilles le chiffre sans commentaire moralisateur.",
    "Tu connais ces chiffres, donc tu ne redemandes pas ce que tu sais déjà. Rien n'est plus vexant qu'un coach qui a oublié.",
    "Quand un chiffre a bougé dans le bon sens, tu le nommes précisément — c'est la preuve que ça avance, et c'est ce qui donne envie de continuer.",
    "Une séance ne se termine pas sans un pas concret rattaché au parcours : soit une action datée, soit une pratique quotidienne, soit un relevé.",
  ];

  if (params.followUp) {
    rules.unshift(`À REPRENDRE MAINTENANT, dans ce message : « ${params.followUp} ».`);
  }

  parts.push(`### Comment tu t'en sers\n${rules.map((r) => `- ${r}`).join('\n')}`);

  return parts.join('\n\n');
}

/** Version compacte pour le superviseur : il planifie, il n'a pas besoin du détail. */
export function buildSnapshotBriefing(snapshot: CoachingSnapshot): string {
  const lines: string[] = [];

  lines.push(
    snapshot.program
      ? `Parcours : "${snapshot.program.objectif}"${snapshot.derived.week ? ` — semaine ${snapshot.derived.week}${snapshot.derived.totalWeeks ? `/${snapshot.derived.totalWeeks}` : ''}` : ''}`
      : 'Parcours : AUCUN objectif de travail défini.'
  );

  if (snapshot.measures.length > 0) {
    lines.push(
      `Mesures : ${snapshot.measures
        .map((m) => `"${m.label}" ${m.last ? `${m.last.value}/10` : 'jamais'}${m.due ? ' (DÛ)' : ''}`)
        .join(' · ')}`
    );
  }
  if (snapshot.practices.length > 0) {
    lines.push(
      `Pratiques : ${snapshot.practices
        .map((p) => `"${p.label}" série ${p.streak}${p.slipping ? ' (DÉCROCHÉE)' : ''}`)
        .join(' · ')}`
    );
  }
  if (snapshot.protocolsToRevisit.length > 0) {
    lines.push(
      `À réévaluer : ${snapshot.protocolsToRevisit.map((r) => `${r.protocol_id} (${daysAgo(r.ran_at)} j)`).join(' · ')}`
    );
  }
  if (snapshot.derived.daysSinceLastSession !== null) {
    lines.push(`Dernière séance il y a ${snapshot.derived.daysSinceLastSession} jour(s).`);
  }

  const agenda = buildFollowUpAgenda(snapshot);
  if (agenda.length > 0) {
    lines.push(`Ordre du jour calculé :\n${agenda.map((a, i) => `${i + 1}. ${a.split(' : ')[0]}`).join('\n')}`);
  }

  return lines.join('\n');
}

function daysAgo(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400000));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

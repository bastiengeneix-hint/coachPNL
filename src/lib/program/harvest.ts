// ─── RÉCOLTE DE FIN DE SÉANCE ───────────────────────────────────────────────
// Une séance de coaching qui ne laisse aucune trace opérationnelle est une
// conversation. Ici on extrait ce qui fait AVANCER le parcours — objectif,
// jalons, mesures, pratiques quotidiennes, protocole conduit et sa date de
// réévaluation — et on l'écrit. Côté serveur : ça marche même si l'utilisateur
// ferme l'onglet (c'est le balayage qui reprend la main).

import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { ANALYSIS_MODEL } from '@/lib/ai/models';
import { parseModelJson, oneOf, stringArray } from '@/lib/ai/json';
import { PROTOCOL_IDS, buildProtocolCatalog, type ProtocolId } from '@/lib/pnl/protocols';
import type { CoachingSnapshot, Message, SessionHarvest, PracticeCadence } from '@/types';

const MAX_ACTIVE_MEASURES = 4;
const MAX_ACTIVE_PRACTICES = 3;
const DEFAULT_REVISIT_DAYS = 7;

function getAnthropic() {
  return new Anthropic({
    apiKey: process.env.INNER_COACH_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY,
  });
}

const HARVEST_PROMPT = `Tu es le superviseur d'un coach PNL. Tu relis une séance et tu en tires UNIQUEMENT ce qui doit devenir du concret dans le suivi de la personne : son objectif de travail, ses jalons, ses mesures, ses pratiques quotidiennes, le protocole conduit.

Tu es sévère. Tu n'inventes RIEN. Si la séance ne contient pas la matière, tu renvoies null ou un tableau vide — c'est une réponse juste et attendue. Un suivi rempli de choses que la personne n'a jamais dites est pire qu'un suivi vide.

Règles de fond :
- Un objectif n'est retenu que s'il est formulé au POSITIF, VÉRIFIABLE et SOUS SON CONTRÔLE. "Arrêter de stresser" n'est pas un objectif. "Envoyer mes devis à mon vrai prix sans me justifier" en est un.
- Une mesure est un ressenti notable de 0 à 10, nommé AVEC SES MOTS À ELLE. Sa "question" est la phrase exacte que le coach lui reposera dans deux semaines.
- Une pratique est une micro-action de moins de 5 minutes, avec un DÉCLENCHEUR concret ("avant chaque call client", "en fermant l'ordi le soir"). Pas une intention ("être plus présent").
- Une action ponctuelle ("appeler Pierre demain") n'est PAS une pratique. Ne la mets pas ici.
- Le protocole : uniquement si le coach en a réellement conduit un dans la séance, même partiellement.

Réponds UNIQUEMENT en JSON valide, sans markdown.`;

function buildHarvestUserPrompt(params: {
  userName: string;
  conversation: string;
  snapshot: CoachingSnapshot;
}): string {
  const { snapshot } = params;

  const programState = snapshot.program
    ? `Objectif en cours : "${snapshot.program.objectif}"
État présent : ${snapshot.program.etat_present || 'non renseigné'}
État désiré : ${snapshot.program.etat_desire || 'non renseigné'}
Échéance : ${snapshot.program.echeance || 'non fixée'}
Critères de réussite : ${snapshot.program.criteres_reussite.join(' · ') || 'aucun'}
Jalons : ${snapshot.milestones.map((m) => `${m.done ? '[fait]' : '[à faire]'} ${m.label}`).join(' · ') || 'aucun'}`
    : 'AUCUN PARCOURS ACTIF. Si la séance a fait émerger un objectif de travail clair, c\'est le moment de le poser.';

  const measuresState = snapshot.measures.length > 0
    ? snapshot.measures.map((m) => `- "${m.label}" (${m.direction === 'up' ? 'à faire monter' : 'à faire baisser'}, dernier relevé ${m.last ? `${m.last.value}/10` : 'aucun'})`).join('\n')
    : 'Aucune mesure définie.';

  const practicesState = snapshot.practices.length > 0
    ? snapshot.practices.map((p) => `- "${p.label}" (${p.cadence}, série ${p.streak})`).join('\n')
    : 'Aucune pratique en cours.';

  const runsState = snapshot.recentRuns.length > 0
    ? snapshot.recentRuns.map((r) => `- ${r.protocol_id} le ${new Date(r.ran_at).toLocaleDateString('fr-FR')} sur "${r.sujet || '?'}"${r.revisited ? ' (déjà réévalué)' : ''}`).join('\n')
    : 'Aucun protocole conduit récemment.';

  return `## Personne : ${params.userName}

## Son parcours aujourd'hui
${programState}

## Ses mesures
${measuresState}

## Ses pratiques
${practicesState}

## Protocoles récents
${runsState}

## Protocoles PNL existants (pour identifier celui qui a été conduit)
${buildProtocolCatalog()}

## La séance à dépouiller
${params.conversation}

## RÉPONDS EN JSON, STRUCTURE EXACTE
{
  "program": {
    "objectif": "objectif bien formulé dans ses mots, ou null",
    "pourquoi_maintenant": "ce qui rend ce travail urgent pour elle, ou null",
    "etat_present": "où elle en est aujourd'hui, factuel, ou null",
    "etat_desire": "à quoi ça ressemblera quand ce sera là, sensoriel, ou null",
    "criteres_reussite": ["à quoi elle saura que c'est gagné"],
    "duree_semaines": 10,
    "revise_objectif": false
  },
  "milestones_new": ["jalon intermédiaire concret"],
  "milestones_done": ["libellé d'un jalon existant franchi dans cette séance"],
  "measures_new": [
    {"label": "ses mots", "question": "la question exacte à reposer", "direction": "up", "baseline": 4, "cible": 8}
  ],
  "measure_readings": [{"label": "libellé d'une mesure EXISTANTE", "value": 6, "note": null}],
  "practices_new": [
    {"label": "micro-action", "pourquoi": "à quoi ça sert", "declencheur": "quand exactement", "cadence": "daily", "protocol_id": null}
  ],
  "protocol_run": {
    "protocol_id": "id du protocole conduit",
    "sujet": "sur quoi",
    "resultat": "ce que ça a produit, en une phrase",
    "intensite_avant": 8,
    "intensite_apres": 4,
    "revisit_in_days": 7
  },
  "protocols_revisited": [{"protocol_id": "id", "note": "ce que le retest a donné"}]
}

Contraintes :
- "program" : null si la séance n'apporte rien sur l'objectif. Si un parcours existe déjà, ne remplis que ce qui le PRÉCISE, et ne mets "revise_objectif" à true que si la séance a explicitement changé de cap.
- "measures_new" : 0 à 2, jamais un doublon d'une mesure existante.
- "measure_readings" : uniquement si elle a donné un chiffre (ou l'équivalent explicite) pendant la séance, sur une mesure qui EXISTE déjà.
- "practices_new" : 0 à 2 maximum. Mieux vaut une pratique tenue que trois abandonnées.
- "protocol_run" : null si aucun protocole n'a été conduit. "revisit_in_days" = 7 par défaut, 3 pour un ancrage, 14 pour un travail de croyance.
- "cadence" ∈ daily | weekdays | weekly.`;
}

export async function extractHarvest(params: {
  userName: string;
  messages: Message[];
  snapshot: CoachingSnapshot;
}): Promise<SessionHarvest> {
  const empty: SessionHarvest = {
    program: null,
    milestones_new: [],
    milestones_done: [],
    measures_new: [],
    measure_readings: [],
    practices_new: [],
    protocol_run: null,
    protocols_revisited: [],
  };

  const conversation = params.messages
    .map((m) => `${m.role === 'user' ? params.userName : 'Coach'}: ${m.content}`)
    .join('\n\n');

  if (conversation.length < 200) return empty;

  try {
    const response = await getAnthropic().messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 1600,
      system: HARVEST_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildHarvestUserPrompt({ userName: params.userName, conversation, snapshot: params.snapshot }),
        },
      ],
    });

    const block = response.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') return empty;

    const parsed = parseModelJson<Record<string, unknown>>(block.text);
    if (!parsed) {
      console.error('Harvest: unparseable model response');
      return empty;
    }

    return {
      program: normalizeProgram(parsed.program),
      milestones_new: stringArray(parsed.milestones_new, 4),
      milestones_done: stringArray(parsed.milestones_done, 4),
      measures_new: normalizeMeasures(parsed.measures_new),
      measure_readings: normalizeReadings(parsed.measure_readings),
      practices_new: normalizePractices(parsed.practices_new),
      protocol_run: normalizeRun(parsed.protocol_run),
      protocols_revisited: normalizeRevisited(parsed.protocols_revisited),
    };
  } catch (error) {
    console.error('Harvest extraction error:', error);
    return empty;
  }
}

// ─── ÉCRITURE ───────────────────────────────────────────────────────────────

export interface HarvestResult {
  program_created: boolean;
  program_updated: boolean;
  milestones_added: number;
  milestones_done: number;
  measures_added: number;
  readings_added: number;
  practices_added: number;
  protocol_logged: boolean;
  protocols_revisited: number;
}

export async function applyHarvest(
  supabase: SupabaseClient<Database>,
  userId: string,
  sessionId: string | null,
  harvest: SessionHarvest,
  snapshot: CoachingSnapshot
): Promise<HarvestResult> {
  const result: HarvestResult = {
    program_created: false,
    program_updated: false,
    milestones_added: 0,
    milestones_done: 0,
    measures_added: 0,
    readings_added: 0,
    practices_added: 0,
    protocol_logged: false,
    protocols_revisited: 0,
  };

  let programId = snapshot.program?.id ?? null;

  // ── Parcours ──────────────────────────────────────────────────────────────
  if (harvest.program) {
    const h = harvest.program;
    const echeance = h.duree_semaines
      ? new Date(Date.now() + h.duree_semaines * 7 * 86400000).toISOString().slice(0, 10)
      : null;

    if (!programId && h.objectif) {
      const { data, error } = await supabase
        .from('programs')
        .insert({
          user_id: userId,
          objectif: h.objectif,
          pourquoi_maintenant: h.pourquoi_maintenant,
          etat_present: h.etat_present,
          etat_desire: h.etat_desire,
          criteres_reussite: h.criteres_reussite,
          echeance,
        })
        .select('id')
        .single();

      if (error) console.warn('Harvest: program insert failed:', error.message);
      else {
        programId = data.id;
        result.program_created = true;
      }
    } else if (programId) {
      // On ne complète que ce qui manque. Un objectif ne se réécrit pas à chaque
      // séance : il faut que la séance ait explicitement changé de cap.
      const current = snapshot.program!;
      const patch: Database['public']['Tables']['programs']['Update'] = {};

      if (h.revise_objectif && h.objectif && h.objectif !== current.objectif) patch.objectif = h.objectif;
      if (!current.pourquoi_maintenant && h.pourquoi_maintenant) patch.pourquoi_maintenant = h.pourquoi_maintenant;
      if (!current.etat_present && h.etat_present) patch.etat_present = h.etat_present;
      if (!current.etat_desire && h.etat_desire) patch.etat_desire = h.etat_desire;
      if (current.criteres_reussite.length === 0 && h.criteres_reussite.length > 0) {
        patch.criteres_reussite = h.criteres_reussite;
      }
      if (!current.echeance && echeance) patch.echeance = echeance;

      if (Object.keys(patch).length > 0) {
        const { error } = await supabase.from('programs').update(patch).eq('id', programId);
        if (error) console.warn('Harvest: program update failed:', error.message);
        else result.program_updated = true;
      }
    }
  }

  // ── Jalons ────────────────────────────────────────────────────────────────
  if (programId && harvest.milestones_new.length > 0) {
    const existing = new Set(snapshot.milestones.map((m) => norm(m.label)));
    const toAdd = harvest.milestones_new.filter((l) => !existing.has(norm(l)));
    if (toAdd.length > 0) {
      const maxOrdre = snapshot.milestones.reduce((max, m) => Math.max(max, m.ordre), 0);
      const { error } = await supabase.from('program_milestones').insert(
        toAdd.map((label, i) => ({
          program_id: programId as string,
          user_id: userId,
          label,
          ordre: maxOrdre + i + 1,
        }))
      );
      if (error) console.warn('Harvest: milestones insert failed:', error.message);
      else result.milestones_added = toAdd.length;
    }
  }

  for (const label of harvest.milestones_done) {
    const match = snapshot.milestones.find((m) => !m.done && looseMatch(m.label, label));
    if (!match) continue;
    const { error } = await supabase
      .from('program_milestones')
      .update({ done: true, done_at: new Date().toISOString() })
      .eq('id', match.id);
    if (!error) result.milestones_done++;
  }

  // ── Mesures ───────────────────────────────────────────────────────────────
  const activeMeasures = snapshot.measures.length;
  const roomForMeasures = Math.max(0, MAX_ACTIVE_MEASURES - activeMeasures);
  if (roomForMeasures > 0 && harvest.measures_new.length > 0) {
    const existing = new Set(snapshot.measures.map((m) => norm(m.label)));
    const toAdd = harvest.measures_new
      .filter((m) => !existing.has(norm(m.label)))
      .slice(0, roomForMeasures);

    if (toAdd.length > 0) {
      const { data, error } = await supabase
        .from('measures')
        .insert(
          toAdd.map((m) => ({
            user_id: userId,
            program_id: programId,
            label: m.label,
            question: m.question,
            direction: m.direction,
            baseline: m.baseline,
            cible: m.cible,
          }))
        )
        .select('id, baseline');

      if (error) console.warn('Harvest: measures insert failed:', error.message);
      else {
        result.measures_added = data.length;
        // La baseline est un relevé : sans ça la courbe démarre dans le vide.
        const withBaseline = data.filter((m) => m.baseline !== null);
        if (withBaseline.length > 0) {
          await supabase.from('measure_entries').insert(
            withBaseline.map((m) => ({
              measure_id: m.id,
              user_id: userId,
              value: m.baseline as number,
              source: 'session' as const,
              note: 'Point de départ',
            }))
          );
        }
      }
    }
  }

  // ── Relevés donnés pendant la séance ──────────────────────────────────────
  for (const reading of harvest.measure_readings) {
    const match = snapshot.measures.find((m) => looseMatch(m.label, reading.label));
    if (!match) continue;
    // Pas deux relevés le même jour sur la même mesure.
    const alreadyToday =
      match.last && new Date(match.last.recorded_at).toDateString() === new Date().toDateString();
    if (alreadyToday) continue;

    const { error } = await supabase.from('measure_entries').insert({
      measure_id: match.id,
      user_id: userId,
      value: reading.value,
      note: reading.note,
      source: 'session',
    });
    if (!error) result.readings_added++;
  }

  // ── Pratiques ─────────────────────────────────────────────────────────────
  const roomForPractices = Math.max(0, MAX_ACTIVE_PRACTICES - snapshot.practices.length);
  if (roomForPractices > 0 && harvest.practices_new.length > 0) {
    const existing = new Set(snapshot.practices.map((p) => norm(p.label)));
    const toAdd = harvest.practices_new
      .filter((p) => !existing.has(norm(p.label)))
      .slice(0, roomForPractices);

    if (toAdd.length > 0) {
      const { error } = await supabase.from('practices').insert(
        toAdd.map((p) => ({
          user_id: userId,
          program_id: programId,
          label: p.label,
          pourquoi: p.pourquoi,
          declencheur: p.declencheur,
          cadence: p.cadence,
          target_per_week: p.cadence === 'weekly' ? 1 : p.cadence === 'weekdays' ? 5 : 7,
          protocol_id: p.protocol_id,
        }))
      );
      if (error) console.warn('Harvest: practices insert failed:', error.message);
      else result.practices_added = toAdd.length;
    }
  }

  // ── Protocole conduit ─────────────────────────────────────────────────────
  if (harvest.protocol_run) {
    const run = harvest.protocol_run;
    const revisitDays = run.revisit_in_days ?? DEFAULT_REVISIT_DAYS;
    const { error } = await supabase.from('protocol_runs').insert({
      user_id: userId,
      session_id: sessionId,
      protocol_id: run.protocol_id,
      sujet: run.sujet,
      resultat: run.resultat,
      intensite_avant: run.intensite_avant,
      intensite_apres: run.intensite_apres,
      revisit_at: new Date(Date.now() + revisitDays * 86400000).toISOString().slice(0, 10),
    });
    if (error) console.warn('Harvest: protocol run insert failed:', error.message);
    else result.protocol_logged = true;
  }

  // ── Protocoles réévalués ──────────────────────────────────────────────────
  for (const rev of harvest.protocols_revisited) {
    const match = snapshot.recentRuns.find((r) => !r.revisited && r.protocol_id === rev.protocol_id);
    if (!match) continue;
    const { error } = await supabase
      .from('protocol_runs')
      .update({ revisited: true, revisit_note: rev.note })
      .eq('id', match.id);
    if (!error) result.protocols_revisited++;
  }

  return result;
}

// ─── NORMALISATION ──────────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function looseMatch(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  if (!t || t.toLowerCase() === 'null' || t.toLowerCase() === 'non renseigné') return null;
  return t;
}

function intOrNull(value: unknown, min: number, max: number): number | null {
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function normalizeProgram(value: unknown): SessionHarvest['program'] {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const objectif = text(v.objectif);
  const others = [text(v.pourquoi_maintenant), text(v.etat_present), text(v.etat_desire)];
  const criteres = stringArray(v.criteres_reussite, 5);

  if (!objectif && others.every((o) => o === null) && criteres.length === 0) return null;

  return {
    objectif,
    pourquoi_maintenant: others[0],
    etat_present: others[1],
    etat_desire: others[2],
    criteres_reussite: criteres,
    duree_semaines: intOrNull(v.duree_semaines, 2, 52),
    revise_objectif: v.revise_objectif === true,
  };
}

function normalizeMeasures(value: unknown): SessionHarvest['measures_new'] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const m = raw as Record<string, unknown>;
      const label = text(m.label);
      if (!label) return null;
      return {
        label: label.slice(0, 80),
        question: text(m.question) || `Où tu en es sur « ${label} », de 0 à 10 ?`,
        direction: oneOf(m.direction, ['up', 'down'] as const, 'up'),
        baseline: intOrNull(m.baseline, 0, 10),
        cible: intOrNull(m.cible, 0, 10),
      };
    })
    .filter((m): m is SessionHarvest['measures_new'][number] => m !== null)
    .slice(0, 2);
}

function normalizeReadings(value: unknown): SessionHarvest['measure_readings'] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const r = raw as Record<string, unknown>;
      const label = text(r.label);
      const val = intOrNull(r.value, 0, 10);
      if (!label || val === null) return null;
      return { label, value: val, note: text(r.note) };
    })
    .filter((r): r is SessionHarvest['measure_readings'][number] => r !== null)
    .slice(0, 4);
}

function normalizePractices(value: unknown): SessionHarvest['practices_new'] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const p = raw as Record<string, unknown>;
      const label = text(p.label);
      if (!label) return null;
      const protocolId = text(p.protocol_id);
      return {
        label: label.slice(0, 120),
        pourquoi: text(p.pourquoi),
        declencheur: text(p.declencheur),
        cadence: oneOf(p.cadence, ['daily', 'weekdays', 'weekly'] as const, 'daily') as PracticeCadence,
        protocol_id: protocolId && (PROTOCOL_IDS as string[]).includes(protocolId) ? protocolId : null,
      };
    })
    .filter((p): p is SessionHarvest['practices_new'][number] => p !== null)
    .slice(0, 2);
}

function normalizeRun(value: unknown): SessionHarvest['protocol_run'] {
  if (!value || typeof value !== 'object') return null;
  const r = value as Record<string, unknown>;
  const id = text(r.protocol_id);
  if (!id || !(PROTOCOL_IDS as string[]).includes(id)) return null;
  return {
    protocol_id: id as ProtocolId,
    sujet: text(r.sujet),
    resultat: text(r.resultat),
    intensite_avant: intOrNull(r.intensite_avant, 0, 10),
    intensite_apres: intOrNull(r.intensite_apres, 0, 10),
    revisit_in_days: intOrNull(r.revisit_in_days, 1, 60),
  };
}

function normalizeRevisited(value: unknown): SessionHarvest['protocols_revisited'] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const r = raw as Record<string, unknown>;
      const id = text(r.protocol_id);
      if (!id || !(PROTOCOL_IDS as string[]).includes(id)) return null;
      return { protocol_id: id, note: text(r.note) };
    })
    .filter((r): r is SessionHarvest['protocols_revisited'][number] => r !== null)
    .slice(0, 3);
}

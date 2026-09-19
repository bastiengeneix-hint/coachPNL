// ─── PROTOCOLES ─────────────────────────────────────────────────────────────
// Des séquences guidées pas à pas, pas un vocabulaire. Le coach doit savoir
// CONDUIRE, pas seulement nommer.
//
// Sur les sources : on garde la forme PNL (bon découpage pédagogique) mais
// seulement les protocoles dont le mécanisme tient debout ailleurs que dans la
// littérature PNL — recadrage ≈ restructuration cognitive (TCC), parties en
// conflit ≈ travail de l'ambivalence (entretien motivationnel), ligne du temps
// ≈ projection épisodique et contraste mental, objectif bien formulé ≈ fixation
// d'objectifs + WOOP.
// Retirés le 2026-09-19 : `swish` et `submodalites`, dont les mécanismes
// revendiqués ne sont étayés par aucune donnée sérieuse. Les séances déjà
// enregistrées avec ces identifiants restent lisibles (repli sur l'id brut).
//
// Ici chaque protocole est décomposé en étapes. Le superviseur en choisit UN (ou
// aucun), on n'injecte que celui-là dans le prompt du coach, avec l'étape en cours.
// Résultat : un prompt qui reste court, et un coach qui sait vraiment faire.

export type ProtocolId =
  | 'objectif_bien_forme'
  | 'ancrage_ressource'
  | 'meta_modele'
  | 'recadrage_sens'
  | 'recadrage_six_pas'
  | 'parties_en_conflit'
  | 'positions_perception'
  | 'ligne_du_temps'
  | 'niveaux_logiques'
  | 'score'
  | 'croyance_limitante'
  | 'upper_limit'
  | 'pont_vers_futur';

export interface Protocol {
  id: ProtocolId;
  nom: string;
  /** Une ligne pour le catalogue du superviseur : quand le déclencher. */
  quand: string;
  /** Ce que le protocole produit — le coach doit savoir où il va. */
  intention: string;
  /** Étapes guidées, dans l'ordre. Une étape = un message du coach, en général. */
  etapes: string[];
  /** Comment on vérifie que ça a marché, et comment on referme. */
  sortie: string;
  /** Quand NE PAS le lancer. */
  contre_indications?: string;
}

export const PROTOCOLS: Record<ProtocolId, Protocol> = {
  objectif_bien_forme: {
    id: 'objectif_bien_forme',
    nom: 'Objectif bien formulé',
    quand: 'La personne veut quelque chose mais c\'est flou, négatif ("je veux plus stresser") ou hors de son contrôle.',
    intention: 'Transformer une plainte ou un vœu vague en objectif formulé au positif, vérifiable et sous son contrôle.',
    etapes: [
      'Reformuler au POSITIF : "Tu me dis ce que tu veux plus. Qu\'est-ce que tu veux à la place ?"',
      'Rendre SENSORIEL : "Tu le verrais, tu l\'entendrais, tu le sentirais comment, quand ce sera là ? Qu\'est-ce qui serait différent concrètement ?"',
      'CONTEXTUALISER : "Où, quand, avec qui ? Et où tu ne le veux PAS ?"',
      'Vérifier le CONTRÔLE : "Qu\'est-ce que TU peux faire, toi, sans que personne d\'autre change ?"',
      'ÉCOLOGIE : "Qu\'est-ce que tu perds si tu l\'obtiens ? Ça coûte quoi, à qui ?"',
      'OBSTACLE INTÉRIEUR : "Qu\'est-ce qui, CHEZ TOI, va se mettre en travers ? Pas les circonstances — toi." Creuser jusqu\'à ce que ce soit précis et personnel. C\'est l\'étape que tout le monde saute, et c\'est celle qui fait la différence : imaginer la réussite sans regarder l\'obstacle démobilise au lieu de mobiliser.',
      'PLAN SI-ALORS : "Quand [cet obstacle précis] se présente, tu fais quoi, exactement ?" Une phrase de la forme « quand X, je fais Y ». Pas une intention : une règle.',
      'PREMIER PAS : "C\'est quoi la plus petite chose que tu peux faire dans les 48 h ?"',
    ],
    sortie: 'Faire répéter l\'objectif par la personne, dans SES mots, en une phrase. Si elle n\'y arrive pas, l\'objectif n\'est pas encore formulé.',
  },

  ancrage_ressource: {
    id: 'ancrage_ressource',
    nom: 'Ancrage d\'un état ressource',
    quand: 'La personne vient de vivre (ou de raconter) un état fort et utile : clarté, calme, fierté, courage. Ou elle a besoin d\'accès à cet état avant une échéance.',
    intention: 'Associer un état ressource à un geste, pour le rappeler à volonté.',
    etapes: [
      'Nommer l\'ÉTAT visé et le faire choisir : "De quoi t\'as besoin dans ce moment-là — du calme ? de la détermination ?"',
      'Retrouver un SOUVENIR plein de cet état : "Raconte-moi une fois où tu l\'as vraiment vécu. Une fois précise."',
      'REVIVRE au présent : "Reviens dedans. Tu es où ? Tu vois quoi ? Tu entends quoi ? Ça se passe où dans ton corps ?" — présent de l\'indicatif, ses mots à lui.',
      'AMPLIFIER : "Rends l\'image plus grande, plus proche, monte le son. Ça fait quoi ?"',
      'POSER L\'ANCRE au pic de l\'intensité : un geste simple et reproductible (pouce et index qui se serrent, poing fermé, main sur le sternum). "Maintenant, serre." Tenir 5 à 10 secondes.',
      'BRISER l\'ÉTAT : parler d\'autre chose 30 secondes, une question banale.',
      'TESTER : "Refais le geste. Qu\'est-ce qui revient ?" Si rien ne revient, reprendre à l\'étape 3 avec un souvenir plus fort.',
      'PONT VERS LE FUTUR : "La prochaine fois que [situation précise] arrive, tu fais quoi ?" — faire répéter mentalement avec l\'ancre.',
    ],
    sortie: 'Le test doit ramener l\'état. Puis une consigne d\'usage courte : où et quand s\'en servir cette semaine.',
  },

  meta_modele: {
    id: 'meta_modele',
    nom: 'Meta-Modèle (précision du langage)',
    quand: 'Le langage est flou, absolu ou porte une distorsion : "toujours", "jamais", "je dois", "ça me stresse", "il pense que", "c\'est impossible".',
    intention: 'Récupérer l\'expérience concrète derrière les mots, et fissurer les généralisations.',
    etapes: [
      'REPÉRER une seule imprécision — la plus chargée, pas toutes.',
      'QUESTIONNER avec la forme adaptée : généralisation ("toujours ? vraiment aucune fois où ça s\'est passé autrement ?") · omission ("qu\'est-ce qui exactement ? par rapport à qui ?") · nominalisation ("le manque de confiance — tu manques de confiance en quoi, quand ?") · lecture de pensée ("comment tu sais ce qu\'il pense ?") · opérateur modal ("qu\'est-ce qui se passerait si tu le faisais pas ?") · cause-effet ("en quoi ça, ça provoque ça ?").',
      'ACCUEILLIR la réponse. Ne pas enchaîner sur une deuxième question : laisser le trou se creuser.',
      'RECALIBRER : reformuler la phrase de départ avec la précision obtenue, dans SES mots.',
    ],
    sortie: 'La personne doit entendre sa phrase autrement. Si elle se justifie, c\'est qu\'on a poussé trop vite : revenir à l\'accueil.',
    contre_indications: 'Jamais en rafale. Une question Meta-Modèle par message, et seulement sur un verrou.',
  },

  recadrage_sens: {
    id: 'recadrage_sens',
    nom: 'Recadrage (contenu / contexte)',
    quand: 'La personne est enfermée dans une lecture unique d\'un événement ou d\'un trait ("je suis trop sensible", "j\'ai échoué").',
    intention: 'Changer la signification sans nier les faits.',
    etapes: [
      'VALIDER les faits d\'abord — sinon le recadrage passe pour du déni : "C\'est vrai que ça s\'est passé comme ça."',
      'Recadrage de CONTENU : "Et si ce que t\'appelles [son mot] c\'était aussi [autre lecture] ?" — une seule proposition, offerte, pas imposée.',
      'ou Recadrage de CONTEXTE : "Dans quel contexte cette qualité-là te servirait ?"',
      'TESTER l\'accueil : "Ça te fait quoi, dit comme ça ?" — si ça glisse, ne pas insister, le recadrage est raté et c\'est une info.',
    ],
    sortie: 'La personne doit reformuler elle-même le nouveau sens. Si c\'est le coach qui l\'a dit et pas elle, ça n\'a pas pris.',
    contre_indications: 'Jamais sur une émotion encore chaude, jamais sur un deuil ou une perte récente.',
  },

  recadrage_six_pas: {
    id: 'recadrage_six_pas',
    nom: 'Recadrage en six pas',
    quand: 'Un comportement répétitif que la personne n\'arrive pas à arrêter alors qu\'elle le veut : procrastination, colère qui explose, grignotage, scroll compulsif.',
    intention: 'Trouver l\'intention positive du comportement et lui donner d\'autres moyens de l\'atteindre.',
    etapes: [
      'IDENTIFIER le comportement X, précisément : "Ça se passe comment, exactement, la dernière fois ?"',
      'CONTACTER la partie responsable : "La partie de toi qui fait ça — si tu lui demandes ce qu\'elle cherche à protéger, elle répond quoi ?"',
      'INTENTION POSITIVE : faire nommer ce que le comportement obtient de bon (repos, sécurité, reconnaissance, évitement d\'un risque).',
      'GÉNÉRER 3 ALTERNATIVES qui servent la MÊME intention, proposées par la personne, pas par le coach.',
      'ÉCOLOGIE INTERNE : "Est-ce qu\'une autre part de toi a quelque chose à objecter à ces trois-là ?" — s\'il y a objection, retour à l\'étape 4.',
      'PONT VERS LE FUTUR : "La prochaine fois que ça monte, tu testes laquelle ?"',
    ],
    sortie: 'Une alternative choisie, une situation précise où la tester, et un rendez-vous pour en reparler.',
  },

  parties_en_conflit: {
    id: 'parties_en_conflit',
    nom: 'Négociation des parties',
    quand: 'Ambivalence, tiraillement : "je veux partir mais je veux rester", "une partie de moi...". L\'ambivalence est normale — c\'est même le lieu du changement. On l\'explore, on ne la tranche pas à sa place.',
    intention: 'Faire dialoguer les deux voix au lieu de laisser l\'une écraser l\'autre. Surtout : ne JAMAIS prendre le parti du changement contre la voix qui freine — la pousser dans ses retranchements la renforce, c\'est le résultat le plus constant de la recherche sur l\'ambivalence.',
    etapes: [
      'SÉPARER : "Y\'a deux voix. Donne-moi la première : elle dit quoi, avec ses mots ?" puis la seconde. Les faire parler l\'une après l\'autre, jamais en même temps.',
      'INTENTION de chacune : "Qu\'est-ce que celle-là veut pour toi, au fond ?" — remonter jusqu\'à ce que les deux intentions soient respectables.',
      'RECONNAISSANCE mutuelle : "Est-ce que celle qui veut la sécurité peut reconnaître que l\'autre te tient en vie ?"',
      'RESSOURCES : "Qu\'est-ce que chacune a que l\'autre n\'a pas ?"',
      'INTÉGRATION : "Si elles devaient bosser ensemble sur le même objectif, elles feraient quoi cette semaine ?"',
    ],
    sortie: 'Une décision ou un pas concret qui honore les deux intentions. Pas un arbitrage où l\'une perd.',
  },

  positions_perception: {
    id: 'positions_perception',
    nom: 'Positions de perception',
    quand: 'Conflit relationnel, rancune, incompréhension avec quelqu\'un de précis, ou conversation difficile à préparer.',
    intention: 'Sortir de sa propre bulle sans se renier, et récupérer de l\'information sur le système.',
    etapes: [
      '1re POSITION (soi) : "Dans cette scène, toi, tu ressens quoi ? Tu veux quoi ?"',
      '2e POSITION (l\'autre) : "Mets-toi à sa place. Tu es [prénom]. Qu\'est-ce que tu vois de l\'autre côté ? Qu\'est-ce que tu cherches ?" — le faire parler en JE.',
      '3e POSITION (observateur) : "Maintenant regarde les deux de l\'extérieur, comme une scène de film. Qu\'est-ce que tu remarques, que ni l\'un ni l\'autre ne voit ?"',
      'RETOUR en 1re position avec ce qui a été récolté : "Avec ça, tu fais quoi de différent ?"',
    ],
    sortie: 'Une phrase que la personne va dire, ou une intention nouvelle pour le prochain échange réel.',
  },

  ligne_du_temps: {
    id: 'ligne_du_temps',
    nom: 'Ligne du temps',
    quand: 'Anxiété d\'anticipation, décision qui paralyse, ou besoin de clarifier une direction.',
    intention: 'Prendre du recul temporel et ramener les ressources du futur dans le présent.',
    etapes: [
      'ANCRER le PRÉSENT : "Là, aujourd\'hui, tu en es où sur cette question ?"',
      'SE PROJETER : "Imagine-toi dans 6 mois. T\'as pris cette décision. Tu es où, tu fais quoi ?" — faire décrire au présent, sensoriellement.',
      'REGARDER EN ARRIÈRE depuis le futur : "De là-bas, regarde le toi d\'aujourd\'hui. Qu\'est-ce que tu lui dis ?"',
      'L\'AUTRE BRANCHE : "Et si tu la prends pas, dans 6 mois, tu es où ?" — sans dramatiser, juste regarder.',
      'RAMENER : "Reviens à aujourd\'hui. Tu gardes quoi de ce que tu viens de voir ?"',
    ],
    sortie: 'Un choix clarifié, ou au minimum le critère qui manquait pour choisir.',
  },

  niveaux_logiques: {
    id: 'niveaux_logiques',
    nom: 'Niveaux logiques (Dilts)',
    quand: 'La personne s\'attaque au problème au mauvais étage : elle change ses outils quand c\'est une croyance, ou se remet en cause en identité quand c\'est un comportement.',
    intention: 'Situer le blocage au bon niveau et intervenir là.',
    etapes: [
      'BALAYER les niveaux sur son sujet : environnement (où, avec qui) → comportement (ce qu\'elle fait) → capacités (ce qu\'elle sait faire) → croyances et valeurs (ce qui compte, ce qu\'elle croit possible) → identité (qui elle est) → mission (au service de quoi).',
      'REPÉRER l\'étage où ça coince vraiment : "Quand tu dis \'je suis pas quelqu\'un qui...\', on est sur qui tu es. C\'est vraiment là que ça bloque, ou c\'est un truc que t\'as pas encore appris à faire ?"',
      'DÉGONFLER les confusions d\'étage : un échec de comportement n\'est pas un défaut d\'identité. Le nommer explicitement.',
      'INTERVENIR au bon niveau, et le dire : "Donc on travaille pas ta méthode, on travaille ce que tu crois possible."',
    ],
    sortie: 'La personne sait à quel étage se joue son problème. C\'est souvent le soulagement principal.',
  },

  score: {
    id: 'score',
    nom: 'SCORE (cadrage d\'un problème complexe)',
    quand: 'Le sujet est gros, embrouillé, plusieurs fils mêlés — on ne sait pas par où prendre.',
    intention: 'Cartographier avant d\'agir.',
    etapes: [
      'SYMPTÔME : "Ce qui se voit, ce qui te gêne aujourd\'hui, c\'est quoi ?"',
      'CAUSE : "Et ça a commencé quand ? Il s\'est passé quoi avant ?"',
      'OBJECTIF : "Tu veux quoi à la place ?" (bien formulé, au positif)',
      'RESSOURCES : "Qu\'est-ce que t\'as déjà — des gens, des compétences, des fois où t\'as su faire ?"',
      'EFFETS : "Et quand ce sera réglé, ça change quoi dans ta vie, dans 6 mois ?"',
    ],
    sortie: 'Restituer la carte en 4 phrases, et demander où elle veut commencer.',
  },

  croyance_limitante: {
    id: 'croyance_limitante',
    nom: 'Travail de croyance limitante',
    quand: 'Une phrase-verrou revient : "je suis pas légitime", "je mérite pas", "les gens comme moi...".',
    intention: 'Desserrer la croyance sans la combattre de front.',
    etapes: [
      'ÉNONCER la croyance dans SES mots exacts, et le lui faire entendre : "Ta phrase, c\'est : \'...\'. C\'est ça ?"',
      'SOURCER : "Elle vient d\'où ? Tu l\'as entendue dans quelle bouche la première fois ?" — souvent ce n\'est pas la sienne.',
      'CONTRE-EXEMPLES : "Une fois, une seule, où c\'était pas vrai ?" Puis une deuxième. Ne pas lâcher sur ce point.',
      'COÛT : "Elle t\'a coûté quoi, cette croyance, jusqu\'ici ? Et elle t\'a protégé de quoi ?" (les deux)',
      'ALTERNATIVE : "Qu\'est-ce que tu pourrais croire à la place, que tu croirais vraiment ?" — crédible, pas une affirmation positive creuse.',
      'EXPÉRIENCE À TENTER : construire ensemble un test concret et daté dont le résultat départagera l\'ancienne et la nouvelle croyance. "Qu\'est-ce que tu pourrais FAIRE cette semaine dont le résultat te dirait laquelle des deux est vraie ?" Faire PRÉDIRE à l\'avance ce que l\'ancienne croyance annonce, puis comparer avec ce qui se passe vraiment. C\'est ça qui fait bouger une croyance — pas la discussion.',
    ],
    sortie: 'Une croyance alternative formulée par la personne + une expérience datée à mener dans le réel, avec sa prédiction notée avant.',
  },

  upper_limit: {
    id: 'upper_limit',
    nom: 'Upper Limit Problem (Hendricks)',
    quand: 'Sabotage juste après un succès, plafond de verre, "ça allait trop bien", dispute déclenchée après une bonne nouvelle.',
    intention: 'Faire voir le thermostat intérieur et la barrière cachée qui le règle.',
    etapes: [
      'REPÉRER la séquence : "Il s\'est passé quoi juste AVANT que tu te mettes à tout casser ? Qu\'est-ce qui allait bien ?"',
      'NOMMER le thermostat : la sensation de bien-être monte, une alarme se déclenche, un comportement le fait redescendre.',
      'IDENTIFIER la barrière cachée parmi les quatre : « je suis fondamentalement défaillant » · « réussir c\'est trahir / abandonner les miens » · « je suis un fardeau » · « si je brille, j\'éteins les autres ». Laisser choisir, ne pas asséner.',
      'ZONE : situer où elle joue — incompétence, compétence, excellence, génie — et ce qui l\'empêche de monter d\'un cran.',
      'MANTRA D\'EXPANSION : construire avec la personne une phrase qui soit vraiment la sienne ("j\'accueille de plus en plus de succès et de plaisir dans ma vie"), et un signal corporel pour repérer l\'alarme la prochaine fois.',
    ],
    sortie: 'La barrière nommée, et le signal d\'alarme repérable. C\'est tout, et c\'est énorme.',
  },

  pont_vers_futur: {
    id: 'pont_vers_futur',
    nom: 'Pont vers le futur',
    quand: 'Fin de séance, ou juste après une prise de conscience : il faut l\'attacher à du réel sinon elle s\'évapore.',
    intention: 'Transformer l\'insight en comportement daté.',
    etapes: [
      'RÉCAPITULER ce qui s\'est joué, en 2 phrases, avec SES mots.',
      'ANCRER dans une situation PRÉCISE : "La prochaine fois que tu vas te retrouver dans [situation réelle, datée], ça va se passer comment ?"',
      'RÉPÉTITION MENTALE : la faire dérouler la scène à la première personne, au présent.',
      'OBSTACLE : "Qu\'est-ce qui pourrait t\'empêcher de le faire ? Et là, tu fais quoi ?"',
      'ENGAGEMENT : une action, une date, et à qui elle en rend compte (à toi, à la prochaine séance). Formule-la en « quand X, je fais Y » plutôt qu\'en « je vais essayer de » — une intention attachée à un moment précis de la journée se tient, une bonne résolution non.',
    ],
    sortie: 'Une action concrète, datée, formulée par la personne. Sinon la séance reste une conversation agréable.',
  },
};

export const PROTOCOL_IDS = Object.keys(PROTOCOLS) as ProtocolId[];

/** Catalogue compact pour le superviseur : il choisit un id, il ne voit pas les étapes. */
export function buildProtocolCatalog(): string {
  return PROTOCOL_IDS.map((id) => `- ${id} — ${PROTOCOLS[id].nom} : ${PROTOCOLS[id].quand}`).join('\n');
}

export function getProtocol(id: string | null | undefined): Protocol | null {
  if (!id) return null;
  return PROTOCOLS[id as ProtocolId] ?? null;
}

/**
 * Bloc injecté dans le prompt du coach quand un protocole est en cours.
 * On donne toutes les étapes (il doit voir où il va) mais on pointe celle du moment.
 */
export function buildProtocolBlock(protocol: Protocol, step: number): string {
  const current = Math.min(Math.max(step, 1), protocol.etapes.length);

  const etapes = protocol.etapes
    .map((e, i) => {
      const n = i + 1;
      if (n < current) return `~~${n}. ${e}~~ (déjà fait)`;
      if (n === current) return `➤ ${n}. ${e}   ← TU EN ES LÀ, MAINTENANT`;
      return `${n}. ${e}`;
    })
    .join('\n');

  const parts = [
    `## Protocole en cours : ${protocol.nom} (étape ${current}/${protocol.etapes.length})`,
    '',
    `Pourquoi : ${protocol.intention}`,
    '',
    etapes,
    '',
    `Sortie : ${protocol.sortie}`,
  ];

  if (protocol.contre_indications) {
    parts.push('', `Attention : ${protocol.contre_indications}`);
  }

  parts.push(
    '',
    `RÈGLES DE CONDUITE DU PROTOCOLE :`,
    `- « la personne » dans les étapes, c'est celui que tu as en face. Tu lui parles directement, avec son prénom et son genre à lui.`,
    `- UNE étape par message. Tu ne déroules pas le protocole en un bloc, tu le conduis.`,
    `- Tu ne nommes JAMAIS le protocole ni son numéro d'étape. Pas de "on va faire un ancrage en 8 étapes".`,
    `- Tu attends sa réponse avant d'avancer. Si sa réponse est vague, tu reprends l'étape au lieu de passer à la suivante.`,
    `- S'il décroche, s'agace ou part ailleurs : tu abandonnes le protocole et tu le suis. La personne passe avant la technique.`,
    `- Si la consigne de ce message (plus bas) demande autre chose qu'avancer dans le protocole, tu suis la consigne. Le protocole attend, il ne commande pas.`
  );

  return parts.join('\n');
}

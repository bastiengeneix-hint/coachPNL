// ─── FILET DE SÉCURITÉ ──────────────────────────────────────────────────────
// Un coach qui creuse les blocages tombe un jour sur autre chose qu'un blocage.
// Il n'y avait rien pour ça : le coach pouvait enchaîner sur une technique PNL
// au-dessus d'une détresse réelle.
//
// Deux niveaux : `detresse` (on ralentit, on accueille, aucune technique) et
// `crise` (danger pour la personne — on lâche tout le reste et on oriente).
// Détection double : le superviseur décide, ET un filtre local ici qui prime
// toujours, pour que ça tienne même si l'appel au superviseur échoue.

export type RiskLevel = 'none' | 'detresse' | 'crise';

const CRISE_PATTERNS: RegExp[] = [
  /\b(me suicider|suicidaire|suicide|me tuer|plus envie de vivre|idées? noires?)\b/i,
  /\b(envie de mourir|je veux mourir|mieux si j'?étais (mort|morte))\b/i,
  /\bme (faire|fais|ferais) du mal\b/i,
  /\b(m'?automutil|me scarif|me couper les veines)\b/i,
  /\b(passer à l'?acte|mettre fin à mes jours)\b/i,
  // « en finir » : seulement quand l'objet est la vie, ou sans objet du tout.
  // « en finir avec ce projet » n'est pas une crise.
  /\ben finir\s+avec\s+(la vie|ma vie|cette vie|tout ça|tout)\b/i,
  /\benvie d'?en finir\b/i,
  /\ben finir\b\s*[.!?…]*$/i,
  // Violences subies : on ne présuppose pas qui frappe. On exclut « ça me frappe ».
  /(?<!ça |cela |ce qui |qui )\bme (frappe|frappait|bat|battait|violente|viole|tape dessus)\b/i,
  /\b(je vais (le|la|les) tuer|faire du mal à quelqu'?un)\b/i,
];

const DETRESSE_PATTERNS: RegExp[] = [
  /\b(je (n'?en peux plus|craque|m'?effondre)|au bout du rouleau|à bout)\b/i,
  /\b(crise d'?angoisse|panique totale|je tremble|je peux plus respirer)\b/i,
  /\b(dépression|dépressif|dépressive|je touche le fond|plus aucune envie)\b/i,
  /\b(je pleure (tout le temps|sans arrêt)|je dors plus depuis)\b/i,
];

/** Filtre local, sans modèle. Ne remplace pas le superviseur, il le double. */
export function screenRisk(text: string): RiskLevel {
  if (!text) return 'none';
  if (CRISE_PATTERNS.some((re) => re.test(text))) return 'crise';
  if (DETRESSE_PATTERNS.some((re) => re.test(text))) return 'detresse';
  return 'none';
}

/** Le plus grave des deux gagne, toujours. */
export function mergeRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  const order: RiskLevel[] = ['none', 'detresse', 'crise'];
  return order[Math.max(order.indexOf(a), order.indexOf(b))];
}

export function buildSafetyBlock(risk: RiskLevel, userName: string): string {
  if (risk === 'crise') {
    return `## ⚠️ PRIORITÉ ABSOLUE — CE MESSAGE PASSE AVANT TOUT LE RESTE

Ce que ${userName} vient de dire touche à sa sécurité. Tu oublies la stratégie, la phase, le protocole, les livres. Tout.

Dans ce message :
1. Tu restes. Tu nommes ce que tu entends, simplement, sans le minimiser et sans dramatiser. Pas de "je comprends", pas de technique.
2. Tu demandes directement et calmement s'il est en sécurité là, maintenant.
3. Tu dis clairement que tu ne peux pas porter ça seul avec lui, et que des humains formés existent pour ça — en France : le **3114** (gratuit, 24h/24, écoute par des professionnels du soin), le **15** ou le **112** en cas d'urgence immédiate.
4. Tu l'encourages à parler à quelqu'un de son entourage, ce soir, pas plus tard.
5. Aucun exercice, aucun objectif, aucune action à faire. Aucune question de coaching.

Ton : sobre, chaud, présent. Court. Tu ne fais pas la leçon et tu ne l'abandonnes pas.`;
  }

  if (risk === 'detresse') {
    return `## Attention — ${userName} est en souffrance forte

Tu ralentis tout. Ce message ne contient AUCUNE technique, AUCUN protocole, AUCUN exercice, AUCUN concept de livre.

Tu accueilles, tu nommes ce que tu entends, tu ramènes au présent et au corps si ça déborde (respirer, sentir ses pieds, boire un verre d'eau). Une phrase courte, une question simple au maximum — ou pas de question du tout.

Si ça dure ou si ça s'aggrave, tu dis sans détour qu'un médecin ou un psy, c'est pas un échec, c'est le bon outil. Tu ne diagnostiques rien et tu ne donnes aucun avis médical.`;
  }

  return '';
}

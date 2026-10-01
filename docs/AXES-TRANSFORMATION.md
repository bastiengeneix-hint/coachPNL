# Du coach qui ne se trompe plus au coach qui transforme

Axes d'amélioration, 2026-10-01.

## D'où viennent ces axes, et ce qui manque encore

**Les séances elles-mêmes n'ont pas été lues.** La base Supabase du coach n'est pas dans
l'organisation à laquelle la session d'analyse avait accès, et les logs Vercel ne gardent que la
stratégie choisie à chaque message, sans le texte. Les axes ci-dessous viennent donc de deux
sources :

1. Le code du coach : superviseur, prompt, protocoles, arc, récolte, analyse, suivi.
2. Les trois séances de prod décrites dans l'historique git (PR #21, #23, #24) :
   - la séance du 18/09 au matin, où le coach enchaîne observation → demande de comptes →
     confrontation → confrontation, avec le même point de suivi forcé quatre fois (« un huissier ») ;
   - la séance du 19/09 au soir, avec 50 minutes passées en phase « clôture » et trois propositions
     d'exercice en trois messages ;
   - une séance de deux heures où cinq protocoles sont lancés et aucun n'est mené à son terme.

Pour relier chaque axe au problème réellement exposé en séance, il faut les transcriptions :
`scripts/export-seances.sql`, à lancer dans le SQL Editor du projet du coach (lecture seule,
testé sur une base locale). Il sort une seule cellule avec toutes les séances, le profil, le
parcours, les mesures et les protocoles. La dernière section liste ce qu'on y cherchera.

## Le diagnostic

Les cinq derniers jours ont appris au coach à **ne plus mal faire** : ne plus demander des comptes
d'entrée, ne plus radoter, ne plus sauter d'un protocole à l'autre, ne plus refermer trop tôt.
Chaque correction était juste. Mais aucune ne lui apprend à **transformer**.

Sur un problème qui résiste, ce qui produit un changement durable tient en trois choses que le
système n'a pas encore :

1. **Une compréhension écrite et partagée de la boucle** qui entretient le problème. Aujourd'hui,
   la mémoire du coach est faite de fragments.
2. **Des expériences menées dans la vraie vie** entre deux séances, construites sur cette boucle
   puis débriefées. Aujourd'hui, une séance produit des intentions.
3. **Un retour mesuré** qui dit si ça bouge, à la personne comme au coach. Aujourd'hui, le coach
   ne sait jamais si son approche fonctionne pour cette personne.

Les axes 1 à 3 construisent ces trois choses. Les axes 4 à 8 retirent ce qui les empêcherait de
fonctionner.

---

## Axe 1 — La carte du problème : une seule compréhension, écrite, que la personne corrige

**Constat.** Ce que le coach sait de la personne, ce sont des listes : croyances, patterns,
barrières, projets, lexique (`buildProfileBlock`), des thèmes, une ligne par séance
(`buildActiveContext`). Pour l'historique, il reçoit **les 6 derniers messages** des 3 dernières
séances (`buildConversationHistoryBlock`, `msgs.slice(-6)`) : la fin de chaque séance, donc
l'atterrissage et les au revoir, pas le moment où le problème a été posé. Nulle part n'est écrit
*comment le problème fonctionne*. D'où la consigne de l'arc, à chaque séance : « tu cherches le
vrai sujet, qui n'est presque jamais celui annoncé ». Le coach le recherche à chaque fois.

**Pourquoi ça bloque.** Sans carte, chaque séance repart de l'exploration. Rien ne permet de
dire « ça fait trois semaines que c'est la même scène ». Et les expériences (axe 2) comme la
mesure (axe 3) n'ont rien à quoi s'accrocher.

**Ce qu'on change.**
- Une table `formulations` (une active par personne, versionnée) qui contient :
  - le problème, dans ses mots ;
  - la boucle : déclencheur → ce qu'elle se dit → ce qu'elle ressent (et où dans le corps) → ce
    qu'elle fait → ce que ça soulage tout de suite → ce que ça coûte ensuite, et qui confirme la
    croyance de départ ;
  - ce que le problème protège (l'intention positive, déjà dans la doctrine du coach) ;
  - ce qui a déjà été tenté ;
  - les exceptions : les fois où ça ne s'est pas produit ;
  - ce qui compte pour elle derrière tout ça (valeurs).
- L'analyse de fin de séance propose un **différentiel**, pas une réécriture. La carte passe en
  tête du prompt contextuel et du superviseur.
- Sur `/parcours` : « Voilà comment je comprends ce qui se passe. C'est juste ? », avec un bouton
  pour corriger. Voir sa propre boucle écrite avec ses mots, et pouvoir la corriger, c'est souvent
  le premier vrai déclic. C'est aussi ce qui la rend juste.
- Dans l'historique, remplacer les 6 derniers messages par **le moment clé** de chaque séance (sa
  phrase exacte sur le problème, ce qui a bougé, ce qui a été décidé), extrait à l'analyse.

**Effort.** Moyen : une table, un bloc de prompt, un champ de plus dans l'analyse, une carte sur
`/parcours`.

---

## Axe 2 — Le changement se joue entre les séances : des expériences, pas des intentions

**Constat.** Ce qui sort d'une séance aujourd'hui : des `actions` en texte, des pratiques
(micro-habitudes avec déclencheur) et un rappel d'exercice. Le protocole `croyance_limitante` a
bien une étape « expérience à tenter », avec une prédiction à noter avant. Mais la prédiction
n'est stockée nulle part, et rien ne déclenche le débrief au bon moment. Les engagements sont
repris de façon générique (« tu demandes où ça en est, simplement »).

**Pourquoi ça bloque.** Une croyance ne bouge pas parce qu'on en parle bien, mais parce qu'on la
teste et que le réel la contredit. Les données en thérapie cognitive vont dans ce sens. Sans
prédiction écrite avant, le résultat se réinterprète après coup (« oui mais c'était un bon
jour »). Sans débrief, l'expérience ne compte pas.

**Ce qu'on change.**
- Une table `experiences` : la situation, la date, ce que la vieille croyance prédit, la
  conviction avant (0-100 %), ce qui s'est passé, la conviction après.
- Créée par la récolte quand la séance en produit une, et seulement si la prédiction a été dite.
- Le soir de la date, une notification : « Alors, ce que tu prédisais, c'est arrivé ? ». Puis un
  débrief de 30 secondes dans l'app : ce qui s'est passé, et la conviction après.
- Une **échelle** tirée de la carte (axe 1) : les situations évitées, de la plus facile à la plus
  dure, et chaque semaine une marche de plus. C'est le mécanisme qui tient le mieux sur
  l'évitement et l'auto-sabotage.
- La séance suivante s'ouvre dessus (axe 8).

**Effort.** Moyen : une table, un champ dans la récolte, un créneau dans le cron de notifications
existant, un mini-écran.

---

## Axe 3 — Mesurer si ça marche, pour la personne et pour le coach

**Constat.** Les mesures 0-10 n'existent que si la récolte en a extrait une. Aucune ne suit
explicitement *le problème exposé*. Et rien ne dit au coach si sa manière de faire convient : les
seuls retours sont ceux remontés à la main, quelques jours plus tard, dans une session de code.

**Pourquoi ça bloque.** Un coach qui ne sait pas ce qui fonctionne pour la personne ne peut pas
s'ajuster. Côté code, on corrige à l'impression : chacune des PR #21 à #24 est née d'une séance
qui s'est mal passée, remarquée après coup. En psychothérapie, le suivi systématique du résultat
et de l'alliance, renvoyé au praticien, fait partie de ce qui améliore le plus les résultats, en
particulier pour les personnes qui ne progressent pas.

**Ce qu'on change.**
- **En fin de séance, quatre curseurs, dix secondes** (sur le modèle de la Session Rating
  Scale) : je me suis senti écouté · on a parlé de ce qui compte pour moi · la façon de faire me
  convient · globalement. Les notes repartent dans le prompt suivant : en dessous de 7 sur « la
  façon de faire », le coach demande ce qu'il faut changer.
- **Une mesure de sévérité du problème**, tirée de la carte (« à quel point [le problème] a pesé
  cette semaine, de 0 à 10 »), posée chaque semaine dans le check-in et tracée sur `/parcours`.
- **Un tableau de bord coach** (admin), séance par séance : répartition des gestes (le log
  `Coach strategy:` existe déjà, il suffit de le persister), protocole mené à terme ou non,
  expérience créée ou débriefée, les quatre curseurs. On améliore le coach sur des chiffres, pas
  sur une séance qui a énervé.

**Effort.** Petit pour les curseurs, petit à moyen pour le reste.

---

## Axe 4 — Le cerveau de la séance est le plus petit modèle de la chaîne

**Constat.** C'est le superviseur qui prend toutes les décisions cliniques : lire l'émotion,
classer le discours-changement, choisir le geste, lancer ou arrêter un protocole, juger le risque.
Il tourne sur le modèle le plus léger (`SUPERVISOR_MODEL` dans `lib/ai/models.ts`) et ne voit que
les **12 derniers messages, coupés à 400 caractères** (`buildTranscript`). Dans une séance de deux
heures, il ne voit plus le début, là où le problème a été posé. Avec la dictée vocale, un message
dépasse souvent 400 caractères. Le modèle du coach, plus capable, reçoit ensuite une consigne
marquée « ÇA PRIME SUR TOUT LE RESTE ».

Un défaut précis : **`session_goal` n'est jamais renvoyé au superviseur.** Le client renvoie le
geste et le protocole précédents (`previousMove`, `activeProtocol`) mais pas l'objectif de
séance. La règle 20 (« garde la même formulation d'un message à l'autre ») est donc impossible à
tenir : l'objectif est redeviné à chaque tour. C'est la même maladie que le protocole avant la
PR #24.

**Ce qu'on change.**
- Tout de suite : faire porter `session_goal` par le client, comme `activeProtocol`. Et donner au
  superviseur le premier message de fond de la séance en plus des 12 derniers.
- Ensuite, à mesurer avec l'axe 3 : soit un seul appel où le modèle du coach planifie (raisonnement
  caché) puis parle, en gardant en code les garde-fous déterministes (sécurité, moment du suivi,
  continuité du protocole) ; soit un superviseur sur un modèle plus capable, qui reçoit la carte
  (axe 1) et toute la séance. La latence d'un seul appel avec raisonnement est du même ordre que
  celle des deux appels actuels.

**Effort.** Petit pour le défaut, gros pour la refonte.

---

## Axe 5 — Il n'a plus le droit de dire la chose qui change tout

**Constat.** Cinq jours de corrections ont retiré la confrontation et la provocation, exigé que
toute divergence cite deux phrases **de la séance en cours**, interdit deux gestes durs d'affilée,
coupé le protocole dès que la personne défend le statu quo, et ajouté plus de vingt formules et
mots interdits. Presque toutes les corrections automatiques du superviseur retombent sur le même
geste, le reflet (`move = 'mirror'` dans `getCoachingStrategy`). Pendant ce temps, la posture dit
encore « tu oses dire ce que personne d'autre n'ose dire » et « je te crois pas ». Le prompt se
contredit, et c'est le code qui tranche, toujours du côté prudent.

**Pourquoi ça bloque.** Un coach réglé contre l'agacement risque de devenir un miroir qui ne met
jamais sur la table ce qui débloque. L'entretien motivationnel, qui est le bon moteur, n'interdit
pas de dire ce qu'on voit : il demande la permission avant.

**Ce qu'on change.**
- **Un « moment de vérité », mérité** : au plus une fois par séance, et seulement si une carte
  existe (axe 1), si l'alliance tient (axe 3) et si le même schéma est apparu dans au moins deux
  séances. Le coach demande d'abord : « Je peux te dire ce que je vois ? ». Puis il rend la boucle
  entière, preuves à l'appui.
- **Autoriser la divergence entre séances** : « Il y a trois semaines tu m'as dit […]. Aujourd'hui
  tu me dis […], presque mot pour mot. » Les séances sont stockées, la preuve est là. C'est la
  divergence la plus puissante, et c'est aujourd'hui la seule interdite.
- Faire retomber les corrections sur un geste adapté au contexte (observation, valorisation)
  plutôt que presque toujours sur le reflet, et suivre la part de reflets par séance (axe 3).
- Choisir dans le prompt entre « tu oses » et « tu ne pousses jamais », au lieu de garder les
  deux.

**Effort.** Moyen.

---

## Axe 6 — Une séance de deux heures n'est pas une meilleure séance

**Constat.** Une séance a duré deux heures. Une autre est restée 50 minutes en phase « clôture ».
Une séance reprise garde son horloge de départ et peut se prolonger sans limite. L'arc a été
assoupli (PR #23) pour ne plus pousser dehors quelqu'un qui parle encore.

**Pourquoi ça bloque.** Décrire longuement le problème à une écoute toujours disponible soulage
sur le moment et peut l'entretenir : c'est de la rumination à deux. En coaching, la fin de séance
est un outil : c'est elle qui force le passage au réel.

**Ce qu'on change.**
- Deux contrats au choix en ouvrant : « je veux déposer » (journal, pas de travail attendu) ou « je
  veux avancer sur [le problème] » (séance de travail, 30 à 45 minutes).
- Dans une séance de travail, vers 40 minutes, le coach propose explicitement d'atterrir. Après
  l'atterrissage, la séance se ferme sur la lettre (axe 7) au lieu de rester ouverte.
- Un signal simple de rumination pour le superviseur : beaucoup d'échanges, aucune alternative ni
  action évoquée. Alors : « qu'est-ce que tu veux faire de tout ça ? ».

**Effort.** Moyen.

---

## Axe 7 — Repartir avec quelque chose : la lettre de séance

**Constat.** En fin de séance, la personne reçoit `coach_summary` (deux ou trois phrases
chaleureuses) et une liste d'actions (`SessionEnd.tsx`).

**Ce qu'on change.** Une courte lettre, dans la voix du coach :
- ce qu'on a vu, avec la boucle dans ses mots ;
- la phrase qu'elle a dite et qui compte ;
- l'expérience de la semaine, avec sa prédiction ;
- quand on en reparle.

Elle est stockée et relisible dans `/sessions`, puis envoyée par notification le lendemain matin.
La pratique narrative utilise ces lettres parce qu'elles prolongent la séance. Et c'est un objet
qu'on peut relire au moment précis où la boucle se déclenche.

**Effort.** Petit à moyen : un appel de plus dans l'analyse, un champ, un écran.

---

## Axe 8 — Rouvrir là où on s'était arrêté

**Constat.** Pour corriger l'effet « huissier », le suivi est caché pendant les trois premiers
échanges, et le premier message doit seulement « ouvrir la porte ». La séance s'ouvre donc à
neutre, comme si la précédente n'avait pas eu lieu.

**Ce qu'on change.** Une phrase de pont avant d'ouvrir la porte : « La dernière fois tu
repartais avec [l'expérience]. On en parle si tu veux. Mais d'abord, qu'est-ce qui t'amène ? ».
C'est de la continuité, pas un contrôle : la personne reste libre de parler d'autre chose. C'est
la structure standard d'une séance en thérapie cognitive (pont, puis ordre du jour).

**Effort.** Petit.

---

## Dans quel ordre

| Vague | Quoi | Pourquoi d'abord |
|---|---|---|
| 1. **Livrée le 2026-10-01** | Défaut `session_goal` (4) · les quatre curseurs (3) · pont d'ouverture (8) · lettre de séance (7) | Petits, visibles dès la prochaine séance. Et les curseurs commencent à mesurer avant les gros changements |
| 2. Les deux semaines suivantes | Carte du problème (1) · expériences et débrief (2) · mesure de sévérité (3) | Le cœur de la transformation. La carte d'abord : les expériences s'y accrochent |
| 3. Ensuite, chiffres en main | Moment de vérité et divergence entre séances (5) · contrats de séance (6) · refonte du superviseur (4) · tableau de bord (3) | Les changements les plus risqués pour le ton du coach. On les juge sur les curseurs, pas à l'impression |

### Vague 1 : ce qui a été livré, et ce qui reste à vérifier en vrai

- **Objectif de séance** porté par le navigateur d'un message à l'autre. En séance longue, le
  superviseur reçoit aussi les deux premiers messages de fond sortis de sa fenêtre.
- **Quatre curseurs** sur l'écran de fin (`SessionFeedback.tsx`), enregistrés dans
  `sessions.feedback` par `/api/sessions/feedback`. Ils règlent le coach dès le premier message de
  la séance suivante. Une note sous 7 passe en tête de l'ordre du jour.
- **Lettre de séance** écrite par le modèle du coach à l'analyse et au balayage, affichée en fin
  de séance et dans `/sessions`, envoyée le lendemain matin. La notification ne montre rien du
  contenu.
- **Pont d'ouverture** au premier message, sans rien demander. Rien si une séance abandonnée
  s'est intercalée ou si la précédente a touché à une crise.
- Au passage : la sauvegarde des séances n'écrit plus que des colonnes connues.

Testé hors ligne (29 cas, faux serveur d'API et fausse base), migration rejouée deux fois sur
une base locale, `tsc` et `next build` propres, lint inchangé. **Pas encore vu sur une vraie
séance** : il faut rejouer `src/migration.sql` en prod, puis faire une séance et la terminer.

## Ce que les séances doivent trancher

Une fois l'export lu :
- Quel est le problème exposé, dans ses mots ? Revient-il d'une séance à l'autre sous la même
  forme ? C'est la première version de la carte (axe 1).
- Un parcours a-t-il été créé ? Des mesures ? Des pratiques tenues ? Ou la récolte est-elle restée
  vide parce qu'aucun protocole n'est allé au bout ?
- Combien de protocoles menés à terme, sur combien de lancés ?
- La part de reflets dans les réponses du coach, et les moments où la personne s'ouvre ou se ferme
  juste après un geste précis.
- Dans les séances longues, ce qui s'est dit dans les dix premières minutes comparé aux dix
  dernières : est-ce que ça avance, ou est-ce que ça tourne ?

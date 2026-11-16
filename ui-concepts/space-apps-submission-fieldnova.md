# NASA Space Apps 2026 — FieldNova

Préparation des champs du formulaire officiel. Les blocs **À coller** sont en anglais pour les juges. Les notes entre crochets doivent être remplacées ou vérifiées avant de cliquer sur Submit.

## Avant de soumettre — deux éléments à régler

1. **Lien de démonstration manquant.** Le formulaire exige une URL publique vers une vidéo de 30 secondes maximum ou une présentation de 7 diapositives maximum (titre et introduction compris). Le script FieldNova existant dure 90 secondes; il n’est pas conforme tel quel. Le plan de 7 diapositives plus bas peut être utilisé pour créer la présentation.
2. **Image générée par IA sans indicateur visible.** `public/images/landing-fields.png` est une image générée par IA et le fichier actuel n’affiche pas de mention visible à cet effet. Le formulaire demande une marque visible sur les images/vidéos générées par SI. Avant de donner le lien public du projet, ajouter un indicateur visible « AI-generated image » sur cette image dans l’application, ou retirer/remplacer l’image. Ne pas présenter l’image sans cet indicateur.

Le dépôt public existe; aucun site web public déployé n’a été identifié. Les liens ci-dessous utilisent donc le dépôt comme lien du projet. Ouvrir le dépôt et le lien de démonstration en navigation privée avant la soumission.

---

## Project Summary

### Project Name

**À coller :**

```text
FieldNova — Farm Rotation Explorer
```

### Summary

Le formulaire suggère 50–200 mots. Texte ci-dessous : environ 125 mots.

**À coller :**

```text
FieldNova is a browser-based decision-support prototype that helps farmers and agricultural advisers explore crop-rotation options using NASA Earth observation data and farm context. It displays NASA POWER climate history and NASA GIBS satellite map layers, while letting users record local soil information, farm priorities, constraints, and field observations in their browser. Its Scenarios workspace compares three five-year rotations using transparent descriptive criteria such as crop-family diversity, repetition, legumes, and documented root traits. Users can inspect the evidence, missing information, and limitations behind each comparison. The demonstration farm and its rotation examples are fictional. NASA climate and map products provide regional context; they are not field measurements and do not determine the current rotation ranking. FieldNova does not predict yield, diagnose soil health, or prescribe irrigation. It is a prototype for better-informed conversations with local agricultural experts.
```

---

## Project Links

### Project Demonstration

**Lien à ajouter après création et téléversement public :**

```text
[COLLER ICI L’URL COMPLÈTE PUBLIQUE DE LA PRÉSENTATION (≤7 diapositives) OU DE LA VIDÉO (≤30 s)]
```

Ne pas mettre le lien de ce fichier Markdown comme démonstration. Le formulaire demande la présentation ou la vidéo elle-même, hébergée sur un service public sans mot de passe ni demande d’accès.

#### Plan conseillé pour la présentation (7 diapositives maximum)

1. **Titre et besoin** — FieldNova; comparer des rotations avec données NASA et contexte de ferme.
2. **Ce que l’utilisateur voit** — carte et point suivi; distinguer les couches NASA des limites réelles de parcelle.
3. **Données NASA** — NASA POWER (pluie/température) et GIBS (MODIS/SMAP); préciser période, maille/résolution et limites.
4. **Contexte de ferme** — profil et sol déclarés localement; signaler que le cas de démonstration est fictif.
5. **Trois rotations** — succession de référence et deux options; expliquer les critères descriptifs.
6. **Comparer et inspecter les preuves** — montrer une priorité, ses effets sur la comparaison, les sources, les données manquantes et les compromis.
7. **Impact et limites** — outil de discussion, pas de conseil validé; prochaine validation à faire avec un agriculteur/conseiller.

Pour une vidéo en français, ajouter des sous-titres anglais. Le texte écrit de la soumission doit être en anglais.

### Project

Le dépôt GitHub est public et contient le code, les instructions de démarrage et le manifeste des dépendances. Aucun déploiement applicatif public n’a été trouvé dans le projet.

**À coller :**

```text
https://github.com/yasserzanari/fieldnova
```

Si une application déployée publiquement est disponible au moment de soumettre, privilégier son URL ici et conserver le dépôt dans les références/autres ressources.

---

## Project Information

### Project Details

**À coller :**

```text
FieldNova is a responsive web prototype built with React, TypeScript, and Vite. It combines NASA POWER monthly and daily climate series for a selected coordinate with NASA GIBS map tiles for MODIS Terra true color, 8-day NDVI, and SMAP surface and root-zone soil moisture. A separate ISRIC SoilGrids clay layer can be viewed on the map. Users can enter farm and soil details, priorities, constraints, and observations; these declarations are stored locally in the browser. The Scenarios workspace presents a reference rotation and two alternatives over five years. It explains descriptive measures such as crop-family diversity and repetition, legumes, documented root traits, and user-declared preferences.

The demo farm and prefilled rotations are fictional. NASA POWER and satellite map products describe gridded or regional conditions, not measurements of a farm parcel. SoilGrids is a predicted map layer, not a soil test. Climate and soil layers currently provide context and do not feed the rotation ranking. The prototype makes assumptions and missing evidence visible; it does not predict yields, crop compatibility, soil-health outcomes, or irrigation requirements. Its intended impact is to help farmers and advisers have a clearer, source-aware discussion about options and what should be checked locally.

The project uses React, TypeScript, Vite, MapLibre GL JS, Recharts, Tailwind CSS, Framer Motion, React Router, and Lucide/Tabler icons. The FieldNova assistant uses a local topic router; in the development demo, Codex CLI can phrase responses from results already retrieved by FieldNova. It does not independently retrieve NASA data or calculate agronomic recommendations. AI tools also assisted with project code and text. The landing-page hero image was AI-generated and must be visibly labelled as AI-generated in the public project before submission.
```

### Use of Super Intelligence (SI)

Ne pas choisir **“I did not use SI”**. Le projet a utilisé des outils d’IA.

**Sélectionner les catégories correspondant à ces usages dans le formulaire :**

- **Code** : OpenAI Codex a aidé à écrire et modifier le code du prototype.
- **Texte** : Codex a aidé à préparer du texte de projet/documentation; Codex CLI reformule, en mode de développement, les résultats fournis par les outils locaux de FieldNova.
- **Images** : l’image héro de `public/images/landing-fields.png` a été générée par IA. Elle doit porter une indication visible « AI-generated image » dans l’application avant de soumettre le lien public.
- **Données** : ne pas affirmer que des mesures NASA ont été générées par IA. NASA POWER est récupéré auprès du service NASA. Le profil et les rotations de la démo sont des exemples fictifs balisés; si le formulaire regroupe « code and data », préciser que les données NASA ne sont pas générées par SI et que les fixtures sont synthétiques.
- **Audio/vidéo** : ne pas sélectionner, sauf si l’équipe utilise ensuite un outil SI pour en produire.

**Texte d’explication prêt à coller si le formulaire offre une zone de commentaire :**

```text
OpenAI Codex assisted with writing and editing application code and project text. In the development demo, Codex CLI is used only to phrase answers from context and tool results already retrieved by FieldNova; it does not independently fetch NASA data or generate scientific measurements. NASA POWER values are retrieved from NASA. The farm profile and example rotations are fictional demo fixtures and are labelled as such. An AI image-generation tool was used for the landing-page hero image (public/images/landing-fields.png); the public project must visibly label that image as AI-generated. No AI-generated audio or video is used.
```

**À vérifier avant envoi :** le nom exact du générateur d’image utilisé à l’origine n’est pas consigné dans le dépôt. Si l’équipe s’en souvient, remplacer « an AI image-generation tool » par son nom précis.

---

## NASA Data

Le formulaire demande un **Link Text** et un **Link URL** par ressource. Ajouter les entrées ci-dessous une par une. Garder seulement les produits effectivement visibles ou utilisés dans la version finale.

| Link Text | Link URL |
|---|---|
| NASA POWER — Monthly and Annual API (`PRECTOTCORR`, `T2M`, `T2M_MAX`, `T2M_MIN`, `GWETTOP`, `GWETROOT`) | `https://power.larc.nasa.gov/docs/services/api/temporal/monthly/` |
| NASA POWER — Daily API (`PRECTOTCORR`, `T2M_MAX`, `T2M_MIN`) | `https://power.larc.nasa.gov/docs/services/api/temporal/daily/` |
| NASA EOSDIS GIBS — MODIS Terra True Color, MODIS Terra NDVI 8-Day, and SMAP L4 map visualizations | `https://nasa-gibs.github.io/gibs-api-docs/available-visualizations/` |
| NASA / NSIDC — SMAP L4 Global 3-hourly 9 km Soil Moisture (`SPL4SMGP`) product information | `https://nsidc.org/data/spl4smgp` |
| NASA POWER — Citation guidance | `https://power.larc.nasa.gov/docs/referencing/` |

Dans la description ou pendant la démo, préciser que POWER est associé à une maille climatique et que les cartes GIBS/SMAP ne mesurent pas une parcelle.

---

## Space Agency Partner & Other Data

Ajouter chaque ligne comme **Link Text / Link URL** dans le formulaire. Cela comprend les données non-NASA, les références agronomiques, le code et les bibliothèques utilisées. Les sources optionnelles qui n’apparaissent plus dans le produit final peuvent être retirées.

| Link Text | Link URL |
|---|---|
| FieldNova source code and README (MIT) | `https://github.com/yasserzanari/fieldnova` |
| FieldNova dependency manifest (`package.json`) — versions of libraries and tools | `https://github.com/yasserzanari/fieldnova/blob/main/package.json` |
| ISRIC SoilGrids WMS — predicted mean clay content, 0–5 cm (`clay_0-5cm_mean`), CC BY 4.0 | `https://maps.isric.org/mapserv/clay?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities` |
| ISRIC SoilGrids data license — Creative Commons Attribution 4.0 | `https://creativecommons.org/licenses/by/4.0/` |
| OpenStreetMap — map data and attribution | `https://www.openstreetmap.org/copyright` |
| INPN / TAXREF — botanical taxonomy reference | `https://inpn.mnhn.fr/telechargement/referentielEspece/referentielTaxo` |
| DRAAF Hauts-de-France — crop sequences and root-system reference | `https://draaf.hauts-de-france.agriculture.gouv.fr/grandes-cultures-les-systemes-cerealiers-au-coeur-des-assolements-des-hauts-de-a4927.html` |
| INRAE — crop diversification and rotations reference | `https://www.inrae.fr/actualites/augmenter-diversite-vegetale-espaces-agricoles-proteger-cultures` |
| USDA NRCS — soil health assessment reference | `https://www.nrcs.usda.gov/conservation-basics/soil/soil-health/soil-health-assessment` |
| FAO — Visual Soil Field Assessment reference | `https://www.fao.org/land-water/land/land-governance-and-planning/land-resources-planning-toolbox/detail/visual-soil--field-assessment-tool-%28vs-fast%29/en` |
| 21st.dev — source of adapted UI component references | `https://21st.dev/` |
| FrontUI component-source note (adapted component origins recorded in the repository) | `https://github.com/yasserzanari/fieldnova/blob/main/src/components/21st/README.md` |

**Bibliothèques à décrire avec le lien du manifeste :** React, React DOM, React Router, TypeScript, Vite, MapLibre GL JS, Recharts, Tailwind CSS, Framer Motion, Lucide React, Tabler Icons, `clsx` et `tailwind-merge`. Les versions exactes sont indiquées dans `package.json`.

---

## Vérification finale avant Submit

- [ ] Remplacer/annoter visiblement l’image de couverture générée par IA dans le projet public.
- [ ] Créer et héberger une démo de 7 diapositives maximum ou une vidéo de 30 secondes maximum.
- [ ] Coller une URL complète et publique pour la démonstration; l’ouvrir en navigation privée.
- [ ] Coller une URL complète et publique pour le projet; l’ouvrir en navigation privée.
- [ ] Coller le résumé et la description en anglais.
- [ ] Ajouter les liens NASA et autres ressources utilisés dans la version soumise.
- [ ] Déclarer Codex/Codex CLI et l’image générée; ne pas sélectionner « I did not use SI ».
- [ ] Vérifier le nom d’équipe, le défi choisi, les membres et les conditions du formulaire.
- [ ] Cliquer sur **Submit** et vérifier que l’état de la page n’indique plus **Incomplete**.

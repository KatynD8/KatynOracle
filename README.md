# KatynOracle

KatynOracle est un navigateur de bureau minimaliste orienté espaces de travail, développé avec Electron (`WebContentsView`). Conçu pour alléger la navigation et remplacer l'encombrement des fenêtres classiques par une logique inspirée d'Arc, il permet de cloisonner ses sessions par espace, d'organiser ses liens par dossiers et de naviguer au sein d'une interface sombre épurée aux teintes pastel.

## Capacités et fonctionnalités

- Espaces de travail et profils cloisonnés : bascule entre différents espaces (ex. Perso, Dev & IA) isolés par partitions de session dédiées (`persist:space_*`), avec prise en charge de la navigation privée sur les raccourcis configurés à cet effet.
- Dossiers et favoris vivants : organisation des liens dans des dossiers repliables avec récupération automatique du favicon du domaine. Cliquer sur un favori ouvre ou ramène au premier plan sa vue dédiée sans encombrer la liste des onglets ouverts.
- Persistance visuelle au repli : lorsqu'un dossier est replié pendant la consultation d'un de ses liens, le favori actif reste visible et mis en évidence sous l'en-tête du dossier.
- Surbrillance des onglets ouverts et bouton `-` : les onglets et favoris ouverts restent en surbrillance dans la barre latérale ; le bouton `-` sur l'élément actif permet de clore sa vue (coupure audio immédiate et libération de mémoire) tout en gardant le lien dans son dossier.
- Barre de navigation unifiée et raccourcis clavier : contrôles précédent, suivant et actualiser regroupés avec le champ d'adresse et le titre de l'onglet actif, moteur de recherche sélectionnable (Google, Brave Search, Bing, Startpage) et raccourcis `Ctrl+T` (nouvel onglet), `Ctrl+W` (fermer l'onglet courant), `Ctrl+L` (focus barre d'adresse), `Ctrl+R` / `F5` (actualiser) et `Échap` (fermer modales ou menus).
- Gestion de la mémoire : compteur RAM en bas de la barre latérale (basé sur `app.getAppMetrics()`) et fermeture automatique des `WebContentsView` des espaces inactifs lors d'un changement d'espace.
- Configuration locale persistante : paramètres, profils, espaces, dossiers, raccourcis partagés et extensions déclarées sont enregistrés dans `browser-config.json` au sein du dossier `userData` de l'application.

## Limites actuelles

- Pas de synchronisation cloud : la configuration JSON, le cache et les sessions restent exclusivement locaux sur la machine.
- Gestion des extensions basique : permet de sélectionner et d'enregistrer des dossiers d'extensions décompressés (`manifest.json`), sans boutique intégrée ni gestion avancée des popups d'extension.
- Fermeture des vues au changement d'espace : passer d'un espace à l'autre détruit les vues des autres espaces pour alléger la RAM ; l'état non sauvegardé d'une page en cours dans un espace inactif n'est donc pas conservé en mémoire.
- Arrondi des coins dépendant des sites : l'arrondi visuel sur le contenu web repose sur le cadre conteneur et une injection CSS ; les pages appliquant une `Content-Security-Policy` stricte peuvent ignorer tout ou partie du style injecté.
- Exécutable Windows non signé : sans certificat de signature, un installateur `.exe` généré en local peut déclencher un avertissement SmartScreen à l'installation ou au premier lancement sur une autre machine.

## Installation et lancement

Installer les dépendances et lancer l'application en développement :

npm install
npm start

## Build Windows (.exe)

Générer l'installateur Windows dans le dossier `dist/` :

npm run build:win

Les données utilisateur (`browser-config.json` et partitions de session) restent stockées dans `%APPDATA%` et ne sont pas incluses dans le `.exe` généré.

# Mise en ligne — GitHub + Vercel

Tout est déjà configuré dans le projet. Il reste **deux étapes**.

## 1. Ajouter ton compte GitHub à la machine

Cette machine sert déjà à d'autres comptes GitHub : le tien vient s'ajouter à
côté, il ne remplace rien. La connexion passe par le navigateur, avec **tes**
identifiants :

```bash
gh auth login --hostname github.com --scopes workflow
```

> Le `--scopes workflow` n'est pas optionnel : sans lui, GitHub refuse de
> recevoir le fichier de configuration du CI.

## 2. Lancer la configuration

```bash
bash scripts/setup-deploy.sh
```

Le script demande sous quel compte travailler, bascule dessus, crée le dépôt,
crée le projet Vercel, enregistre les secrets, pousse le code — puis **remet le
compte d'origine**, y compris s'il plante ou si tu fais Ctrl-C. Il affiche un
récapitulatif et attend ta confirmation avant de créer quoi que ce soit, et il
est relançable sans risque s'il s'arrête en route.

Il te demandera un **jeton Vercel**, à créer sur
<https://vercel.com/account/tokens> (nom : `github-actions`). C'est ce qui
autorise GitHub à déployer à ta place, et ça évite d'avoir à déconnecter la
session Vercel déjà ouverte sur la machine. Colle-le quand il le demande : la
saisie est invisible, et il est enregistré comme secret GitHub, jamais écrit
dans le code.

En une ligne, si tu veux tout passer d'avance :

```bash
GH_ACCOUNT=ton-pseudo REPO_NAME=boite-a-rythmes bash scripts/setup-deploy.sh
```

## Ce qui se passe ensuite

À chaque `git push` sur `main` :

1. les types sont vérifiés (`svelte-check`) ;
2. les tests tournent (`vitest`) ;
3. les deux builds sont produits (site + fichier HTML autonome) ;
4. **et seulement si tout est vert**, le site part en production sur Vercel.

Si un test casse, rien n'est déployé — la version en ligne reste la dernière
qui fonctionnait. Le suivi est dans l'onglet **Actions** du dépôt.

Le fichier HTML autonome de chaque build est téléchargeable depuis cette même
page (section « Artifacts ») : pratique pour envoyer l'appli à quelqu'un sans
passer par le site.

## Un piège à éviter

Sur le tableau de bord Vercel, **ne connecte pas le dépôt GitHub** au projet
(« Git Integration »). C'est GitHub Actions qui déclenche le déploiement, pour
pouvoir le bloquer quand les tests échouent. Si tu connectes les deux, Vercel
déploiera aussi de son côté — sans attendre les tests, et tu auras deux
déploiements par push.

## Au quotidien

```bash
git add -A
git commit -m "ce que j'ai changé"
git push
```

Et c'est tout.

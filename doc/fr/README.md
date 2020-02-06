# ts-transform-auto-require - Transformateur typescript pour requérir tous les fichiers correspondants à un patron

Ce transformateur complète l'initialisation d'une variable d'un fichier avec le contenu de fichiers correspondants à un patron (glob). Par exemple, avec la structure de fichiers suivante :

    .
    └── themes/
        ├── index.ts
        ├── dark.ts
        ├── magic.ts
        └── partial/
            ├── light.ts
            └── stars.ts

et ce contenu :

```typescript
// locales/index.ts
import { Theme, createTheme } from '../Theme'

const allThemes: { [name: string]: Theme } = {}

Object.entries(allThemes).forEach(([name, theme]) => createTheme(name, theme))
```

le transformateur va remplir la variable `allThemes` afin que le fichier devienne :

```typescript
// locales/index.ts
import { Theme, createTheme } from '../Theme'

const allThemes: { [name: string]: Theme } = {
  dark: require('./dark').default,
  magic: require('./magic').default,
  'partial/light': require('./partial/light').default,
  'partial/stars': require('./partial/stars').default,
}

Object.entries(allThemes).forEach(([name, theme]) => createTheme(name, theme))
```

# Langue

Slune étant une entreprise française, vous trouverez tous les documents et messages en français. Les autres traductions sont bienvenues.

Cependant, l'anglais étant la langue de la programmation, le code, y compris les noms de variable et commentaires, sont en anglais.

# Installation

L'installation se fait avec la commande `npm install` :

```bash
$ npm install --save-dev ts-transform-auto-require
```

Si vous préférez utiliser `yarn` :

```bash
$ yarn add --dev ts-transform-auto-require
```

# Pourquoi aurai-je besoin de ça ?

Vous avez une application extensible dans laquelle vous pouvez ajouter des locales, des ajouts, des chargeurs, des thèmes ou quoi que vous vouliez, et vous avez besoin d'un lieu pour les requérir tous (probablement un fichier d'index) pour les rendre accessibles dans l'application. Comment allez-vous gérer cela ?

- Vous pouvez manuellement mettre à jour le fichier d'aggrégation chaque fois que vous créez un nouveau fichier d'extention… à condition de ne pas l'oublier ! Dans les grandes organisations, il est plutôt facile d'oublier sans même sans rendre compte, de manière à ce que le nouveau fichier ne soit jamais utilisé.
- Vous pouvez lire et requérir les fichiers à l'exécution. Cela nécessitera de coder le processus de recherche des fichiers, ce qui consommera du temps. Il pourra même y avoir des situations où cela ne fonctionnera pas (par exemple, si le module est exécuté dans un navigateur).
- Vous pouvez écrire un outil qui crée le fichier d'index à la génération. Afin de ne pas l'oublier, vous devriez l'ajouter à votre procédure de génération. Mais vous allez devoir également fournir au moins un faux fichier d'aggrégation afin que _TypeScript_ puisse effectuer les contrôles de type, or pour les tests unitaires.

En utilisant le transformateur, vous n'aurez pas besoin de faire cela. Écrivez simplement votre fichier d'aggrégation, qui contient une variable initialisée. Il est même possible d'y mettre une fausse initialisation, si vous en avez besoin pour des tests, elle sera remplacée par le transformateur. Une fois cela fait, vous pouvez ajouter vos fichiers d'extentions, et ils seront automatiquement ajoutés à la variable.

# Utilisation

Le transformateur contient sa configuration sous le paramètre `autoRequires`, qui est un tableau d'objets contenant :

- `source`: la définition de la source, les fichiers à requérir — c'est un objet obligatoire contenant :
  - `glob`: le patron [glob](https://www.npmjs.com/package/glob) utilisé pour sélectionner les fichiers, relatif à la racine du projet — ce paramètre est requis ;
  - `ignore`: une chaine de caractères ou un tableau de chaines de caractères pour les fichiers à ignorer — la valeur est transmise directement à l'option `ignore` de [glob](https://www.npmjs.com/package/glob) — ce paramètre est optionel ;
- `target`: la définition de la cible, là où la variable à initialiser sera trouvée — c'est un objet obligatoire qui contient :
  - `file`: le nom du fichier qui contient la variable (requis);
  - `variable`: le nom de la variable à initialiser avec les `require`s (requis).

Il n'y a actuellement pas moyen de déclarer un transformateur dans le compilateur _TypeScript_ standard. Si vous ne souhaitez pas écrire votre propre compilateur en utilisant l'API `typescript`, vous pouvez utiliser la surcouche [ttypescript](https://www.npmjs.com/package/ttypescript).

## Définition de la variable

La variable à compléter peut être déclarée en utilisant `const`, `let` ou `var`. Elle **peut** être suivie d'une définition de type. Elle **doit** être suivie d'un litéral d'objet (vide ou non) pour l'initialisation.

Toutes les déclarations de variables ci-dessous sont valables pour le remplissage automatique :

```typescript
const allThemes: { [name: string]: Theme } = {}
let loaders: any = {}
var myVar = { fake: 'Fausse valeur de test' }
```

## Noms des fichiers requis

Les chemins des fichiers sont traités ainsi :

- le nom et chemin du fichier est pris relativement au fichier cible ;
- l'extention est supprimée (nécessaire pour, par exemple, les fichiers _TypeScript_ `.ts` qui sont transpilés en `.js` à l'exécution).

Par exemple, dans un fichier d'index qui collecte tous des fichiers dans le même répertoire, la clé d'objet est simplement le nom du fichier sans chemin ni extention. Si le fichier est dans un sous-répertoire, son nom sera également présent (par exemple, `sousrep/fichier`). S'il est nécessaire de remonter dans les répertoires pour atteindre le fichier, la clé d'objet commencera par `..`.

## Configuration avec ttypescript

Pour `ttypescript`, configurez votre fichier `tsconfig.json`. Par exemple :

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "transform": "ts-transform-auto-require",
        "autoRequires": [
          {
            "source": {
              "glob": "themes/**/*.ts",
              "ignore": ["**/index.ts", "**/*.spec.ts"]
            },
            "target": {
              "file": "themes/index.ts",
              "variable": "allThemes"
            }
          },
          {
            "source": { "glob": "**/loader-*.ts" },
            "target": {
              "file": "loader.ts",
              "variable": "loaders"
            }
          }
        ]
      }
    ]
  }
}
```

Le transformateur est de type `program` (qui est le type par défaut pour `ttypescript`).

# Notes

- Le même nom de fichier, et même la même cible complète peut apparaitre plusieurs fois dans la configuration. Tous les `require`s correspondants seront fusionnés.
- Tous les variables correspondantes seront complètées, alors assurez-vous de ne pas avoir plusieurs variables avec le nom configuré (le transformateur ne tient pas compte des portées).
- Les fichiers à requérir doivent être sous la racine du projet. Les fichiers hors de la racine du projet seront ignorés, même s'ils correspondent au glob fourni.
- Merci d'ouvrir un incident si vous avez un problème à l'utilisation de ce transformateur. Même si nous ne pouvons pas garantir de délai de réponse, nous ferons notre possible pour corriger les problèmes et répondre aux questions.
- Une _pull request_ est bien sûr bienvenue.

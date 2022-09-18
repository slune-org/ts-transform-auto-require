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
// themes/index.ts
import { Theme, createTheme } from '../Theme'

const allThemes: { [name: string]: Theme } = {}

Object.entries(allThemes).forEach(([name, theme]) => createTheme(name, theme))
```

le transformateur va remplir la variable `allThemes` afin que le fichier devienne :

```typescript
// themes/index.ts
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

Les documents et messages, le code (y compris les noms de variable et commentaires), sont en anglais.

Cependant, Slune étant une entreprise française, tous les documents et messages importants doivent également être fournis en français. Les autres traductions sont bienvenues.

# Installation

L’installation se fait avec la commande `npm install` :

```bash
$ npm install --save-dev ts-transform-auto-require
```

# Pourquoi aurai-je besoin de ça ?

Vous avez une application extensible dans laquelle vous pouvez ajouter des locales, des ajouts, des chargeurs, des thèmes ou quoi que vous vouliez, et vous avez besoin d'un lieu pour les requérir tous (probablement un fichier d'index) pour les rendre accessibles dans l'application. Comment allez-vous gérer cela ?

- Vous pouvez manuellement mettre à jour le fichier d'aggrégation chaque fois que vous créez un nouveau fichier d'extention… à condition de ne pas l'oublier ! Dans les grandes organisations, il est plutôt facile d'oublier sans même sans rendre compte, de manière à ce que le nouveau fichier ne soit jamais utilisé.
- Vous pouvez lire et requérir les fichiers à l'exécution. Cela nécessitera de coder le processus de recherche des fichiers, ce qui consommera du temps. Il pourra même y avoir des situations où cela ne fonctionnera pas (par exemple, si le module est exécuté dans un navigateur).
- Vous pouvez écrire un outil qui crée le fichier d'index à la génération. Afin de ne pas l'oublier, vous devriez l'ajouter à votre procédure de génération. Mais vous allez devoir également fournir au moins un faux fichier d'aggrégation afin que _TypeScript_ puisse effectuer les contrôles de type, or pour les tests unitaires.

En utilisant le transformateur, vous n'aurez pas besoin de faire cela. Écrivez simplement votre fichier d'aggrégation, qui contient une variable initialisée. Il est même possible d'y mettre une fausse initialisation, si vous en avez besoin pour des tests, elle sera remplacée par le transformateur. Une fois cela fait, vous pouvez ajouter vos fichiers d'extentions, et ils seront automatiquement ajoutés à la variable.

Ce transformateur crée des `require`s et est donc conçu pour les modules CommonJS. Pour les modules ES, utilisez plutôt [ts-transform-auto-import](https://github.com/slune-org/ts-transform-auto-import).

# Utilisation

Le transformateur contient sa configuration sous le paramètre `autoRequires`, qui est un tableau d'objets contenant :

- `source`: la définition de la source, les fichiers à requérir — c'est un objet obligatoire contenant :
  - `glob`: le patron [glob](https://www.npmjs.com/package/glob) utilisé pour sélectionner les fichiers, relatif à la racine du projet — ce paramètre est requis ;
  - `ignore`: une chaine de caractères ou un tableau de chaines de caractères pour les fichiers à ignorer — la valeur est transmise directement à l'option `ignore` de [glob](https://www.npmjs.com/package/glob) — ce paramètre est optionel ;
- `target`: la définition de la cible, là où la variable à initialiser sera trouvée — c'est un objet obligatoire qui contient :
  - `file`: le nom du fichier qui contient la variable (requis) ;
  - `variable`: le nom de la variable à initialiser avec les `require`s (requis) ;
  - `codeExtensions`: une liste d’extensions utilisées pour identifier les fichiers de code source — par défaut, `['js', 'jsx', 'ts', 'tsx']`.

Il n'y a actuellement pas moyen de déclarer un transformateur dans le compilateur _TypeScript_ standard. Si vous ne souhaitez pas écrire votre propre compilateur en utilisant l'API `typescript`, vous pouvez utiliser la surcouche [ttypescript](https://www.npmjs.com/package/ttypescript).

## Remplissage automatique

La portion de code à remplir par le transformateur doit suivre ces règles :

- cela **doit** être une déclaration de variable utilisant `const`, `let` ou `var` ;
- le nom de variable **peut** être suivi d'une définition de type ;
- la variable **doit** être suivie par une initialisation immédiate ;
- la valeur de l'initialisation **doit** être un litéral d'objet ;
- l'objet d'initialisation **peut** être vide ou non ;
- l'initialisation **peut** être suivie par un transtypage.

Toutes les déclarations de variables ci-dessous sont valables pour le remplissage automatique :

```typescript
const allThemes: { [name: string]: Theme } = {}
let loaders = {} as { [name: string]: Loader; default: Loader }
var myVar = { fake: 'Fausse valeur de test' }
```

## Noms des fichiers requis

Les fichiers sont traités différemment selon qu’ils sont considérés comme des fichiers de code source ou non (voir l’option de configuration `target.codeExtensions`). Les fichiers JSON, par exemple, peuvent être requis de cette manière, mais pour les autres extensions, il est de la responsabilité du développeur de faire ce qui est requis pour que NodeJS soit capable de charger le fichier.

### Fichiers de code source

Les chemins des fichiers de code source sont traités ainsi :

- le nom (avec chemin) du fichier est pris relativement au fichier cible ;
- l'extention est supprimée (nécessaire pour, par exemple, les fichiers _TypeScript_ `.ts` qui sont transpilés en `.js` à l'exécution).

Dans la variable, la clé est associée à l’export `default` du fichier.

Par exemple, dans un fichier d'index qui collecte tous des fichiers dans le même répertoire, la clé d'objet est simplement le nom du fichier sans chemin ni extention. Si le fichier est dans un sous-répertoire, son nom sera également présent (par exemple, `sousrep/fichier`). S'il est nécessaire de remonter dans les répertoires pour atteindre le fichier, la clé d'objet commencera par `..`.

### Fichiers ordinaires

Le traitement des fichiers ordinaire a les différences suivantes :

- l’extension est conservée, autant dans la clé de la variable que dans l’instruction `require` ;
- dans la variable, la clé est associé au résultat complet du `require`.

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
            "source": { "glob": "**/loader-*.cts" },
            "target": {
              "file": "loader.ts",
              "variable": "loaders",
              "codeExtensions": ["cts"]
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

# Contribuer

Bien que nous ne puissions pas garantir un temps de réponse, n’hésitez pas à ouvrir un incident si vous avez une question ou un problème pour utiliser ce paquet.

Les _Pull Requests_ sont bienvenues. Vous pouvez bien sûr soumettre des corrections ou améliorations de code, mais n’hésitez pas également à améliorer la documentation, même pour de petites fautes d’orthographe ou de grammaire.

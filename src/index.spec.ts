/* eslint-disable prefer-arrow-callback, no-unused-expressions */
import { expect } from 'chai'

import compile from './compile.spec'
import { Configuration } from './configuration'

describe('ts-transform-auto-import', function() {
  this.slow(4000)
  this.timeout(10000)

  const testCases: {
    [name: string]: {
      root?: string
      config: Configuration
      result: { constValues: any; varValues: any; letValues: any }
    }
  } = {
    'Simple test': {
      root: '__test__',
      config: {
        autoRequires: [
          {
            glob: 'plugins/*.ts',
            ignore: '**/index.ts',
            target: { file: 'plugins/index.ts', variable: 'constValues' },
          },
          {
            glob: 'plugins/specials/*.ts',
            target: { file: 'plugins/index.ts', variable: 'letValues' },
          },
          {
            glob: 'plugins/specials/*',
            target: { file: 'plugins/index.ts', variable: 'varValues' },
          },
        ],
      },
      result: {
        constValues: {
          myFirstPlugin: 'Hello from myFirstPlugin.ts',
          otherone: 'Hello from otherone.ts',
          parasite: 'Hello from parasite.ts',
        },
        letValues: {
          'specials/specialThing': 'This is a special thing',
          'specials/other': 'This is another special module',
        },
        varValues: {
          'specials/specialThing': 'This is a special thing',
          'specials/other': 'This is another special module',
        },
      },
    },
    'Test which should not update anything': {
      root: '__test__',
      config: {
        autoRequires: [
          {
            glob: 'plugins/specials/*.ts',
            target: { file: 'index.ts', variable: 'varValues' },
          },
        ],
      },
      result: {
        constValues: {},
        letValues: {},
        varValues: { initialized: true },
      },
    },
    'Test with merging results': {
      root: '__test__',
      config: {
        autoRequires: [
          {
            glob: 'plugins/*.ts',
            ignore: '**/index.ts',
            target: { file: 'plugins/index.ts', variable: 'constValues' },
          },
          {
            glob: 'plugins/specials/*.ts',
            target: { file: 'plugins/index.ts', variable: 'constValues' },
          },
        ],
      },
      result: {
        constValues: {
          myFirstPlugin: 'Hello from myFirstPlugin.ts',
          otherone: 'Hello from otherone.ts',
          parasite: 'Hello from parasite.ts',
          'specials/specialThing': 'This is a special thing',
          'specials/other': 'This is another special module',
        },
        letValues: {},
        varValues: { initialized: true },
      },
    },
    'Test with files outside of index directory': {
      root: '__test__',
      config: {
        autoRequires: [
          {
            glob: 'outside/*.ts',
            target: { file: 'plugins/index.ts', variable: 'letValues' },
          },
          {
            glob: '**/*.ts',
            ignore: '**/index.ts',
            target: { file: 'plugins/index.ts', variable: 'varValues' },
          },
        ],
      },
      result: {
        constValues: {},
        letValues: { '../outside/outsideFile': 'I am outside of the folder' },
        varValues: {
          myFirstPlugin: 'Hello from myFirstPlugin.ts',
          otherone: 'Hello from otherone.ts',
          parasite: 'Hello from parasite.ts',
          'specials/specialThing': 'This is a special thing',
          'specials/other': 'This is another special module',
          '../outside/outsideFile': 'I am outside of the folder',
        },
      },
    },
    'Test without root directory': {
      config: {
        autoRequires: [
          {
            glob: '__test__/plugins/*.ts',
            ignore: '**/index.ts',
            target: { file: '__test__/plugins/index.ts', variable: 'constValues' },
          },
        ],
      },
      result: {
        constValues: {
          myFirstPlugin: 'Hello from myFirstPlugin.ts',
          otherone: 'Hello from otherone.ts',
          parasite: 'Hello from parasite.ts',
        },
        letValues: {},
        varValues: { initialized: true },
      },
    },
    'Test with files out of root': {
      root: '__test__',
      config: {
        autoRequires: [
          {
            glob: __filename,
            target: { file: 'plugins/index.ts', variable: 'varValues' },
          },
        ],
      },
      result: {
        constValues: {},
        letValues: {},
        varValues: {},
      },
    },
  }

  Object.entries(testCases).forEach(([name, testCase]) => {
    describe(name, function() {
      before(`Compile files to ${name}`, function() {
        compile(name, testCase.root, testCase.config)
      })

      const valueTypes: Array<'constValues' | 'varValues' | 'letValues'> = [
        'constValues',
        'varValues',
        'letValues',
      ]
      valueTypes.forEach(valueType => {
        it(`should give correct ${valueType}`, function() {
          expect(require(`../dist/__test__/${name}`)[valueType]).to.deep.equal(testCase.result[valueType])
        })
      })
    })
  })
})

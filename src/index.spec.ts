/* eslint-disable prefer-arrow-callback, no-unused-expressions */
import { expect } from 'chai'
import Compiler, { CompilationResult } from 'ts-transform-test-compiler'

import transformer from '.'

describe('ts-transform-auto-import', function() {
  this.slow(4000)
  this.timeout(10000)

  const testCases: {
    [name: string]: {
      root?: string
      config: any
      result: { constValues: any; varValues: any; letValues: any }
    }
  } = {
    'Simple test': {
      root: '__test__',
      config: {
        autoRequires: [
          {
            source: { glob: 'plugins/*.ts', ignore: '**/index.ts' },
            target: { file: 'plugins/index.ts', variable: 'constValues' },
          },
          {
            source: { glob: 'plugins/specials/*.ts' },
            target: { file: 'plugins/index.ts', variable: 'letValues' },
          },
          {
            source: { glob: 'plugins/specials/*' },
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
            source: { glob: 'plugins/specials/*.ts' },
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
            source: { glob: 'plugins/*.ts', ignore: '**/index.ts' },
            target: { file: 'plugins/index.ts', variable: 'constValues' },
          },
          {
            source: { glob: 'plugins/specials/*.ts' },
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
            source: { glob: 'outside/*.ts' },
            target: { file: 'plugins/index.ts', variable: 'letValues' },
          },
          {
            source: { glob: '**/*.ts', ignore: '**/index.ts' },
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
            source: { glob: '__test__/plugins/*.ts', ignore: '**/index.ts' },
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
            source: { glob: __filename },
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
  const compiler = new Compiler(transformer, 'dist/__test__')

  describe('Configuration problems', function() {
    const regularConfig = { source: { glob: 'glob' }, target: { file: 'file', variable: 'variable' } }
    const badConfigurationCases: {
      [name: string]: { config: any; message: RegExp }
    } = {
      'bad configuration type': { config: true, message: /configuration must be an object/ },
      'missing autoRequires': { config: {}, message: /missing “autoRequires” entry/ },
      'bad autoRequires type': {
        config: { autoRequires: regularConfig },
        message: /“autoRequires” must be an array/,
      },
      'bad configuration item type': {
        config: { autoRequires: [regularConfig, 'bad type'] },
        message: /(item #2).*configuration must be an object/,
      },
      'missing source': {
        config: { autoRequires: [{ target: regularConfig.target }] },
        message: /(item #1).*missing “source” entry/,
      },
      'bad source type': {
        config: { autoRequires: [regularConfig, { ...regularConfig, source: 'bad type' }] },
        message: /(item #2).*“source” entry must be an object/,
      },
      'missing source.glob': {
        config: { autoRequires: [{ source: { ignore: '*' }, target: regularConfig.target }] },
        message: /(item #1).*missing “source.glob”/,
      },
      'bad source.glob type': {
        config: { autoRequires: [{ source: { glob: true }, target: regularConfig.target }] },
        message: /(item #1).*“source.glob” must be a string/,
      },
      'bad source.ignore type': {
        config: {
          autoRequires: [
            { source: { glob: regularConfig.source.glob, ignore: {} }, target: regularConfig.target },
          ],
        },
        message: /“source.ignore” must either be a string or a string array/,
      },
      'missing target': {
        config: { autoRequires: [regularConfig, { source: regularConfig.source }] },
        message: /(item #2).*missing “target” entry/,
      },
      'bad target type': {
        config: { autoRequires: [{ ...regularConfig, target: 'bad type' }] },
        message: /(item #1).*“target” entry must be an object/,
      },
      'missing target.file': {
        config: {
          autoRequires: [
            { source: regularConfig.source, target: { variable: regularConfig.target.variable } },
          ],
        },
        message: /(item #1).*missing “target.file”/,
      },
      'bad target.file type': {
        config: {
          autoRequires: [{ source: regularConfig.source, target: { ...regularConfig.target, file: true } }],
        },
        message: /(item #1).*“target.file” must be a string/,
      },
      'missing target.variable': {
        config: {
          autoRequires: [{ source: regularConfig.source, target: { file: regularConfig.target.file } }],
        },
        message: /(item #1).*missing “target.variable”/,
      },
      'bad target.variable type': {
        config: {
          autoRequires: [
            { source: regularConfig.source, target: { ...regularConfig.target, variable: true } },
          ],
        },
        message: /(item #1).*“target.variable” must be a string/,
      },
    }
    Object.entries(badConfigurationCases).forEach(([name, { config, message }]) => {
      it(`should throw an error if ${name}`, function() {
        expect(() => compiler.setRootDir('__test__').compile('config', config)).to.throw(message)
      })
    })
  })

  Object.entries(testCases).forEach(([name, testCase]) => {
    describe(name, function() {
      let result: CompilationResult

      before(`Compile files to ${name}`, function() {
        result = compiler
          .setRootDir(testCase.root)
          .setSourceFiles(testCase.root ? '/' : '__test__/')
          .compile(name, testCase.config)
        result.print()
      })

      const valueTypes: Array<'constValues' | 'letValues' | 'varValues'> = [
        'constValues',
        'letValues',
        'varValues',
      ]
      valueTypes.forEach(valueType => {
        it(`should give correct ${valueType}`, function() {
          expect(result.requireContent(undefined, valueType)).to.deep.equal(testCase.result[valueType])
        })
      })
    })
  })
})

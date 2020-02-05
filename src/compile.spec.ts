import { sync as readFiles } from 'glob'
import { resolve } from 'path'
import {
  CompilerOptions,
  ModuleKind,
  ModuleResolutionKind,
  ScriptTarget,
  createCompilerHost,
  createProgram,
  flattenDiagnosticMessageText,
  getPreEmitDiagnostics,
} from 'typescript'

import { Configuration } from './configuration'
import { default as transform } from '.'

const TS_CONFIG: CompilerOptions = {
  experimentalDecorators: true,
  module: ModuleKind.CommonJS,
  moduleResolution: ModuleResolutionKind.NodeJs,
  noEmitOnError: false,
  noUnusedLocals: true,
  noUnusedParameters: true,
  stripInternal: true,
  target: ScriptTarget.ES2015,
}

export default function compile(
  testName: string,
  rootDir: string | undefined,
  configuration: Configuration
): void {
  const options: CompilerOptions = {
    ...TS_CONFIG,
    rootDir,
    outDir: `dist/__test__/${testName}`,
  }
  const input = readFiles(resolve(__dirname, '..', '__test__') + '/**/*.ts')
  const compilerHost = createCompilerHost(options)
  const program = createProgram(input, options, compilerHost)

  const emitResult = program.emit(undefined, undefined, undefined, undefined, {
    before: [transform(program, configuration)],
  })

  const allDiagnostics = getPreEmitDiagnostics(program).concat(emitResult.diagnostics)

  allDiagnostics.forEach(diagnostic => {
    const { line, character } = diagnostic.file
      ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!)
      : { line: 0, character: 0 }
    const message = flattenDiagnosticMessageText(diagnostic.messageText, '\n')
    const fileName = diagnostic.file ? diagnostic.file.fileName : '(unknown)'
    // eslint-disable-next-line no-console
    console.log(`${fileName} (${line + 1},${character + 1}): ${message}`)
  })
}

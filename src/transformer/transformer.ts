import { IOptions, sync as glob } from 'glob'
import { isAbsolute, relative } from 'path'
import {
  Program,
  SourceFile,
  TransformationContext,
  Transformer,
  TransformerFactory,
  visitNode,
} from 'typescript'

import { Configuration, ConfigurationInternal } from '../configuration'
import buildVisitor from './visitor'

export default function(program: Program, configuration: Configuration): TransformerFactory<SourceFile> {
  // Calculate base path
  const basePath = program.getCompilerOptions().rootDir ?? program.getCurrentDirectory()

  // Read the file lists
  const cache: IOptions['cache'] = {}
  const statCache: IOptions['statCache'] = {}
  const symlinks: IOptions['symlinks'] = {}
  const configurations: ConfigurationInternal[] = configuration.autoRequires.map(config => {
    const foundFiles = glob(config.glob, {
      ignore: config.ignore,
      cwd: basePath,
      nomount: true,
      cache,
      statCache,
      symlinks,
    })
      .map(filename => (isAbsolute(filename) ? relative(basePath, filename) : filename))
      .filter(filename => !filename.startsWith('..'))
      .map(filename => filename.replace(/\\/g, '/'))
    return { ...config.target, foundFiles }
  })

  // Return the visitor
  return (ctx: TransformationContext): Transformer<SourceFile> => (sf: SourceFile) =>
    visitNode(sf, buildVisitor(ctx, basePath, configurations))
}

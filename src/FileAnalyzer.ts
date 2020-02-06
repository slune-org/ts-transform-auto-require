import { dirname, extname, relative, resolve, sep as pathSep } from 'path'
import { NodeVisitor } from 'simple-ts-transform'
import { Node, SourceFile, isSourceFile } from 'typescript'

import TContext from './TContext'

/**
 * Format the path to posix.
 *
 * @param path - The path to format.
 * @returns The formatted path.
 */
function formatPath(path: string): string {
  return path.replace(/\\/g, '/')
}

/**
 * Analyze a source file, check if it should be modified.
 */
export default class FileAnalyzer implements NodeVisitor<SourceFile> {
  public constructor(private readonly context: TContext) {}

  public wants(node: Node): node is SourceFile {
    return (
      isSourceFile(node) &&
      this.context.autoRequires.some(
        autoRequire =>
          formatPath(relative(this.context.basePath, node.fileName)) === formatPath(autoRequire.file)
      )
    )
  }

  public visit(node: SourceFile): Node[] {
    this.context.autoRequires
      // Remove configurations not for this file
      .filter(
        autoRequire =>
          formatPath(relative(this.context.basePath, node.fileName)) === formatPath(autoRequire.file)
      )
      .forEach(configuration => {
        if (!(configuration.variable in this.context.detectedFiles)) {
          this.context.detectedFiles[configuration.variable] = {}
        }
        const currentDir = dirname(node.fileName)
        configuration.foundFiles
          // Re-create the full path…
          .map(filename => resolve(this.context.basePath, filename))
          // …and get a path relative to current file.
          .map(filename => relative(currentDir, filename))
          // Remove extension, if any
          .map(filename => filename.slice(0, -extname(filename).length))
          .forEach(
            filename =>
              (this.context.detectedFiles[configuration.variable][filename] = filename.startsWith('.')
                ? filename
                : '.' + pathSep + filename)
          )
      })
    return [node]
  }
}

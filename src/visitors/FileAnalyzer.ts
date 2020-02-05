import { dirname, extname, relative, resolve, sep as pathSep } from 'path'
import { Node, SourceFile, isSourceFile } from 'typescript'

import { ConfigurationInternal } from '../configuration'
import Visitor from './Visitor'
import VisitorContext, { DetectedFiles } from './VisitorContext'

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
export default class FileAnalyzer implements Visitor<SourceFile> {
  private readonly basePath: string
  private readonly configurations: ConfigurationInternal[]
  private readonly detectedFiles: DetectedFiles

  public constructor(context: VisitorContext) {
    this.basePath = context.basePath
    this.configurations = context.configurations
    this.detectedFiles = context.detectedFiles
  }

  public wants(node: Node): node is SourceFile {
    return (
      isSourceFile(node) &&
      this.configurations.some(
        configuration =>
          formatPath(relative(this.basePath, node.fileName)) === formatPath(configuration.file)
      )
    )
  }

  public visit(node: SourceFile): Node {
    this.configurations
      // Remove configurations not for this file
      .filter(
        configuration =>
          formatPath(relative(this.basePath, node.fileName)) === formatPath(configuration.file)
      )
      .forEach(configuration => {
        if (!(configuration.variable in this.detectedFiles)) {
          this.detectedFiles[configuration.variable] = {}
        }
        const currentDir = dirname(node.fileName)
        configuration.foundFiles
          // Re-create the full path…
          .map(filename => resolve(this.basePath, filename))
          // …and get a path relative to current file.
          .map(filename => relative(currentDir, filename))
          // Remove extension, if any
          .map(filename => filename.slice(0, -extname(filename).length))
          .forEach(
            filename =>
              (this.detectedFiles[configuration.variable][filename] = filename.startsWith('.')
                ? filename
                : '.' + pathSep + filename)
          )
      })
    return node
  }
}

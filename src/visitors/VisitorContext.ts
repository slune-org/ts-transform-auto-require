import { ConfigurationInternal } from '../configuration'

/**
 * Detected files to require, used to prepare variables. These objects are indexed by variable names, then
 * by the name used to identify the file. The value is the file name, relative to the current file.
 */
export interface DetectedFiles {
  [variable: string]: {
    [name: string]: string
  }
}

/**
 * The context to be used by the visitors of a file.
 */
export default interface VisitorContext {
  /**
   * The base path for the current compilation.
   */
  basePath: string

  /**
   * The configurations of transformations to operate.
   */
  configurations: ConfigurationInternal[]

  /**
   * Detected files.
   */
  detectedFiles: DetectedFiles
}

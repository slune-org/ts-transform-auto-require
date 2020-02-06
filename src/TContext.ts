import { sync as searchFiles } from 'glob'
import { isAbsolute, relative } from 'path'
import { NodeVisitorContext } from 'simple-ts-transform'
import { Program } from 'typescript'

/**
 * Throw an error because of configuration problem.
 *
 * @param message - The message for the configuration error.
 * @param item - The index of the item if the message is for an item.
 */
function configurationError(message: string, item?: number): never {
  let itemId = ''
  if (item !== undefined) {
    itemId = ` (item #${item + 1})`
  }
  throw new Error(`Error in transformer configuration${itemId}: ${message}`)
}

/**
 * Assert that the provided configuration is correct, from a superficial point of view.
 *
 * @param configuration - The configuration to test.
 */
function assertIsConfiguration(configuration: any): asserts configuration is { autoRequires: any[] } {
  if (typeof configuration !== 'object') {
    configurationError('configuration must be an object')
  }
  if (!('autoRequires' in configuration)) {
    configurationError('missing “autoRequires” entry')
  }
  if (!Array.isArray(configuration.autoRequires)) {
    configurationError('“autoRequires” must be an array')
  }
}

/**
 * Assert that the configuration item is correct.
 *
 * @param configurationItem - The configuration item.
 * @param index - The item index.
 */
function assertIsConfigurationItem(
  configurationItem: any,
  index: number
): asserts configurationItem is {
  source: { glob: string; ignore?: string | string[] }
  target: { file: string; variable: string }
} {
  if (typeof configurationItem !== 'object') {
    configurationError('configuration must be an object', index)
  }
  if (!('source' in configurationItem)) {
    configurationError('missing “source” entry', index)
  }
  if (typeof configurationItem.source !== 'object') {
    configurationError('“source” entry must be an object', index)
  }
  if (!('glob' in configurationItem.source)) {
    configurationError('missing “source.glob”', index)
  }
  if (typeof configurationItem.source.glob !== 'string') {
    configurationError('“source.glob” must be a string', index)
  }
  if (
    'ignore' in configurationItem.source &&
    typeof configurationItem.source.ignore !== 'string' &&
    !Array.isArray(configurationItem.source.ignore)
  ) {
    configurationError('“source.ignore” must either be a string or a string array')
  }
  if (!('target' in configurationItem)) {
    configurationError('missing “target” entry', index)
  }
  if (typeof configurationItem.target !== 'object') {
    configurationError('“target” entry must be an object', index)
  }
  if (!('file' in configurationItem.target)) {
    configurationError('missing “target.file”', index)
  }
  if (typeof configurationItem.target.file !== 'string') {
    configurationError('“target.file” must be a string', index)
  }
  if (!('variable' in configurationItem.target)) {
    configurationError('missing “target.variable”', index)
  }
  if (typeof configurationItem.target.variable !== 'string') {
    configurationError('“target.variable” must be a string', index)
  }
}

/**
 * Context for the transformer.
 */
export default class TContext implements NodeVisitorContext {
  /**
   * The base path for the compilation.
   */
  public readonly basePath: string

  /**
   * All the configuration elements.
   */
  public readonly autoRequires: Array<{
    /**
     * The name of the file in which modifications must be done.
     */
    file: string

    /**
     * The name of the variable to update in the file.
     */
    variable: string

    /**
     * The files matching the provided glob.
     */
    foundFiles: string[]
  }>

  /**
   * The detected files.
   */
  public detectedFiles: {
    [variable: string]: {
      [name: string]: string
    }
  } = {}

  /**
   * Create the context.
   *
   * @param program - The program object.
   * @param configuration - The provided configuration.
   */
  public constructor(program: Program, configuration: any) {
    this.basePath = program.getCompilerOptions().rootDir ?? program.getCurrentDirectory()

    // Read the file lists
    const globCache = {
      cache: {},
      statCache: {},
      symlinks: {},
    }
    assertIsConfiguration(configuration)
    this.autoRequires = configuration.autoRequires.map((config, index) => {
      assertIsConfigurationItem(config, index)
      const foundFiles = searchFiles(config.source.glob, {
        ignore: config.source.ignore,
        cwd: this.basePath,
        nomount: true,
        ...globCache,
      })
        .map(filename => (isAbsolute(filename) ? relative(this.basePath, filename) : filename))
        .filter(filename => !filename.startsWith('..'))
        .map(filename => filename.replace(/\\/g, '/'))
      return { ...config.target, foundFiles }
    })
  }

  public initNewFile(): void {
    this.detectedFiles = {}
  }
}

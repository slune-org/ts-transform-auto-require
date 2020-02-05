/**
 * Description of the modifications to do.
 */
interface ConfigurationTarget {
  /**
   * The name of the file in which modifications must be done.
   */
  file: string

  /**
   * The name of the variable to update in the file.
   */
  variable: string
}

/**
 * Transformer configuration.
 */
export default interface Configuration {
  /**
   * The auto-require configurations.
   */
  autoRequires: Array<{
    /**
     * The glob to identify files to require.
     */
    glob: string

    /**
     * Files to ignore, will be given to the ignore property of `glob`.
     */
    ignore?: string | string[]

    /**
     * The target in which to add the requires.
     */
    target: ConfigurationTarget
  }>
}

/**
 * The configuration as used internally.
 */
export interface ConfigurationInternal extends ConfigurationTarget {
  foundFiles: string[]
}

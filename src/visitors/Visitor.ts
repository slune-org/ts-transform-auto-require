import { Node } from 'typescript'

import VisitorContext from './VisitorContext'

/**
 * A visitor to use on the AST.
 */
export default interface Visitor<N extends Node> {
  /**
   * Indicate if the visitor wants to visit the current node. Also used as type guard.
   *
   * @param node - The node to visit.
   * @returns True if the visitor wants to visit this node.
   */
  wants(node: Node): node is N

  /**
   * Visit the given node.
   *
   * @param node - The node to visit.
   * @returns The (eventually modified) node.
   */
  visit(node: N): Node
}

/**
 * Defines the constructor of the visitors.
 */
export type VisitorType = new (context: VisitorContext) => Visitor<any>

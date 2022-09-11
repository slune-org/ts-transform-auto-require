import type { NodeVisitor } from 'simple-ts-transform'
import type {
  AsExpression,
  Expression,
  Identifier,
  Node,
  ObjectLiteralExpression,
  ParenthesizedExpression,
  VariableDeclaration,
} from 'typescript'
import {
  isAsExpression,
  isIdentifier,
  isObjectLiteralExpression,
  isParenthesizedExpression,
  isVariableDeclaration,
} from 'typescript'

import type TContext from './TContext'

/**
 * The managed initializers.
 */
type ManagedInitializer = AsExpression | ObjectLiteralExpression | ParenthesizedExpression

/**
 * Throws an internal error because of an incorrect type.
 */
/* istanbul ignore next */
function incorrectNodeType(): never {
  throw new Error('Internal error: node is not of expected type')
}

/**
 * Assert that the node is an identifier.
 *
 * @param node - The node to assert.
 */
function assertIdentifier(node: Node | undefined): asserts node is Identifier {
  /* istanbul ignore if */
  if (!node || !isIdentifier(node)) {
    incorrectNodeType()
  }
}

/**
 * Assert that the node is a managed initializer.
 *
 * @param node - The node to assert.
 */
function assertManagedInitializer(node: Node | undefined): asserts node is ManagedInitializer {
  /* istanbul ignore if */
  if (
    !node ||
    !(isAsExpression(node) || isObjectLiteralExpression(node) || isParenthesizedExpression(node))
  ) {
    incorrectNodeType()
  }
}

/**
 * Indicate if the initializer is managed by the transformer.
 *
 * @param node - The node to test.
 * @returns True if this node is a managed expression.
 */
function isManagedInitializer(node: Node | undefined): node is ManagedInitializer {
  if (node) {
    if (isObjectLiteralExpression(node)) {
      return true
    } else if (isAsExpression(node)) {
      return isManagedInitializer(node.expression)
    } else if (isParenthesizedExpression(node)) {
      return isManagedInitializer(node.expression)
    }
  }
  return false
}

/**
 * The visitor inserting requires to appropriate places.
 */
export default class RequireInserter implements NodeVisitor<VariableDeclaration> {
  public constructor(private readonly context: TContext) {}

  public wants(node: Node): node is VariableDeclaration {
    return (
      isVariableDeclaration(node) &&
      isIdentifier(node.name) &&
      isManagedInitializer(node.initializer) &&
      node.name.getText() in this.context.detectedFiles
    )
  }

  public visit(node: VariableDeclaration): Node[] {
    const { updateVariableDeclaration } = this.context.factory
    const identifier = node.name
    assertIdentifier(identifier)
    return [
      updateVariableDeclaration(
        node,
        identifier,
        node.exclamationToken,
        node.type,
        this.updateManagedInitializer(node.initializer, identifier.getText())
      ),
    ]
  }

  /**
   * Update (fill-in) the initializer node. The node is expected to be a managed initializer.
   *
   * @param node - The node to update.
   * @param variable - The name of the variable to update.
   * @returns The updated node.
   */
  private updateManagedInitializer(node: Node | undefined, variable: string): ManagedInitializer {
    assertManagedInitializer(node)
    const {
      createCallExpression,
      createIdentifier,
      createPropertyAccessExpression,
      createPropertyAssignment,
      createStringLiteral,
      updateAsExpression,
      updateObjectLiteralExpression,
      updateParenthesizedExpression,
    } = this.context.factory
    if (isAsExpression(node)) {
      return updateAsExpression(node, this.updateManagedInitializer(node.expression, variable), node.type)
    } else if (isParenthesizedExpression(node)) {
      return updateParenthesizedExpression(node, this.updateManagedInitializer(node.expression, variable))
    } else {
      return updateObjectLiteralExpression(
        node,
        Object.entries(this.context.detectedFiles[variable]).map(([filename, fileDefinition]) => {
          let requireExpression: Expression = createCallExpression(createIdentifier('require'), undefined, [
            createStringLiteral(fileDefinition.filePath),
          ])
          if (fileDefinition.sourceCode) {
            requireExpression = createPropertyAccessExpression(
              requireExpression,
              createIdentifier('default')
            )
          }
          return createPropertyAssignment(createStringLiteral(filename), requireExpression)
        })
      )
    }
  }
}

import { Node, TransformationContext, Visitor, visitEachChild } from 'typescript'

import { ConfigurationInternal } from '../configuration'
import { FileAnalyzer, RequireInserter, VisitorType, VisitorContext } from '../visitors'

export default function(
  ctx: TransformationContext,
  basePath: string,
  configurations: ConfigurationInternal[]
): Visitor {
  const context: VisitorContext = { basePath, configurations, detectedFiles: {} }
  const visitorClasses: VisitorType[] = [FileAnalyzer, RequireInserter]
  const visitors = visitorClasses.map(VisitorClass => new VisitorClass(context))
  const fileVisitor: Visitor = (node: Node): undefined | Node | Node[] => {
    return visitEachChild(
      visitors.filter(visitor => visitor.wants(node)).reduce((prev, visitor) => visitor.visit(prev), node),
      fileVisitor,
      ctx
    )
  }
  return fileVisitor
}

import buildTransformer from 'simple-ts-transform'

import TContext from './TContext'
import FileAnalyzer from './FileAnalyzer'
import RequireInserter from './RequireInserter'

const transformer = buildTransformer(TContext, [FileAnalyzer, RequireInserter])
export default transformer

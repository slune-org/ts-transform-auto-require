import buildTransformer from 'simple-ts-transform'

import FileAnalyzer from './FileAnalyzer'
import RequireInserter from './RequireInserter'
import TContext from './TContext'

const transformer = buildTransformer(TContext, [FileAnalyzer, RequireInserter])
export default transformer

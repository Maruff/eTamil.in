// The generated vocabulary, loaded. See etamil-vocabulary-core.js for what it is.
//
// Imported into the bundle like the token table: it is 46 kB (9 kB gzipped), and a
// separate fetch would add a loading state to completion for no saving worth having.

import data from '../../assets/ide/etamil-vocabulary.json'
import { makeVocabulary } from './etamil-vocabulary-core.js'

export * from './etamil-vocabulary-core.js'

export const vocabulary = makeVocabulary(data)

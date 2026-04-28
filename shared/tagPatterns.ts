import type { TagPatterns } from './types'

export const DEFAULT_TAG_PATTERNS: TagPatterns = {
  DEAL: {
    domains: [
      'creel.mx', 'magneticlabs.com', 'apple.com', 'netflix.com',
      'andersen.com', 'llh.com.mx', 'gbm.com', 'morenafilms.com', 'onzafilms.com',
    ],
    senders: [
      'mirna alvarado', 'tyler gould', 'alex ferrando', 'mauricio llanes',
      'pilar benito', 'santiago de la rica', 'rene cardona', 'bernardo gomez', 'lebrija',
    ],
  },
  INT: { domains: ['lemonfilms.com'] },
  INFO: {
    domains: ['theblacklist.com', 'anthropic.com'],
    subjectIncludes: ['payment', 'receipt', 'newsletter', 'digest', 'your order'],
  },
  INDUSTRY: {
    domains: ['canacine.org.mx', 'imcine.gob.mx', 'focine.gob.mx', 'sofiasalud.com'],
    senders: ['uriel de la cruz'],
  },
}

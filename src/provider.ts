import EventEmitter from 'events'
import type {Promisify} from './types'
import {Transport} from './transport'
import type {
  InitializeMessage,
  ResponseMessage,
  Received,
  TransportOptions
} from './transport'

/**
 * Транспорт, использующийся на стороне страницы, на которой вставлен `iframe`
 *
 * ```js
 * import {Provider} from 'magic-transport'
 *
 * const id = 'UNIQ_ID'
 * const childOrigin = '*'
 * const sharedObject = {
 *   hello: {
 *     from: {
 *       provider() {
 *         return 'hello from provider'
 *       }
 *     }
 *   }
 * }
 *
 * const transport = new Provider({id, childOrigin, ...sharedObject})
 *
 * transport.once('ready', () => {
 *   // Tранспорт готов к использованию
 * })
 * ```
 */
export type ProviderOptions<T> = Omit<TransportOptions, 'expectedOrigin'> &
  T & {childOrigin?: string}

export class Provider<P, C> extends Transport {
  public provider: P & EventEmitter
  public facade: P & EventEmitter
  public consumer!: Promisify<C & EventEmitter>

  public constructor({
    id,
    childOrigin: expectedOrigin,
    connectedWindow,
    ...facade
  }: ProviderOptions<P>) {
    super({id, expectedOrigin, connectedWindow})

    const events = new EventEmitter()

    events.setMaxListeners(0)
    this.provider = this.facade = Object.assign(events, facade as P)
  }

  protected async handleInitialize(
    {id, args}: Received<InitializeMessage>,
    source?: Window
  ): Promise<void> {
    const [consumerInterface] = args

    this.connectedWindow ??= source
    this.consumer = consumerInterface

    const message: ResponseMessage = {
      type: 'response',
      response: {result: [this.provider]},
      responseToId: id,
      waitResponse: true
    }

    await this.sendMessage(message)
    this.emit('ready', this.consumer)
  }
}

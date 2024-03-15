import EventEmitter from 'events'
import type {Promisify} from './types'
import {Transport} from './transport'
import type {TransportOptions, InitializeMessage} from './transport'

export type ConsumerOptions<T> = Omit<
  TransportOptions,
  'connectedWindow' | 'expectedOrigin'
> &
  T & {parentOrigin?: string}

/**
 * Транспорт, использующийся на стороне страницы, загруженной внутри `iframe`
 *
 * ```js
 * import {Consumer} from 'magic-transport'
 *
 * const id = 'UNIQ_ID'
 * const parentOrigin = '*'
 * const sharedObject = {
 *   hello: {
 *     from: {
 *       consumer() {
 *         return transport.provider.hello.from.provider()
 *       }
 *     }
 *   },
 *   timeout(callback, timeout) {
 *     setTimeout(() => {
 *       callback('hello from consumer')
 *     }, timeout)
 *   }
 * }
 *
 * const transport = new Consumer({id, parentOrigin, ...sharedObject})
 *
 * transport.once('ready', () => {
 *   // Tранспорт готов к использованию
 * })
 * ```
 */
export class Consumer<P, C> extends Transport {
  public consumer: C & EventEmitter
  public facade: C & EventEmitter
  public provider!: Promisify<P & EventEmitter>

  public constructor({
    id,
    parentOrigin: expectedOrigin,
    ...facade
  }: ConsumerOptions<C>) {
    super({id, expectedOrigin})

    const events = new EventEmitter()

    events.setMaxListeners(0)
    this.connectedWindow = window.opener || window.parent
    this.consumer = this.facade = Object.assign(events, facade as C)

    this.initialize()
  }

  private async initialize() {
    const message: InitializeMessage = {
      type: 'initialize',
      args: [this.consumer],
      waitResponse: true
    }

    const {
      response: {result},
      id: responseToId
    } = await this.sendMessage(message)

    this.provider = result[0]

    this.sendMessage({type: 'response', responseToId})
    this.emit('ready', this.provider)
  }
}

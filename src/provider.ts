import EventEmitter from 'events'
import {
  Transport,
  InitializeMessage,
  ResponseMessage,
  Received,
  TransportOptions
} from './Transport'

export interface ProviderOptions<T> extends TransportOptions {
  facade?: T
}

export class Provider<P, C> extends Transport {
  public provider: P & EventEmitter
  public facade: P & EventEmitter
  public consumer?: C & EventEmitter

  public constructor({
    id,
    expectedOrigin,
    connectedWindow,
    facade
  }: ProviderOptions<P>) {
    super({id, expectedOrigin, connectedWindow})
    const events = new EventEmitter()
    events.setMaxListeners(0)
    this.provider = this.facade = Object.assign(events, facade)
  }

  handleInitialize(
    {id, args}: Received<InitializeMessage>,
    source?: Window
  ): void {
    if (!this.connectedWindow) this.connectedWindow = source
    const [consumerInterface] = args
    this.consumer = consumerInterface
    const message: ResponseMessage = {
      type: 'response',
      response: {result: [this.provider]},
      responseToId: id,
      waitResponse: true
    }
    this.sendMessage(message).then(() => this.emit('ready', consumerInterface))
  }
}

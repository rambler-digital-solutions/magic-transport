import EventEmitter from 'events'
import {Transport} from './transport'
import type {
  InitializeMessage,
  ResponseMessage,
  Received,
  TransportOptions
} from './transport'

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
    this.emit('ready', consumerInterface)
  }
}

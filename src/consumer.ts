import EventEmitter from 'events'
import {Transport} from './transport'
import type {TransportOptions, InitializeMessage} from './transport'

export interface ConsumerOptions<T>
  extends Omit<TransportOptions, 'connectedWindow'> {
  facade?: T
}

export class Consumer<P, C> extends Transport {
  public consumer: C & EventEmitter
  public facade: C & EventEmitter
  public provider?: P & EventEmitter

  public constructor({id, expectedOrigin, facade}: ConsumerOptions<C>) {
    super({id, expectedOrigin})

    const events = new EventEmitter()

    events.setMaxListeners(0)
    this.connectedWindow = window.opener || window.parent
    this.consumer = this.facade = Object.assign(events, facade)

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

    await this.sendMessage({type: 'response', responseToId})
    this.emit('ready', this.provider)
  }
}

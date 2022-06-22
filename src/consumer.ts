import {Transport, TransportOptions, InitializeMessage} from './Transport'
import EventEmitter from 'events'

export interface ConsumerOptions<T> extends Omit<TransportOptions, 'connectedWindow'> {
  facade?: T
}

export class Consumer<P, C> extends Transport {
  public consumer: C & EventEmitter
  public facade: C & EventEmitter
  public provider?: P & EventEmitter

  public constructor({
    id,
    expectedOrigin,
    facade
  }: ConsumerOptions<C>) {
    super({id, expectedOrigin})
    const events = new EventEmitter()
    events.setMaxListeners(0)
    this.connectedWindow = window.opener || window.parent
    this.consumer = this.facade = Object.assign(events, facade)
    const message: InitializeMessage = {
      type: 'initialize',
      args: [this.consumer],
      waitResponse: true
    }
    this.sendMessage(message).then(({response: {result}, id: responseToId}) => {
      this.provider = result[0]
      this.sendMessage({type: 'response', responseToId})
      this.emit('ready', this.provider)
    })
  }
}

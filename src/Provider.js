import Transport from './Transport'
import EventEmitter from 'events'

export default class Provider extends Transport {

  constructor(id, expectedOrigin, facade) {
    super(id, expectedOrigin)
    const events = new EventEmitter
    Object.assign(events, facade)
    events.setMaxListeners(0)
    this.provider = this.facade = events
  }

  handleInitialize({ id, args }, source) {
    if (!this.connectedWindow)
      this.connectedWindow = source
    const [consumerInterface] = args
    this.consumer = consumerInterface
    this.sendMessage({
      type: 'response',
      response: { result: [this.provider] },
      responseToId: id,
      waitResponse: true
    }).then(() => {
      this.emit('ready', consumerInterface)
    })
  }

}

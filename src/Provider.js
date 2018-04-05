import Transport from './Transport'
import EventEmitter from 'events'

export default class Provider extends Transport {

  constructor(id, expectedOrigin, connectedWindow, facade) {
    if (!facade) {
      facade = connectedWindow
      connectedWindow = null
    }
    super(id, expectedOrigin, connectedWindow)
    const events = new EventEmitter
    events.setMaxListeners(0)
    this.provider = this.facade = { ...events, ...facade }
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

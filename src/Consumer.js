import Transport from './Transport'
import EventEmitter from 'events'

export default class Consumer extends Transport {

  constructor(id, expectedOrigin, facade) {
    super(id, expectedOrigin)
    const events = new EventEmitter
    events.setMaxListeners(0)
    this.connectedWindow = window.opener || window.parent
    this.consumer = this.facade = Object.assign(events, facade)
    this.sendMessage({
      type: 'initialize',
      args: [this.consumer],
      waitResponse: true
    }).then(({ response: { result }, id: responseToId }) => {
      this.provider = result[0]
      this.sendMessage({ type: 'response', responseToId })
      this.emit('ready', this.provider)
    })
  }

}

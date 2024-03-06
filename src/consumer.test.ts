import {Consumer} from './consumer'

Object.defineProperty(window, 'postMessage', {
  value: jest.fn()
})

describe('Consumer', () => {
  it('should initialize correctly', () => {
    const consumer = new Consumer({
      id: 'testId',
      expectedOrigin: '*',
      facade: {}
    })

    expect(consumer.consumer).toBeDefined()
    expect(consumer.facade).toBeDefined()
  })

  it('should handle initialize message', async () => {
    const onReady = jest.fn()

    const consumer = new Consumer({
      id: 'testId',
      expectedOrigin: '*',
      facade: {}
    })

    consumer.on('ready', onReady)

    const message: any = {
      type: 'initialize',
      args: ['consumerInterface'],
      waitResponse: true
    }

    const promise = (consumer as any).initialize(message, window)

    consumer.emit(`response:2`, {response: {result: [window]}})
    await promise

    expect(consumer.provider).toBeDefined()
    expect(onReady).toHaveBeenCalled()
    expect(window.postMessage).toHaveBeenCalled()
  })
})

# Magic transport
Библиотека для транспорта между iframe и родительским окном.

## Установка
```
npm install --save magic-transport
```

## Использование
На стороне страницы, на которой вставлен `iframe` (это страница `Provider`), вставьте следующий код:
```js
import { Provider } from 'magic-transport'

const iframeOrigin = '*'
const sharedObject = {
  hello: {
    from: {
      provider: function () {
        return 'hello from provider'
      }
    }
  }
}
const transport = new Provider('YOUR_UNIQ_ID_HERE', iframeOrigin, sharedObject)

transport.once('ready', function () {
  const consumer = transport.consumer
  consumer.hello.from.consumer().then(result => {
    console.log(result === 'hello from provider') // true
  })
  consumer.mySetTimeout(function (result) {
    console.log(result === 'hello from consumer') // true
  }, 1000)
  consumer.on('my_event', function (result) {
    console.log(result.foo === 'bar')
  })
  console.log(transport.connectedOrigin) // origin присоединенного документа
})
```
<br><br>
На стороне страницы, загруженной внутри `iframe` (это страница `Consumer`), вставьте следующий код:
```js
import { Consumer } from 'magic-transport'

const parentOrigin = '*'
const sharedObject = {
  hello: {
    from: {
      consumer: function () {
        return transport.provider.hello.from.provider()
      }
    }
  },
  mySetTimeout: function (callback, timeout) {
    setTimeout(function () { callback('hello from consumer') }, timeout)
  }
}

const transport = new Consumer('YOUR_UNIQ_ID_HERE', parentOrigin, sharedObject)
transport.once('ready', function () {
  setTimeout(function () {
    transport.consumer.emit('my_event', { foo: 'bar' })
  }, 1000)
  console.log(transport.connectedOrigin) // origin присоединенного документа
})
```
<br><br>
Таким образом любые интерфейсы Consumer и Provider могут возвращать любые значения, они будут отрезолвлены как Promise. Переданные функции будут так же вызваны.

Так же Consumer и Provider наследуют интерфейс [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter).

<br><br>
### Присоединение к произвольному окну/iframe
```js
import { Provider } from 'magic-transport'

const iframeOrigin = '*'
const sharedObject = {
  hello: {
    from: {
      provider: function () {
        return 'hello from provider'
      }
    }
  }
}

const iframe = document.createElement('iframe')
iframe.src = 'https://weather.rambler.ru'
document.body.appendChild(iframe)

const transport = new Provider(
  'YOUR_UNIQ_ID_HERE', 
  iframeOrigin, 
  iframe.contentWindow, 
  sharedObject
)
```

## TODO
* [ ] Написать тесты.

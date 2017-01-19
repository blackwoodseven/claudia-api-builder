'use strict';
const PathParser = require('pathparser')

class Raw {
  constructor(response) {
    this.response = response
  }
}

class YaarhLib {
  constructor() {
    this._routes = {
      get: new PathParser,
      post: new PathParser,
      put: new PathParser,
      delete: new PathParser,
      options: new PathParser,
      head: new PathParser,
      patch: new PathParser
    }
    this._interceptors = []
    this.handler = this.handler.bind(this)
  }

  register (method, path, handler) {
    const self = this;
    this._routes[method].add(path, function() {
      self.exec(handler, this)
    })
  }

  get(path, handler) {
    this.register('get', path, handler)
  }
  post(path, handler){
    this.register('post', path, handler)
  }
  put(path, handler){
    this.register('put', path, handler)
  }
  delete(path, handler){
    this.register('delete', path, handler)
  }
  options(path, handler){
    this.register('options', path, handler)
  }
  head(path, handler){
    this.register('head', path, handler)
  }
  patch(path, handler){
    this.register('patch', path, handler)
  }
  any(path, handler){
    this.register('get', path, handler)
    this.register('post', path, handler)
    this.register('put', path, handler)
    this.register('delete', path, handler)
    this.register('options', path, handler)
    this.register('head', path, handler)
    this.register('patch', path, handler)
  }

  intercept(handler){
    this._interceptors.push(handler)
  }

  response(body){
    return this._callback(null, {
      statusCode: 200,
      body: JSON.stringify(body),
      headers: {'Content-Type' : 'application/json'}
    })
  }

  exec(handler, pathParameters) {
    //pathParameters come from pathparser library
    //and it is attaching a pathParameters.url on that we just don't want
    //so we remove it
    console.log('YaarhLogs: pathParameters:', pathParameters)
    delete pathParameters.url
    console.log('YaarhLogs: pathParameters:', pathParameters)

    const event = Object.assign({}, this._currentEvent, { pathParameters })

    const shouldStop = this._interceptors.reduce(
        (shouldStop, interceptor) => shouldStop || interceptor(event),
        false
    )
    if (shouldStop) {
      return this._callback({ message: shouldStop })
    }

    handler(event)
      .then( data => {
        console.log('YaarhLogs: YAARH event:', event)
        console.log('YaarhLogs: YAARH this._currentEvent:', this._currentEvent)
        if (data instanceof Raw) {
          this._callback(null, data.response)
        }
        this.response(data)
      })
      .catch( err => this._callback(err))
  }

  handler(event, lambdaContext, callback) {
    console.log('YaarhLogs: Processing event:', event)
    const method = event.httpMethod.toLowerCase()
    this._currentEvent = Object.assign({}, event, { lambdaContext })
    this._callback = callback
    
    const executed = this._routes[method].run('/'+event.pathParameters.proxy)
    console.log('YaarhLogs: Path match found?', executed)
    if(!executed){
      this._callback(null, {
        statusCode: 404,
        headers: { 'Content-Type' : 'application/json' },
        body: '{"message":"Resource not found"}'
      })
    }
  }
}
YaarhLib.Raw = Raw

module.exports = YaarhLib

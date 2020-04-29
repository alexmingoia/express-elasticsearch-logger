# express-elasticsearch-logger [![Build Status](http://img.shields.io/travis/alexmingoia/express-elasticsearch-logger.svg?style=flat)](http://travis-ci.org/alexmingoia/express-elasticsearch-logger) [![Code Coverage](http://img.shields.io/coveralls/alexmingoia/express-elasticsearch-logger.svg?style=flat)](https://coveralls.io/r/alexmingoia/express-elasticsearch-logger) [![NPM version](http://img.shields.io/npm/v/express-elasticsearch-logger.svg?style=flat)](https://www.npmjs.org/package/express-elasticsearch-logger) [![Dependency Status](http://img.shields.io/david/alexmingoia/express-elasticsearch-logger.svg?style=flat)](https://david-dm.org/alexmingoia/express-elasticsearch-logger)

> Log Express app requests to ElasticSearch.

## Installation

Install using [npm](https://www.npmjs.org/):

```sh
npm install @rentspree/express-elasticsearch-logger
```

## API Reference
<a name="module_express-elasticsearch-logger"></a>

## express-elasticsearch-logger

* [express-elasticsearch-logger](#module_express-elasticsearch-logger)
    * [.doc](#module_express-elasticsearch-logger.doc) : <code>Object</code>
    * [.requestHandler(config, [client])](#module_express-elasticsearch-logger.requestHandler) ⇒ <code>elasticsearchLoggerMiddleware</code>
    * [.errorHandler(err, req, res, next)](#module_express-elasticsearch-logger.errorHandler)
    * [.skipLog(req, res, next)](#module_express-elasticsearch-logger.skipLog)

<a name="module_express-elasticsearch-logger.doc"></a>

### express-elasticsearch-logger.doc : <code>Object</code>
Document indexed with ElasticSearch. `request` and `response` properties
are included if they are whitelisted by `config.whitelist`.

**Kind**: static constant of [<code>express-elasticsearch-logger</code>](#module_express-elasticsearch-logger)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| env | <code>String</code> | defaults to "development" |
| [error] | <code>Error</code> | error object passed to `next()` |
| duration | <code>Number</code> | milliseconds between request and response |
| request | <code>Object</code> | requst object detail of express |
| request.httpVersion | <code>String</code> |  |
| request.headers | <code>Object</code> |  |
| request.method | <code>String</code> |  |
| request.originalUrl | <code>String</code> |  |
| request.route.path | <code>String</code> |  |
| request.path | <code>String</code> |  |
| request.query | <code>Object</code> |  |
| response | <code>Object</code> |  |
| response.statusCode | <code>Number</code> |  |
| os | <code>Object</code> |  |
| os.totalmem | <code>Number</code> | OS total memory in bytes |
| os.freemem | <code>Number</code> | OS free memory in bytes |
| os.loadavg | <code>Array.&lt;Number&gt;</code> | Array of 5, 10, and 15 min averages |
| process | <code>Object</code> |  |
| process.memoryUsage | <code>Number</code> | process memory in bytes |
| @timestamp | <code>String</code> | ISO time of request |

<a name="module_express-elasticsearch-logger.requestHandler"></a>

### express-elasticsearch-logger.requestHandler(config, [client]) ⇒ <code>elasticsearchLoggerMiddleware</code>
Returns Express middleware configured according to given `options`.

Middleware must be mounted before all other middleware to ensure accurate
capture of requests. The error handler must be mounted before other error
handler middleware.

**Kind**: static method of [<code>express-elasticsearch-logger</code>](#module_express-elasticsearch-logger)  
**Returns**: <code>elasticsearchLoggerMiddleware</code> - express middleware  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| config | <code>Object</code> |  | elasticsearch configuration |
| [config.host] | <code>String</code> | <code>&quot;http://localhost:9200&quot;</code> | elasticsearch host to connect |
| [config.index] | <code>String</code> | <code>&quot;log_[YYYY]-h[1|2]&quot;</code> | elasticsearch index (default: log_YYYY-h1 or log_YYYY-h2 bi-annually) |
| config.whitelist | <code>Object</code> |  |  |
| [config.whitelist.request] | <code>Array.&lt;String&gt;</code> | <code>[&quot;userId&quot;,&quot;body&quot;,&quot;email&quot;,&quot;httpVersion&quot;,&quot;headers&quot;,&quot;method&quot;,&quot;originalUrl&quot;,&quot;path&quot;,&quot;query&quot;]</code> | request properties to log |
| [config.whitelist.response] | <code>Array.&lt;String&gt;</code> | <code>[&quot;statusCode&quot;, &quot;sent&quot;, &quot;took&quot;]</code> | response properties to log |
| [config.censor] | <code>Array.&lt;String&gt;</code> | <code>[&quot;password&quot;]</code> | list of request body properties to censor |
| [config.includeDefault] | <code>Boolean</code> | <code>true</code> | include default whitelist and censor the the given config |
| [config.indexPrefix] | <code>String</code> | <code>&quot;log&quot;</code> | elasticsearch index prefix for running index |
| [config.indexSuffixBy] | <code>String</code> | <code>&quot;halfYear&quot;</code> | elasticsearch index suffix for running index, one of m M <Monthly> q Q <Quarterly> h H <Bi-annually> |
| [config.indexSettings] | <code>Object</code> |  | settings in the mapping to be created |
| [client] | <code>elasticsearch.Client</code> |  | @elastic/elasticsearch client to be injected |

**Example**  
```javascript
const express = require('express');
const logger = require('express-elasticsearch-logger');

const app = express();

app
  .use(logger.requestHandler({
    host: 'http://localhost:9200'
  })
  .get('/', function (req, res, next) {
    res.sendStatus(204);
  })
  .use(logger.errorHandler);
```

* [.requestHandler(config, [client])](#module_express-elasticsearch-logger.requestHandler) ⇒ <code>elasticsearchLoggerMiddleware</code>
<a name="module_express-elasticsearch-logger.errorHandler"></a>

### express-elasticsearch-logger.errorHandler(err, req, res, next)
Error handler middleware exposes error to `Response#end`

This middleware is used in combination with
[requestHandler](#module_express-elasticsearch-logger.requestHandler) to capture request
errors.

**Kind**: static method of [<code>express-elasticsearch-logger</code>](#module_express-elasticsearch-logger)  

| Param | Type |
| --- | --- |
| err | <code>Error</code> | 
| req | <code>express.Request</code> | 
| res | <code>express.Response</code> | 
| next | <code>express.Request.next</code> | 

<a name="module_express-elasticsearch-logger.skipLog"></a>

### express-elasticsearch-logger.skipLog(req, res, next)
This middleware will mark for skip log
use this middleware for endpoint that is called too often and did not need to log
like healthcheck

**Kind**: static method of [<code>express-elasticsearch-logger</code>](#module_express-elasticsearch-logger)  

| Param | Type |
| --- | --- |
| req | <code>express.Request</code> | 
| res | <code>express.Response</code> | 
| next | <code>express.Request.next</code> | 


## Contributing

Please submit all issues and pull requests to the [alexmingoia/express-elasticsearch-logger](http://github.com/alexmingoia/express-elasticsearch-logger) repository!

## Tests

Run tests using `npm test`.

## Support

If you have any problem or suggestion please open an issue [here](https://github.com/alexmingoia/express-elasticsearch-logger/issues).

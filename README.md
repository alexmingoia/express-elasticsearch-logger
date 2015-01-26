# express-elasticsearch-logger [![Build Status](http://img.shields.io/travis/alexmingoia/express-elasticsearch-logger.svg?style=flat)](http://travis-ci.org/alexmingoia/express-elasticsearch-logger) [![Code Coverage](http://img.shields.io/coveralls/alexmingoia/express-elasticsearch-logger.svg?style=flat)](https://coveralls.io/r/alexmingoia/express-elasticsearch-logger) [![NPM version](http://img.shields.io/npm/v/express-elasticsearch-logger.svg?style=flat)](https://www.npmjs.org/package/express-elasticsearch-logger) [![Dependency Status](http://img.shields.io/david/alexmingoia/express-elasticsearch-logger.svg?style=flat)](https://david-dm.org/alexmingoia/express-elasticsearch-logger)

> Log Express app requests to ElasticSearch.

## Installation

Install using [npm](https://www.npmjs.org/):

```sh
npm install express-elasticsearch-logger
```

## API Reference

**Members**

* [express-elasticsearch-logger](#module_express-elasticsearch-logger)
  * [logger.document](#module_express-elasticsearch-logger.document)
  * [logger.requestHandler(config, [client])](#module_express-elasticsearch-logger.requestHandler)
  * [logger.errorHandler(err, req, res, next)](#module_express-elasticsearch-logger.errorHandler)

<a name="module_express-elasticsearch-logger.document"></a>
##logger.document
Document indexed with ElasticSearch. `request` and `response` properties
are included if they are whitelisted by `config.whitelist`.

**Properties**

- env `String` - defaults to "development"  
- error `Error` - error object passed to `next()`  
- duration `Number` - milliseconds between request and response  
- request `Object`  
  - request.httpVersion `String`  
  - request.headers `Object`  
  - request.method `String`  
  - request.originalUrl `String`  
  - request.path `String`  
  - request.query `Object`  
- response `Object`  
  - response.statusCode `Number`  
- os `Object`  
  - os.totalmem `Number` - OS total memory in bytes  
  - os.freemem `Number` - OS free memory in bytes  
  - os.loadavg `Array.<Number>` - Array of 5, 10, and 15 min averages  
- process `Object`  
  - process.memoryUsage `Number` - process memory in bytes  
- timestamp `String` - ISO time of request  

**Type**: `Object`  
<a name="module_express-elasticsearch-logger.requestHandler"></a>
##logger.requestHandler(config, [client])
Returns Express middleware configured according to given `options`.

Middleware must be mounted before all other middleware to ensure accurate
capture of requests. The error handler must be mounted before other error
handler middleware.

**Params**

- config `Object` - elasticsearch configuration  
  - \[index\] `String` - elasticsearch index (default: log_YEAR_MONTH)  
  - \[type\] `String` - elasticsearch document type (default: request)  
  - whitelist `Object`  
  - request `Array.<String>` - request properties to log  
  - response `Array.<String>` - response properties to log  
  - censor `Array.<String>` - list of request body properties to censor  
- \[client\] `elasticsearch.Client` - elasticsearch client  

**Returns**: `elasticsearchLoggerMiddleware` - express middleware  
**Example**  
```javascript
var express = require('express');
var logger = require('express-elasticsearch-logger');

var app = express();

app
  .use(logger.requestHandler({
    host: 'http://localhost:9200'
  })
  .get('/', function (req, res, next) {
    res.sendStatus(204);
  })
  .use(logger.errorHandler);
```

<a name="module_express-elasticsearch-logger.errorHandler"></a>
##logger.errorHandler(err, req, res, next)
Error handler middleware exposes error to `Response#end`

This middleware is used in combination with
[requestHandler](#module_express-elasticsearch-logger.requestHandler) to capture request
errors.

**Params**

- err `Error`  
- req `express.Request`  
- res `express.Response`  
- next `express.Request.next`  

## Contributing

Please submit all issues and pull requests to the [alexmingoia/express-elasticsearch-logger](http://github.com/alexmingoia/express-elasticsearch-logger) repository!

## Tasks

List available tasks with `gulp help`.

## Tests

Run tests using `npm test` or `gulp test`.

## Support

If you have any problem or suggestion please open an issue [here](https://github.com/alexmingoia/express-elasticsearch-logger/issues).

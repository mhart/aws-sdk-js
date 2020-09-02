(function() {
  var AWS, Buffer, EventEmitter, MockCredentialsProvider, MockService, _createSpy, _it, _spyOn, globalEvents, ignoreRequire, matchXML, mockHttpResponse, mockHttpSuccessfulResponse, mockIntermittentFailureResponse, mockResponse, mockResponses, operationsForRequests, setupMockResponse, spies, topLevelScope;

  AWS = null;

  topLevelScope = null;

  ignoreRequire = require;

  // import SDK for tests that do not access the AWS namespace
  require('../index');

  if (typeof window === 'undefined') {
    AWS = ignoreRequire('../lib/aws');
    topLevelScope = global;
  } else {
    AWS = window.AWS;
    topLevelScope = window;
  }

  if (topLevelScope.jasmine) {
    topLevelScope.jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
  }

  _it = it;

  topLevelScope.it = function(label, fn) {
    if (label.match(/\(no phantomjs\)/) && navigator && navigator.userAgent.match(/phantomjs/i)) {
      return;
    }
    return _it(label, fn);
  };

  EventEmitter = require('events').EventEmitter;

  Buffer = AWS.util.Buffer;

  require('util').print = function(data) {
    return process.stdout.write(data);
  };

  AWS.config.update({
    paramValidation: false,
    region: 'mock-region',
    credentials: {
      accessKeyId: 'akid',
      secretAccessKey: 'secret',
      sessionToken: 'session'
    }
  });

  spies = null;

  beforeEach(function() {
    return spies = [];
  });

  afterEach(function() {
    var results1, spy;
    results1 = [];
    while (spies.length > 0) {
      spy = spies.pop();
      if (spy.isOwnMethod) {
        results1.push(spy.object[spy.methodName] = spy.origMethod);
      } else {
        results1.push(delete spy.object[spy.methodName]);
      }
    }
    return results1;
  });

  _createSpy = function(name) {
    var spy;
    spy = function() {
      spy.calls.push({
        object: this,
        'arguments': Array.prototype.slice.call(arguments)
      });
      if (spy.callFn) {
        return spy.callFn.apply(spy.object, arguments);
      }
      if (spy.shouldReturn) {
        return spy.returnValue;
      }
    };
    spy.object = this;
    spy.methodName = name;
    spy.origMethod = this[name];
    spy.callFn = null;
    spy.shouldReturn = false;
    spy.returnValue = null;
    spy.calls = [];
    spy.andReturn = function(value) {
      spy.shouldReturn = true;
      spy.returnValue = value;
      return spy;
    };
    spy.andCallFake = function(fn) {
      spy.callFn = fn;
      return spy;
    };
    spy.andCallThrough = function() {
      spy.callFn = spy.origMethod;
      return spy;
    };
    if (Object.prototype.hasOwnProperty.call(this, name)) {
      spy.isOwnMethod = true;
    }
    this[name] = spy;
    return spy;
  };

  _spyOn = function(obj, methodName) {
    var spy;
    spy = _createSpy.call(obj, methodName);
    spies.push(spy);
    return spy;
  };

  topLevelScope.setTimeoutOrig = topLevelScope.setTimeout;

  topLevelScope.setTimeout = function(fn) {
    return fn();
  };

  topLevelScope.expect = require('chai').expect;

  matchXML = function(xml1, xml2) {
    var parser, results;
    results = [];
    parser = new (require('xml2js').Parser)();
    [xml1, xml2].forEach(function(xml) {
      return parser.parseString(xml, function(e, r) {
        if (e) {
          throw e;
        }
        return results.push(r);
      });
    });
    return expect(results[0]).to.eql(results[1]);
  };

  MockService = AWS.Service.defineService('mock', {
    serviceIdentifier: 'mock',
    initialize: function(config) {
      AWS.Service.prototype.initialize.call(this, config);
      this.config.credentials = {
        accessKeyId: 'akid',
        secretAccessKey: 'secret'
      };
      return this.config.region = 'mock-region';
    },
    setupRequestListeners: function(request) {
      request.on('extractData', function(resp) {
        return resp.data = (resp.httpResponse.body || '').toString();
      });
      return request.on('extractError', function(resp) {
        return resp.error = {
          code: (resp.httpResponse.body || '').toString() || resp.httpResponse.statusCode,
          message: null
        };
      });
    },
    api: new AWS.Model.Api({
      metadata: {
        endpointPrefix: 'mockservice',
        signatureVersion: 'v4'
      }
    })
  });

  MockServiceFromApi = function(customApi) {
    if (!customApi.metadata) {
      customApi.metadata = {};
      customApi.metadata.endpointPrefix = 'mockservice';
      customApi.metadata.signatureVersion = 'v4';
    }
    return AWS.Service.defineService('mock', {
      serviceIdentifier: 'mock',
      initialize: function(config) {
        AWS.Service.prototype.initialize.call(this, config);
        this.config.credentials = {
          accessKeyId: 'akid',
          secretAccessKey: 'secret'
        };
        this.config.region = this.config.region || 'mock-region';
      },
      api: new AWS.Model.Api(customApi)
    });
  };

  mockHttpSuccessfulResponse = function(status, headers, data, cb) {
    var httpResp;
    if (!Array.isArray(data)) {
      data = [data];
    }
    httpResp = new EventEmitter();
    httpResp.pipe = function(destination) {
      process.nextTick(function() {
        AWS.util.arrayEach(data.slice(), function(str) {
          destination.write(str);
        });

        destination.end();
      });
      return destination;
    };
    httpResp.statusCode = status;
    httpResp.headers = headers;
    cb(httpResp);
    httpResp.emit('headers', status, headers);
    if (AWS.util.isNode() && httpResp._events.readable) {
      httpResp.read = function() {
        var chunk;
        if (data.length > 0) {
          chunk = data.shift();
          if (chunk === null) {
            return null;
          } else {
            return AWS.util.buffer.toBuffer(chunk);
          }
        } else {
          return null;
        }
      };
    }
    AWS.util.arrayEach(data.slice(), function(str) {
      if (AWS.util.isNode() && httpResp._events.readable) {
        return httpResp.emit('readable');
      } else {
        return httpResp.emit('data', AWS.util.buffer.toBuffer(str));
      }
    });
    if (httpResp._events['readable'] || httpResp._events['data']) {
      return httpResp.emit('end');
    } else {
      return httpResp.emit('aborted');
    }
  };

  mockHttpResponse = function(status, headers, data) {
    var stream = new EventEmitter();
    stream.setMaxListeners(0);
    _spyOn(AWS.HttpClient, 'getInstance');
    AWS.HttpClient.getInstance.andReturn({
      handleRequest: function(req, opts, cb, errCb) {
        if (typeof status === 'number') {
          mockHttpSuccessfulResponse(status, headers, data, cb);
        } else {
          errCb(status);
        }
        return stream;
      }
    });

    return stream;
  };

  mockIntermittentFailureResponse = function(numFailures, status, headers, data) {
    var retryCount;
    retryCount = 0;
    _spyOn(AWS.HttpClient, 'getInstance');
    return AWS.HttpClient.getInstance.andReturn({
      handleRequest: function(req, opts, cb, errCb) {
        var ref, statusCode;
        if (retryCount < numFailures) {
          retryCount += 1;
          errCb({
            code: 'NetworkingError',
            message: 'FAIL!'
          });
        } else {
          statusCode = (ref = retryCount < numFailures) != null ? ref : {
            500: status
          };
          mockHttpSuccessfulResponse(statusCode, headers, data, cb);
        }
        return new EventEmitter();
      }
    });
  };

  globalEvents = null;

  beforeEach(function() {
    return globalEvents = AWS.events;
  });

  afterEach(function() {
    return AWS.events = globalEvents;
  });

  setupMockResponse = function(cb) {
    AWS.events = new AWS.SequentialExecutor();
    return AWS.events.on('validate', function(req) {
      ['sign', 'send'].forEach(function(evt) {
        return req.removeAllListeners(evt);
      });
      req.removeListener('extractData', AWS.EventListeners.CorePost.EXTRACT_REQUEST_ID);
      req.removeListener('extractError', AWS.EventListeners.CorePost.EXTRACT_REQUEST_ID);
      Object.keys(AWS.EventListeners).forEach(function(ns) {
        if (AWS.EventListeners[ns].EXTRACT_DATA) {
          req.removeListener('extractData', AWS.EventListeners[ns].EXTRACT_DATA);
        }
        if (AWS.EventListeners[ns].EXTRACT_ERROR) {
          return req.removeListener('extractError', AWS.EventListeners[ns].EXTRACT_ERROR);
        }
      });
      req.response.httpResponse.statusCode = 200;
      req.removeListener('validateResponse', AWS.EventListeners.Core.VALIDATE_RESPONSE);
      return req.on('validateResponse', cb);
    });
  };

  mockResponse = function(resp) {
    var reqs;
    reqs = [];
    setupMockResponse(function(response) {
      reqs.push(response.request);
      return AWS.util.update(response, resp);
    });
    return reqs;
  };

  mockResponses = function(resps) {
    var index, reqs;
    index = 0;
    reqs = [];
    setupMockResponse(function(response) {
      var resp;
      reqs.push(response.request);
      resp = resps[index];
      AWS.util.update(response, resp);
      return index += 1;
    });
    return reqs;
  };

  operationsForRequests = function(reqs) {
    return reqs.map(function(req) {
      return req.service.serviceIdentifier + '.' + req.operation;
    });
  };

  MockCredentialsProvider = AWS.util.inherit(AWS.Credentials, {
    constructor: function() {
      return AWS.Credentials.call(this);
    },
    refresh: function(cb) {
      if (this.forceRefreshError) {
        return cb(AWS.util.error(new Error('mock credentials refresh error'), {
          code: 'MockCredentialsProviderFailure'
        }));
      } else {
        this.expired = false;
        this.accessKeyId = 'akid';
        this.secretAccessKey = 'secret';
        return cb();
      }
    }
  });

  module.exports = {
    AWS: AWS,
    util: AWS.util,
    spyOn: _spyOn,
    createSpy: _createSpy,
    matchXML: matchXML,
    mockHttpResponse: mockHttpResponse,
    mockIntermittentFailureResponse: mockIntermittentFailureResponse,
    mockHttpSuccessfulResponse: mockHttpSuccessfulResponse,
    mockResponse: mockResponse,
    mockResponses: mockResponses,
    operationsForRequests: operationsForRequests,
    MockService: MockService,
    MockServiceFromApi: MockServiceFromApi,
    MockCredentialsProvider: MockCredentialsProvider
  };

}).call(this);

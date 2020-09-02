(function() {
  var AWS, MockService, helpers, metadata,
    hasProp = {}.hasOwnProperty;

  helpers = require('./helpers');

  AWS = helpers.AWS;

  MockService = helpers.MockService;

  metadata = require('../apis/metadata.json');

  describe('AWS.Service', function() {
    var config, retryableError, service;
    config = null;
    service = null;
    retryableError = function(error, result) {
      return expect(service.retryableError(error)).to.eql(result);
    };
    beforeEach(function(done) {
      config = new AWS.Config();
      service = new AWS.Service(config);
      return done();
    });
    describe('apiVersions', function() {
      return it('should set apiVersions property', function() {
        var CustomService;
        CustomService = AWS.Service.defineService('custom', ['2001-01-01', '1999-05-05']);
        return expect(CustomService.apiVersions).to.eql(['1999-05-05', '2001-01-01']);
      });
    });

    describe('constructor', function() {
      it('should use AWS.config copy if no config is provided', function() {
        service = new AWS.Service();
        expect(service.config).not.to.equal(AWS.config);
        return expect(service.config.sslEnabled).to.equal(true);
      });

      it('should merge custom options on top of global defaults if config provided', function() {
        service = new AWS.Service({
          maxRetries: 5
        });
        expect(service.config.sslEnabled).to.equal(true);
        return expect(service.config.maxRetries).to.equal(5);
      });

      it('should inherit the config from global config if it is not set specificly', function() {
        var s3;
        AWS.config.update({
          correctClockSkew: true,
          systemClockOffset: 120000
        });
        s3 = new AWS.S3;
        expect(s3.config.systemClockOffset).to.equal(120000);
        return expect(s3.config.correctClockSkew).to.equal(true);
      });

      it('merges service-specific configuration from global config', function() {
        var s3;
        AWS.config.update({
          s3: {
            endpoint: 'localhost'
          }
        });
        s3 = new AWS.S3;
        expect(s3.endpoint.host).to.equal('localhost');
        return delete AWS.config.s3;
      });

      it('service-specific global config overrides global config', function() {
        var region, s3;
        region = AWS.config.region;
        AWS.config.update({
          region: 'us-west-2',
          s3: {
            region: 'eu-west-1'
          }
        });
        s3 = new AWS.S3;
        expect(s3.config.region).to.equal('eu-west-1');
        AWS.config.region = region;
        return delete AWS.config.s3;
      });

      it('service-specific local config overrides service-specific global config', function() {
        var s3;
        AWS.config.update({
          s3: {
            region: 'us-west-2'
          }
        });
        s3 = new AWS.S3({
          region: 'eu-west-1'
        });
        expect(s3.config.region).to.equal('eu-west-1');
        return delete AWS.config.s3;
      });

      it('merges credential data into config', function() {
        service = new AWS.Service({
          accessKeyId: 'foo',
          secretAccessKey: 'bar'
        });
        expect(service.config.credentials.accessKeyId).to.equal('foo');
        return expect(service.config.credentials.secretAccessKey).to.equal('bar');
      });

      it('should allow AWS.config to be object literal', function() {
        var cfg;
        cfg = AWS.config;
        AWS.config = {
          maxRetries: 20
        };
        service = new AWS.Service({});
        expect(service.config.maxRetries).to.equal(20);
        expect(service.config.sslEnabled).to.equal(true);
        return AWS.config = cfg;
      });

      it('tries to construct service with latest API version', function() {
        var CustomService, errmsg;
        CustomService = AWS.Service.defineService('custom', ['2001-01-01', '1999-05-05']);
        errmsg = 'Could not find API configuration custom-2001-01-01';
        return expect(function() {
          return new CustomService();
        }).to['throw'](errmsg);
      });

      it('tries to construct service with exact API version match', function() {
        var CustomService, errmsg;
        CustomService = AWS.Service.defineService('custom', ['2001-01-01', '1999-05-05']);
        errmsg = 'Could not find API configuration custom-1999-05-05';
        return expect(function() {
          return new CustomService({
            apiVersion: '1999-05-05'
          });
        }).to['throw'](errmsg);
      });

      it('skips any API versions with a * and uses next (future) service', function() {
        var CustomService, errmsg;
        CustomService = AWS.Service.defineService('custom', ['1998-01-01', '1999-05-05*', '2001-01-01']);
        errmsg = 'Could not find API configuration custom-2001-01-01';
        return expect(function() {
          return new CustomService({
            apiVersion: '2000-01-01'
          });
        }).to['throw'](errmsg);
      });

      it('skips multiple API versions with a * and uses next (future) service', function() {
        var CustomService, errmsg;
        CustomService = AWS.Service.defineService('custom', ['1998-01-01', '1999-05-05*', '1999-07-07*', '2001-01-01']);
        errmsg = 'Could not find API configuration custom-2001-01-01';
        return expect(function() {
          return new CustomService({
            apiVersion: '1999-05-05'
          });
        }).to['throw'](errmsg);
      });

      it('tries to construct service with fuzzy API version match', function() {
        var CustomService, errmsg;
        CustomService = AWS.Service.defineService('custom', ['2001-01-01', '1999-05-05']);
        errmsg = 'Could not find API configuration custom-1999-05-05';
        return expect(function() {
          return new CustomService({
            apiVersion: '2000-01-01'
          });
        }).to['throw'](errmsg);
      });

      it('uses global apiVersion value when constructing versioned services', function() {
        var CustomService, errmsg;
        AWS.config.apiVersion = '2002-03-04';
        CustomService = AWS.Service.defineService('custom', ['2001-01-01', '1999-05-05']);
        errmsg = 'Could not find API configuration custom-2001-01-01';
        expect(function() {
          return new CustomService;
        }).to['throw'](errmsg);
        return AWS.config.apiVersion = null;
      });

      it('uses global apiVersions value when constructing versioned services', function() {
        var CustomService, errmsg;
        AWS.config.apiVersions = {
          custom: '2002-03-04'
        };
        CustomService = AWS.Service.defineService('custom', ['2001-01-01', '1999-05-05']);
        errmsg = 'Could not find API configuration custom-2001-01-01';
        expect(function() {
          return new CustomService;
        }).to['throw'](errmsg);
        return AWS.config.apiVersions = {};
      });

      it('uses service specific apiVersions before apiVersion', function() {
        var CustomService, errmsg;
        AWS.config.apiVersions = {
          custom: '2000-01-01'
        };
        AWS.config.apiVersion = '2002-03-04';
        CustomService = AWS.Service.defineService('custom', ['2001-01-01', '1999-05-05']);
        errmsg = 'Could not find API configuration custom-1999-05-05';
        expect(function() {
          return new CustomService;
        }).to['throw'](errmsg);
        AWS.config.apiVersion = null;
        return AWS.config.apiVersions = {};
      });

      it('tries to construct service with fuzzy API version match', function() {
        var CustomService, errmsg;
        CustomService = AWS.Service.defineService('custom', ['2001-01-01', '1999-05-05']);
        errmsg = 'Could not find API configuration custom-1999-05-05';
        return expect(function() {
          return new CustomService({
            apiVersion: '2000-01-01'
          });
        }).to['throw'](errmsg);
      });

      it('fails if apiVersion matches nothing', function() {
        var CustomService, errmsg;
        CustomService = AWS.Service.defineService('custom', ['2001-01-01', '1999-05-05']);
        errmsg = 'Could not find custom API to satisfy version constraint `1998-01-01\'';
        return expect(function() {
          return new CustomService({
            apiVersion: '1998-01-01'
          });
        }).to['throw'](errmsg);
      });

      it('allows construction of services from one-off apiConfig properties', function() {
        service = new AWS.Service({
          apiConfig: {
            operations: {
              operationName: {
                input: {},
                output: {}
              }
            }
          }
        });
        expect(typeof service.operationName).to.equal('function');
        return expect(service.operationName() instanceof AWS.Request).to.equal(true);
      });

      it('interpolates endpoint when reading from configuration', function() {
        service = new MockService({
          endpoint: '{scheme}://{service}.{region}.domain.tld'
        });
        expect(service.config.endpoint).to.equal('https://mockservice.mock-region.domain.tld');
        service = new MockService({
          sslEnabled: false,
          endpoint: '{scheme}://{service}.{region}.domain.tld'
        });
        return expect(service.config.endpoint).to.equal('http://mockservice.mock-region.domain.tld');
      });

      describe('will work with', function() {
        var allServices, className, ctor, obsoleteVersions, results, serviceIdentifier, version;
        allServices = require('../clients/all');
        results = [];
        for (className in allServices) {
          if (!hasProp.call(allServices, className)) continue;
          ctor = allServices[className];
          serviceIdentifier = className.toLowerCase();
          obsoleteVersions = metadata[serviceIdentifier].versions || [];
          results.push((function() {
            var j, len, results1;
            results1 = [];
            for (j = 0, len = obsoleteVersions.length; j < len; j++) {
              version = obsoleteVersions[j];
              results1.push((function(ctor, id, v) {
                return it(id + ' version ' + v, function() {
                  return expect(function() {
                    return new ctor({
                      apiVersion: v
                    });
                  }).not.to['throw']();
                });
              })(ctor, serviceIdentifier, version));
            }
            return results1;
          })());
        }
        return results;
      });
    });

    describe('setEndpoint', function() {
      var FooService;
      FooService = null;
      beforeEach(function(done) {
        FooService = AWS.util.inherit(AWS.Service, {
          api: {
            endpointPrefix: 'fooservice'
          }
        });
        return done();
      });
      return it('uses specified endpoint if provided', function() {
        service = new FooService();
        service.setEndpoint('notfooservice.amazonaws.com');
        return expect(service.endpoint.host).to.equal('notfooservice.amazonaws.com');
      });
    });
    describe('makeRequest', function() {
      it('it treats params as an optinal parameter', function() {
        helpers.mockHttpResponse(200, {}, ['FOO', 'BAR']);
        service = new MockService();
        return service.makeRequest('operationName', function(err, data) {
          return expect(data).to.equal('FOOBAR');
        });
      });
      it('yields data to the callback', function() {
        var req;
        helpers.mockHttpResponse(200, {}, ['FOO', 'BAR']);
        service = new MockService();
        return req = service.makeRequest('operation', function(err, data) {
          expect(err).to.equal(null);
          return expect(data).to.equal('FOOBAR');
        });
      });
      it('yields service errors to the callback', function() {
        var req;
        helpers.mockHttpResponse(500, {}, ['ServiceError']);
        service = new MockService({
          maxRetries: 0
        });
        return req = service.makeRequest('operation', {}, function(err, data) {
          expect(err.code).to.equal('ServiceError');
          expect(err.message).to.equal(null);
          expect(err.statusCode).to.equal(500);
          expect(err.retryable).to.equal(true);
          return expect(data).to.equal(null);
        });
      });
      it('yields network errors to the callback', function() {
        var error, req;
        error = {
          code: 'NetworkingError'
        };
        helpers.mockHttpResponse(error);
        service = new MockService({
          maxRetries: 0
        });
        return req = service.makeRequest('operation', {}, function(err, data) {
          expect(err).to.eql(error);
          return expect(data).to.equal(null);
        });
      });
      it('does not send the request if a callback function is omitted', function() {
        var httpClient;
        helpers.mockHttpResponse(200, {}, ['FOO', 'BAR']);
        httpClient = AWS.HttpClient.getInstance();
        helpers.spyOn(httpClient, 'handleRequest');
        new MockService().makeRequest('operation');
        return expect(httpClient.handleRequest.calls.length).to.equal(0);
      });
      it('allows parameter validation to be disabled in config', function() {
        var req;
        helpers.mockHttpResponse(200, {}, ['FOO', 'BAR']);
        service = new MockService({
          paramValidation: false
        });
        return req = service.makeRequest('operation', {}, function(err, data) {
          expect(err).to.equal(null);
          return expect(data).to.equal('FOOBAR');
        });
      });
      describe('bound parameters', function() {
        it('accepts toplevel bound parameters on the service', function() {
          var req;
          service = new AWS.S3({
            params: {
              Bucket: 'bucket',
              Key: 'key'
            }
          });
          req = service.makeRequest('getObject');
          return expect(req.params).to.eql({
            Bucket: 'bucket',
            Key: 'key'
          });
        });
        it('ignores bound parameters not in input members', function() {
          var req;
          service = new AWS.S3({
            params: {
              Bucket: 'bucket',
              Key: 'key'
            }
          });
          req = service.makeRequest('listObjects');
          return expect(req.params).to.eql({
            Bucket: 'bucket'
          });
        });
        return it('can override bound parameters', function() {
          var params, req;
          service = new AWS.S3({
            params: {
              Bucket: 'bucket',
              Key: 'key'
            }
          });
          params = {
            Bucket: 'notBucket'
          };
          req = service.makeRequest('listObjects', params);
          expect(params).not.to.equal(req.params);
          return expect(req.params).to.eql({
            Bucket: 'notBucket'
          });
        });
      });
      describe('global events', function() {
        return it('adds AWS.events listeners to requests', function() {
          var event;
          helpers.mockHttpResponse(200, {}, ['FOO', 'BAR']);
          event = helpers.createSpy();
          AWS.events.on('complete', event);
          new MockService().makeRequest('operation').send();
          return expect(event.calls.length).not.to.equal(0);
        });
      });
      return describe('custom request decorators', function() {
        var innerFn, innerVal, outerFn, outerVal, s3;
        s3 = new AWS.S3();
        innerVal = 0;
        outerVal = 0;
        innerFn = function() {
          return ++innerVal;
        };
        outerFn = function() {
          return ++outerVal;
        };
        beforeEach(function() {
          innerVal = 0;
          return outerVal = 0;
        });
        afterEach(function() {
          delete s3.customRequestHandler;
          return delete AWS.S3.prototype.customRequestHandler;
        });
        it('will be called when set on a service object', function(done) {
          expect(innerVal).to.equal(0);
          expect(outerVal).to.equal(0);
          s3.customizeRequests(innerFn);
          s3.makeRequest('listObjects');
          expect(innerVal).to.equal(1);
          expect(outerVal).to.equal(0);
          return done();
        });
        it('will be called when set on a service object prototype', function(done) {
          expect(innerVal).to.equal(0);
          expect(outerVal).to.equal(0);
          AWS.S3.prototype.customizeRequests(outerFn);
          s3.makeRequest('listObjects');
          expect(innerVal).to.equal(0);
          expect(outerVal).to.equal(1);
          return done();
        });
        it('will be called when set on a service object or prototype', function(done) {
          expect(innerVal).to.equal(0);
          expect(outerVal).to.equal(0);
          AWS.S3.prototype.customizeRequests(outerFn);
          s3.customizeRequests(innerFn);
          s3.makeRequest('listObjects');
          expect(innerVal).to.equal(1);
          expect(outerVal).to.equal(1);
          return done();
        });
        return it('gives access to the request object', function(done) {
          var innerReqHandler, outerReqHandler;
          innerVal = false;
          outerVal = false;
          innerReqHandler = function(req) {
            return innerVal = req instanceof AWS.Request;
          };
          outerReqHandler = function(req) {
            return outerVal = req instanceof AWS.Request;
          };
          AWS.S3.prototype.customizeRequests(outerReqHandler);
          s3.customizeRequests(innerReqHandler);
          s3.makeRequest('listObjects');
          expect(innerVal).to.equal(true);
          expect(outerVal).to.equal(true);
          return done();
        });
      });
    });
    describe('retryableError', function() {
      it('should retry on throttle error', function() {
        retryableError({
          code: 'AnyThrottleError',
          statusCode: 429
        }, true);
        retryableError({
          code: 'ProvisionedThroughputExceededException',
          statusCode: 400
        }, true);
        retryableError({
          code: 'ThrottlingException',
          statusCode: 400
        }, true);
        retryableError({
          code: 'Throttling',
          statusCode: 400
        }, true);
        retryableError({
          code: 'RequestLimitExceeded',
          statusCode: 400
        }, true);
        retryableError({
          code: 'RequestThrottled',
          statusCode: 400
        }, true);
        retryableError({
          code: 'RequestThrottledException',
          statusCode: 400
        }, true);
        retryableError({
          code: 'TooManyRequestsException',
          statusCode: 400
        }, true);
        retryableError({
          code: 'TransactionInProgressException',
          statusCode: 400
        }, true);
        retryableError({
          code: 'EC2ThrottledException',
          statusCode: 400
        }, true);
      });
      it('should retry on expired credentials error', function() {
        return retryableError({
          code: 'ExpiredTokenException',
          statusCode: 400
        }, true);
      });
      it('should retry on 500 or above regardless of error', function() {
        retryableError({
          code: 'Error',
          statusCode: 500
        }, true);
        return retryableError({
          code: 'RandomError',
          statusCode: 505
        }, true);
      });
      return it('should not retry when error is < 500 level status code', function() {
        retryableError({
          code: 'Error',
          statusCode: 200
        }, false);
        retryableError({
          code: 'Error',
          statusCode: 302
        }, false);
        return retryableError({
          code: 'Error',
          statusCode: 404
        }, false);
      });
    });
    describe('numRetries', function() {
      it('should use config max retry value if defined', function() {
        service.config.maxRetries = 30;
        return expect(service.numRetries()).to.equal(30);
      });
      return it('should use defaultRetries defined on object if undefined on config', function() {
        service.defaultRetryCount = 13;
        service.config.maxRetries = void 0;
        return expect(service.numRetries()).to.equal(13);
      });
    });
    describe('retryDelays', function() {
      beforeEach(function() {
        return helpers.spyOn(Math, 'random').andReturn(1);
      });
      it('has a default delay base of 100 ms', function() {
        var actualDelays, client, expectedDelays, i;
        client = new AWS.Service({});
        expectedDelays = [100, 200, 400];
        actualDelays = (function() {
          var j, ref, results;
          results = [];
          for (i = j = 0, ref = client.numRetries() - 1; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
            results.push(client.retryDelays(i));
          }
          return results;
        })();
        return expect(actualDelays).to.eql(expectedDelays);
      });
      it('can accept a user-defined delay base', function() {
        var actualDelays, client, expectedDelays, i;
        client = new AWS.Service({
          retryDelayOptions: {
            base: 200
          }
        });
        expectedDelays = [200, 400, 800];
        actualDelays = (function() {
          var j, ref, results;
          results = [];
          for (i = j = 0, ref = client.numRetries() - 1; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
            results.push(client.retryDelays(i));
          }
          return results;
        })();
        return expect(actualDelays).to.eql(expectedDelays);
      });
      it('can pass error through to user-defined custom backoff', function() {
        var customBackoff = function(retryCount, err) {
          if (err.code === 'NetworkingError') {
            return -1;
          } else {
            return 100 * retryCount;
          }
        };
        var client = new AWS.Service({
          retryDelayOptions: {
            customBackoff: customBackoff
          }
        });
        var err = {
          code: 'NetworkingError',
          message: 'Invalid character',
        };
        var delays = client.retryDelays(1, err);
        return expect(delays).to.eql(-1);
      });
      return it('can accept a user-defined custom backoff', function() {
        var actualDelays, client, customBackoff, expectedDelays, i;
        customBackoff = function(retryCount) {
          return 100 * retryCount;
        };
        client = new AWS.Service({
          retryDelayOptions: {
            customBackoff: customBackoff
          }
        });
        expectedDelays = [0, 100, 200];
        actualDelays = (function() {
          var j, ref, results;
          results = [];
          for (i = j = 0, ref = client.numRetries() - 1; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
            results.push(client.retryDelays(i));
          }
          return results;
        })();
        return expect(actualDelays).to.eql(expectedDelays);
      });
    });
    describe('defineMethods', function() {
      var operations, serviceConstructor;
      operations = null;
      serviceConstructor = null;
      beforeEach(function(done) {
        serviceConstructor = function() {
          return AWS.Service.call(this, new AWS.Config());
        };
        serviceConstructor.prototype = Object.create(AWS.Service.prototype);
        serviceConstructor.prototype.api = {};
        operations = {
          'foo': {},
          'bar': {}
        };
        serviceConstructor.prototype.api.operations = operations;
        return done();
      });
      it('should add operation methods', function() {
        AWS.Service.defineMethods(serviceConstructor);
        expect(typeof serviceConstructor.prototype.foo).to.equal('function');
        return expect(typeof serviceConstructor.prototype.bar).to.equal('function');
      });
      it('should not overwrite methods with generated methods', function() {
        var foo;
        foo = function() {};
        serviceConstructor.prototype.foo = foo;
        AWS.Service.defineMethods(serviceConstructor);
        expect(typeof serviceConstructor.prototype.foo).to.equal('function');
        expect(serviceConstructor.prototype.foo).to.eql(foo);
        return expect(typeof serviceConstructor.prototype.bar).to.equal('function');
      });
      return describe('should generate a method', function() {
        it('that makes an authenticated request by default', function(done) {
          var customService;
          AWS.Service.defineMethods(serviceConstructor);
          customService = new serviceConstructor();
          helpers.spyOn(customService, 'makeRequest');
          customService.foo();
          expect(customService.makeRequest.calls.length).to.equal(1);
          return done();
        });
        return it('that makes an unauthenticated request when operation authtype is none', function(done) {
          var customService;
          serviceConstructor.prototype.api.operations.foo.authtype = 'none';
          AWS.Service.defineMethods(serviceConstructor);
          customService = new serviceConstructor();
          helpers.spyOn(customService, 'makeRequest');
          helpers.spyOn(customService, 'makeUnauthenticatedRequest');
          expect(customService.makeRequest.calls.length).to.equal(0);
          expect(customService.makeUnauthenticatedRequest.calls.length).to.equal(0);
          customService.foo();
          expect(customService.makeRequest.calls.length).to.equal(0);
          expect(customService.makeUnauthenticatedRequest.calls.length).to.equal(1);
          customService.bar();
          expect(customService.makeRequest.calls.length).to.equal(1);
          expect(customService.makeUnauthenticatedRequest.calls.length).to.equal(1);
          return done();
        });
      });
    });
    describe('getSignerClass', function() {
      var getVersion;
      getVersion = function(signer) {
        if (signer === AWS.Signers.S3) {
          return 's3';
        } else if (signer === AWS.Signers.V4) {
          return 'v4';
        } else if (signer === AWS.Signers.V2) {
          return 'v2';
        }
      };
      afterEach(function() {
        service = new AWS.Lambda();
        return service.api.signatureVersion = 'v4';
      });
      it('should return signer based on service signatureVersion', function(done) {
        service = new AWS.Lambda();
        service.api.signatureVersion = 'v2';
        delete service.config.signatureVersion;
        expect(getVersion(service.getSignerClass())).to.equal('v2');
        return done();
      });
      it('should prefer operation authtype over service signatureVersion', function(done) {
        var req;
        service = new AWS.Lambda();
        service.api.signatureVersion = 'v2';
        delete service.config.signatureVersion;
        req = service.makeRequest('updateFunctionCode', {
          FunctionName: 'fake',
          ZipFile: AWS.util.buffer.toBuffer('fake')
        });
        expect(getVersion(service.getSignerClass(req))).to.equal('v2');
        service.api.operations.updateFunctionCode.authtype = 'v4';
        req = service.makeRequest('updateFunctionCode', {
          FunctionName: 'fake',
          ZipFile: AWS.util.buffer.toBuffer('fake')
        });
        expect(getVersion(service.getSignerClass(req))).to.equal('v4');
        return done();
      });
      it('should prefer user config over all else', function(done) {
        var req;
        service = new AWS.Lambda({
          signatureVersion: 'v2'
        });
        service.api.signatureVersion = 'v3';
        service.api.operations.updateFunctionCode.authtype = 'v4';
        req = service.makeRequest('updateFunctionCode', {
          FunctionName: 'fake',
          ZipFile: AWS.util.buffer.toBuffer('fake')
        });
        expect(getVersion(service.getSignerClass())).to.equal('v2');
        expect(getVersion(service.getSignerClass(req))).to.equal('v2');
        return done();
      });
      return it('should respect v4-unsigned-body', function(done) {
        var req;
        service = new AWS.Lambda();
        service.api.signatureVersion = 'v2';
        delete service.config.signatureVersion;
        service.api.operations.updateFunctionCode.authtype = 'v4-unsigned-body';
        req = service.makeRequest('updateFunctionCode', {
          FunctionName: 'fake',
          ZipFile: AWS.util.buffer.toBuffer('fake')
        });
        expect(getVersion(service.getSignerClass())).to.equal('v2');
        expect(getVersion(service.getSignerClass(req))).to.equal('v4');
        return req.build(function() {
          expect(req.httpRequest.headers['X-Amz-Content-Sha256']).to.equal('UNSIGNED-PAYLOAD');
          return done();
        });
      });
    });

    describe('customizeRequests', function() {
      it('should accept nullable types', function() {
        var didError, err;
        didError = false;
        try {
          service.customizeRequests(null);
          service.customizeRequests(void 0);
          service.customizeRequests();
        } catch (error1) {
          err = error1;
          didError = true;
        }
        expect(didError).to.equal(false);
        return expect(!!service.customRequestHandler).to.equal(false);
      });
      it('should accept a function', function() {
        var didError, err;
        didError = false;
        try {
          service.customizeRequests(function() {});
        } catch (error1) {
          err = error1;
          didError = true;
        }
        expect(didError).to.equal(false);
        return expect(typeof service.customRequestHandler).to.equal('function');
      });
      return it('should throw an error when non-nullable, non-function types are provided', function() {
        var didError, err;
        didError = false;
        try {
          service.customizeRequests('test');
        } catch (error1) {
          err = error1;
          didError = true;
        }
        return expect(didError).to.equal(true);
      });
    });
    describe('Service clock sync functions', function() {
      beforeEach(function(done) {
        AWS.config.update({
          systemClockOffset: 0
        });
        done();
      });
      it('should find whether a time deviates from skew-corrected date for more than 300 seconds', function() {
        var mockService = new MockService();
        var now = new Date().getTime();
        helpers.spyOn(mockService, 'getSkewCorrectedDate').andReturn(new Date(now + 300100));
        expect(mockService.isClockSkewed(now)).to.equal(true);
        helpers.spyOn(mockService, 'getSkewCorrectedDate').andReturn(new Date(now + 299900));
        expect(mockService.isClockSkewed(now)).to.equal(false);
      });
      it('should apply the clock offset to service config', function() {
        var mockService = new MockService();
        expect(mockService.config.systemClockOffset).to.equal(0);
        mockService.applyClockOffset(new Date().getTime() + 300000);
        var offset = mockService.config.systemClockOffset;
        expect(offset > 299900 && offset < 300100).to.equal(true);
      });
      it('should get skew-corrected date for each service', function() {
        var mockService = new MockService();
        mockService.config.update({
          systemClockOffset: 300000
        });
        var now = new Date().getTime();
        var serviceTime = mockService.getSkewCorrectedDate().getTime();
        expect(now + 299900 < serviceTime && serviceTime < now + 300100).to.equal(true);
      });
      it('should update each client\'s systemClockOffset respectively', function() {
        helpers.spyOn(Date, 'now').andReturn(0);
        var mockService1 = new MockService({correctClockSkew: true});
        var serverDate = new Date(600000);
        helpers.mockHttpResponse(200, {
          date: serverDate.toString()
        }, '');
        mockService1.makeRequest().send();
        var mockService2 = new MockService({correctClockSkew: true});
        serverDate = new Date(1200000);
        helpers.mockHttpResponse(200, {
          date: serverDate.toString()
        }, '');
        mockService2.makeRequest().send();
        var offset = mockService1.config.systemClockOffset;
        expect(599900 < offset && 600100 > offset).to.equal(true);
        offset = mockService2.config.systemClockOffset;
        expect(1199900 < offset && 1200100 > offset).to.equal(true);
      });
    });

    describe('Service monitoring events emitter', function() {
      it('should emit events on specific service client', function() {
        helpers.mockHttpResponse(200, {}, ['FOO', 'BAR']);
        var client = new MockService();
        var client2 = new MockService();
        var callNum = 0; var attemptNum = 0;
        var callNumClient2 = 0;
        client.on('apiCall', function apiCallListener(event) {
          callNum ++;
          expect(event.Type).to.equal('ApiCall');
        });
        client.on('apiCallAttempt', function apiAttemptListener(event) {
          attemptNum ++;
          expect(event.Type).to.equal('ApiCallAttempt');
        });
        client2.on('apiCall', function apiCallListener() {
          callNumClient2 ++;
        });
        client.makeRequest('operationName', function(err, data) {});
        expect(callNum).to.equal(1);
        expect(attemptNum).to.equal(1);
        expect(callNumClient2).to.equal(0);
      });

      it('should emit events on Service prototype', function() {
        var callNum = 0;
        var attemptNum = 0;
        MockService.prototype.on('apiCall', function apiCallListener(event) {
          callNum ++;
          expect(event.Type).to.equal('ApiCall');
        });
        MockService.prototype.on('apiCallAttempt', function apiAttemptListener(event) {
          attemptNum ++;
          expect(event.Type).to.equal('ApiCallAttempt');
        });
        helpers.mockHttpResponse(200, {}, ['FOO', 'BAR']);
        var client = new MockService();
        client.makeRequest('operationName', function(err, data) {});
        expect(callNum).to.equal(1);
        expect(attemptNum).to.equal(1);
      });

      it('should emit events on global Service prototype', function() {
        var callNum = 0;
        var attemptNum = 0;
        AWS.Service.prototype.on('apiCall', function apiCallListener(event) {
          callNum ++;
          expect(event.Type).to.equal('ApiCall');
        });
        AWS.Service.prototype.on('apiCallAttempt', function apiAttemptListener(event) {
          attemptNum ++;
          expect(event.Type).to.equal('ApiCallAttempt');
        });
        helpers.mockHttpResponse(200, {}, ['FOO', 'BAR']);
        var client = new MockService();
        client.makeRequest('operationName', function(err, data) {});
        expect(callNum).to.equal(1);
        expect(attemptNum).to.equal(1);
      });
    });

    it('should emit api call events when request succeeds', function(done) {
      helpers.mockHttpResponse(200, {}, ['FOO', 'BAR']);
      var client = new MockService({});
      client.on('apiCall', function apiCallListener(event) {
        expect(event.Type).to.equal('ApiCall');
        expect(event.Service).to.equal('mockservice');
        expect(event.Api).to.equal('operationName');
        expect(Math.abs(event.Timestamp - Date.now()) < 100).to.equal(true);
        expect(event.Version).to.equal(1);
        expect(event.AttemptCount).to.equal(1);
        expect(typeof event.Latency).to.equal('number');
        expect(typeof event.UserAgent).to.equal('string');
        expect(event.FinalHttpStatusCode).to.equal(200);
        done();
      });
      client.makeRequest('operationName', function(err, data) {});
    });

    it('should emit api call events when request fails for aws exception', function(done) {
      helpers.mockHttpResponse(500, {}, ['ServiceUnavailableException']);
      var client = new MockService({maxRetries: 0});
      client.on('apiCall', function apiCallListener(event) {
        expect(event.Type).to.equal('ApiCall');
        expect(event.Service).to.equal('mockservice');
        expect(event.Api).to.equal('operationName');
        expect(Math.abs(event.Timestamp - Date.now()) < 100).to.equal(true);
        expect(event.Version).to.equal(1);
        expect(event.AttemptCount).to.equal(1);
        expect(typeof event.Latency).to.equal('number');
        expect(typeof event.UserAgent).to.equal('string');
        expect(event.FinalHttpStatusCode).to.equal(500);
        expect(event.FinalAwsException).to.equal('ServiceUnavailableException');
        done();
      });
      client.makeRequest('operationName', function(err, data) {});
    });

    it('should emit api call attempt events corresponding to event interface', function() {
      helpers.mockHttpResponse(200, {
        'x-amz-request-id': 'request-id',
        'x-amzn-requestid': 'n-request-id'
      }, ['FOO', 'BAR']);
      var client = new MockService();
      client.on('apiCallAttempt', function apiCallListener(event) {
        expect(event.Type).to.equal('ApiCallAttempt');
        expect(event.Service).to.equal('MockService');
        expect(event.Api).to.equal('operationName');
        expect(Math.abs(event.Timestemp - Date.now()) < 100).to.equal(true);
        expect(event.Version).to.equal(1);
        expect(event.AttemptCount).to.equal(0);
        expect(event.Fqdn).to.equal('mockservice.mock-region.amazonaws.com');
        expect(event.XAmznRequestId).to.equal('n-request-id');
        expect(event.XAmzRequestId).to.equal('request-id');
        expect(event.HttpStatusCode).to.equal(200);
        expect(event.AccessKey).to.equal('akid');
        expect(event.Region).to.equal('mock-region');
        expect(typeof event.UserAgent).to.equal('string');
        expect(typeof event.AttemptLatency).to.equal('number');
      });
      client.makeRequest('operationName', function(err, data) {});
    });

    it('should publish monitoring event when publisher is set', function(done) {
      helpers.mockHttpResponse(200, {}, ['FOO', 'BAR']);
      var events = [];
      AWS.Service.prototype.publisher = {
        eventHandler: function(event) {
          events.push(event);
        }
      };
      var client = new MockService({clientSideMonitoring: true});
      client.makeRequest('operationName', function(err, data) {});
      process.nextTick(function() {
        expect(events.length).to.equal(2);
        expect(events[0].Type).to.equal('ApiCallAttempt');
        expect(events[1].Type).to.equal('ApiCall');
        done();
      });
    });
  });

}).call(this);

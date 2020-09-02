(function() {
  var AWS, MockService, helpers;

  helpers = require('./helpers');

  AWS = helpers.AWS;

  MockService = helpers.MockService;
  MockServiceFromApi = helpers.MockServiceFromApi;
  var FooService = require('./foo-service.fixture').FooService;

  describe('AWS.EventListeners', function() {
    var completeHandler, config, delays, errorHandler, makeRequest, oldMathRandom, oldSetTimeout, randomValues, retryHandler, service, successHandler, totalWaited;
    oldSetTimeout = setTimeout;
    oldMathRandom = Math.random;
    config = null;
    service = null;
    totalWaited = null;
    delays = [];
    successHandler = null;
    errorHandler = null;
    completeHandler = null;
    retryHandler = null;
    randomValues = [];
    beforeEach(function(done) {
      setTimeout = helpers.createSpy('setTimeout');;
      setTimeout.andCallFake(function(callback, delay) {
        totalWaited += delay;
        delays.push(delay);
        return callback();
      });
      totalWaited = 0;
      delays = [];
      service = new MockService({
        maxRetries: 3
      });
      service.config.credentials = AWS.util.copy(service.config.credentials);
      Math.random = helpers.createSpy('random');;
      Math.random.andCallFake(function() {
        var val;
        val = oldMathRandom();
        randomValues.push(val);
        return val;
      });
      randomValues = [];
      successHandler = helpers.createSpy('success');
      errorHandler = helpers.createSpy('error');
      completeHandler = helpers.createSpy('complete');
      retryHandler = helpers.createSpy('retry');
      return done();
    });
    afterEach(function() {
      return setTimeout = oldSetTimeout; Math.random = oldMathRandom;
    });
    makeRequest = function(callback) {
      var request;
      request = service.makeRequest('mockMethod', {
        foo: 'bar'
      });
      request.on('retry', retryHandler);
      request.on('error', errorHandler);
      request.on('success', successHandler);
      request.on('complete', completeHandler);
      if (callback) {
        return request.send(callback);
      } else {
        return request;
      }
    };

    describe('validate', function() {
      it('takes the request object as a parameter', function() {
        var request, response;
        request = makeRequest();
        request.on('validate', function(req) {
          expect(req).to.equal(request);
          throw 'ERROR';
        });
        response = request.send(function() {});
        return expect(response.error.message).to.equal('ERROR');
      });
      it('sends error event if credentials are not set', function() {
        service.config.credentialProvider = null;
        service.config.credentials.accessKeyId = null;
        makeRequest(function() {});
        expect(errorHandler.calls.length).not.to.equal(0);
        return AWS.util.arrayEach(errorHandler.calls, function(call) {
          expect(call['arguments'][0]).to.be.instanceOf(Error);
          expect(call['arguments'][0].code).to.equal('CredentialsError');
          expect(call['arguments'][0].name).to.equal('CredentialsError');
          return expect(call['arguments'][0].message).to.match(/Missing credentials/);
        });
      });
      it('sends error event if credentials are not set', function() {
        service.config.credentials.accessKeyId = 'akid';
        service.config.credentials.secretAccessKey = null;
        makeRequest(function() {});
        expect(errorHandler.calls.length).not.to.equal(0);
        return AWS.util.arrayEach(errorHandler.calls, function(call) {
          expect(call['arguments'][0]).to.be.instanceOf(Error);
          expect(call['arguments'][0].code).to.equal('CredentialsError');
          expect(call['arguments'][0].name).to.equal('CredentialsError');
          return expect(call['arguments'][0].message).to.match(/Missing credentials/);
        });
      });
      it('does not validate credentials if request is not signed', function() {
        var request;
        helpers.mockHttpResponse(200, {}, '');
        service.api = new AWS.Model.Api({
          metadata: {
            endpointPrefix: 'mockservice',
            signatureVersion: null
          }
        });
        request = makeRequest();
        request.send(function() {});
        expect(errorHandler.calls.length).to.equal(0);
        return expect(successHandler.calls.length).not.to.equal(0);
      });

      [null, undefined, ''].forEach(function(region) {
        it('sends error event if region is ' + region, function() {
          var call, request;
          helpers.mockHttpResponse(200, {}, '');
          service.config.region = region;
          request = makeRequest(function() {});
          call = errorHandler.calls[0];
          expect(errorHandler.calls.length).not.to.equal(0);
          expect(call['arguments'][0]).to.be.instanceOf(Error);
          expect(call['arguments'][0].code).to.equal('ConfigError');
          return expect(call['arguments'][0].message).to.match(/Missing region in config/);
        });
      });

      [
        'has_underscore',
        '-starts-with-dash',
        'ends-with-dash-',
        '-starts-and-ends-with-dash-',
        '-',
        'c0nt@in$-$ymb01$',
        '0123456789012345678901234567890123456789012345678901234567890123', // 64 characters
      ].forEach(function(region) {
        it('sends error event if region is "' + region + '"', function() {
          var call, request;
          helpers.mockHttpResponse(200, {}, '');
          service.config.region = region;
          request = makeRequest(function() {});
          call = errorHandler.calls[0];
          expect(errorHandler.calls.length).not.to.equal(0);
          expect(call['arguments'][0]).to.be.instanceOf(Error);
          expect(call['arguments'][0].code).to.equal('ConfigError');
          return expect(call['arguments'][0].message).to.match(/Invalid region in config/);
        });
      });

      [
        'a',
        'ab',
        'abc',
        'contains-dashes-in-the-middle',
        '123StartsWithNumbers',
        'EndsWithNumbers123',
        '123StartsAndEndsWithNumbers000',
        '012345678901234567890123456789012345678901234567890123456789012', // 63 characters
      ].forEach(function(region) {
        it('successful region validation if region is "' + region + '"', function() {
          helpers.mockHttpResponse(200, {}, '');
          service.config.region = region;
          makeRequest(function() {});
          return expect(errorHandler.calls.length).to.equal(0);
        });
      });
      return it('ignores region validation if service has global endpoint', function() {
        helpers.mockHttpResponse(200, {}, '');
        service.config.region = null;
        service.isGlobalEndpoint = true;
        makeRequest(function() {});
        expect(errorHandler.calls.length).to.equal(0);
        return delete service.isGlobalEndpoint;
      });
    });

    describe('build', function() {
      return it('takes the request object as a parameter', function() {
        var request, response;
        helpers.mockHttpResponse(200, {}, '');
        request = makeRequest();
        request.on('build', function(req) {
          expect(req).to.equal(request);
          throw 'ERROR';
        });
        response = request.send(function() {});
        return expect(response.error.message).to.equal('ERROR');
      });
    });

    describe('afterBuild', function() {
      var fs, request, sendRequest;
      request = null;
      fs = null;
      sendRequest = function(body, callback) {
        request = makeRequest();
        request.removeAllListeners('sign');
        request.on('build', function(req) {
          return req.httpRequest.body = body;
        });
        if (callback) {
          return request.send(callback);
        } else {
          request.send();
          return request;
        }
      };

      describe('add Transfer-Encoding header', function() {
        it('when streaming payload is unsigned payload if content length is not available', function(done) {
          var oldByteLength = AWS.util.string.byteLength;
          helpers.spyOn(AWS.util.string, 'byteLength').andCallFake(function(chunk) {
            throw new Error('Cannot determine length of ' + chunk);
          });
          var service = new FooService();
          var req = service.putStream({
            Body: 'NoLengthBody'
          });

          req.runTo('sign', function(err) {
            expect(req.httpRequest.headers['Transfer-Encoding']).to.equal('chunked');
            expect(!err).to.equal(true);
            AWS.util.string.byteLength = oldByteLength;
            done();
          });
        });
      });

      describe('adds Content-Length header', function() {
        var contentLength;
        contentLength = function(body) {
          return sendRequest(body).httpRequest.headers['Content-Length'];
        };

        describe('when using unsigned authtype', function() {
          it('when paylaod is a buffer', function() {
            var service = new FooService();
            var req = service.putStream({
              Body: AWS.util.buffer.toBuffer('test')
            });

            req.runTo('sign', function(err) {
              expect(req.httpRequest.headers['Content-Length']).to.equal(4);
              expect(!err).to.equal(true);
            });
          });

          it('when paylaod is a string', function() {
            var service = new FooService();
            var req = service.putStream({
              Body: 'test'
            });

            req.runTo('sign', function(err) {
              expect(req.httpRequest.headers['Content-Length']).to.equal(4);
              expect(!err).to.equal(true);
            });
          });

          if (AWS.util.isNode()) {
            it('when paylaod is a file stream', function() {
              var service = new FooService();
              var req = service.putStream({
                Body: require('fs').createReadStream(__filename)
              });

              req.runTo('sign', function(err) {
                expect(req.httpRequest.headers['Content-Length'] > 0).to.equal(true);
                expect(!err).to.equal(true);
              });
            });

            it('unless payload is a non-file stream', function() {
              var service = new FooService();
              var req = service.putStream({
                Body: new AWS.util.stream.Readable()
              });

              req.runTo('sign', function(err) {
                expect(typeof req.httpRequest.headers['Content-Length']).to.equal('undefined');
                expect(!err).to.equal(true);
              });
            });
          }
        });

        it('builds Content-Length in the request headers for string content', function() {
          return expect(contentLength('FOOBAR')).to.equal(6);
        });

        it('builds Content-Length for string "0"', function() {
          return expect(contentLength('0')).to.equal(1);
        });

        it('builds Content-Length for utf-8 string body', function() {
          return expect(contentLength('tï№')).to.equal(6);
        });

        it('builds Content-Length for buffer body', function() {
          return expect(contentLength(AWS.util.buffer.toBuffer('tï№'))).to.equal(6);
        });

        describe ('when has requiresLength trait exists', function() {
          var oldByteLength = AWS.util.string.byteLength;
          var service = new FooService();
          beforeEach(function() {
            helpers.spyOn(AWS.util.string, 'byteLength').andCallFake(function(chunk) {
              throw new Error('Cannot determine length of ' + chunk);
            });
          });
          afterEach(function() {
            AWS.util.string.byteLength = oldByteLength;
          });

          it('throws error when content length is required in payload shape but length is not available', function(done) {
            var req = service.putBoundedStream({
              Body: 'NoLengthBody'
            });
            //this event listener will raise error even before setting content length
            req.removeListener('afterBuild', AWS.EventListeners.Core.COMPUTE_SHA256);
            req.runTo('sign', function(err) {
              expect(err.message).to.contain('Cannot determine length of');
              done();
            });
          });

          it('throws error when content length is required in unsigned payload shape but length is not available', function(done) {
            var req = service.putUnsignedBoundedStream({
              Body: 'NoLengthBody'
            });
            req.runTo('sign', function(err) {
              expect(err.message).to.contain('Cannot determine length of');
              done();
            });
          });
        });

        it('throws error when non-streaming body has no length', function(done) {
          var oldByteLength = AWS.util.string.byteLength;
          var service = new FooService();
          helpers.spyOn(AWS.util.string, 'byteLength').andCallFake(function(chunk) {
            throw new Error('Cannot determine length of ' + chunk);
          });
          var req = service.putNonStream({
            Body: 'NoLengthBody'
          });
          req.runTo('sign', function(err) {
            AWS.util.string.byteLength = oldByteLength;
            expect(err.message).to.contain('Cannot determine length of');
            done();
          });
        });

        if (AWS.util.isNode()) {
          it('builds Content-Length for file body', function(done) {
            var file;
            fs = require('fs');
            file = fs.createReadStream(__filename);
            return sendRequest(file, function(err) {
              return done();
            });
          });

          it('throws an error for non-file body', function(done) {
            sendRequest(new AWS.util.stream.Readable(), function(err) {
              expect(typeof err).not.to.equal('undefined');
              expect(err.message).to.equal('Non-file stream objects are not supported with SigV4');
              done();
            });
          });
        }
      });
    });

    describe('restart', function() {
      var request;
      request = null;
      return it('constructs a fresh httpRequest object', function() {
        var httpRequest;
        request = makeRequest();
        httpRequest = request.httpRequest;
        request.on('build', function() {
          var err;
          if (!this.threwSimulatedError) {
            this.threwSimulatedError = true;
            err = new Error('simulated error');
            err.retryable = true;
            throw err;
          }
        });
        request.build();
        return expect(request.httpRequest).not.to.eql(httpRequest);
      });
    });

    describe('sign', function() {
      it('takes the request object as a parameter', function() {
        var request, response;
        helpers.mockHttpResponse(200, {}, '');
        request = makeRequest();
        request.on('sign', function(req) {
          expect(req).to.equal(request);
          throw 'ERROR';
        });
        response = request.send(function() {});
        return expect(response.error.message).to.equal('ERROR');
      });
      it('uses the api.signingName if provided', function() {
        var request, response;
        helpers.mockHttpResponse(200, {}, '');
        service.api.signingName = 'SIGNING_NAME';
        helpers.spyOn(AWS.Signers.RequestSigner, 'getVersion').andCallFake(function() {
          return function(req, signingName) {
            throw signingName;
          };
        });
        request = makeRequest();
        response = request.send(function() {});
        expect(response.error).to.equal('SIGNING_NAME');
        return delete service.api.signingName;
      });
      return it('uses the api.endpointPrefix if signingName not provided', function() {
        var request, response;
        helpers.mockHttpResponse(200, {}, '');
        helpers.spyOn(AWS.Signers.RequestSigner, 'getVersion').andCallFake(function() {
          return function(req, signingName) {
            throw signingName;
          };
        });
        request = makeRequest();
        response = request.send(function() {});
        return expect(response.error).to.equal('mockservice');
      });
    });

    describe('send', function() {
      it('passes httpOptions from config', function() {
        var options;
        options = {};
        helpers.spyOn(AWS.HttpClient, 'getInstance').andReturn({
          handleRequest: function(req, opts) {
            options = opts;
            return new AWS.SequentialExecutor();
          }
        });
        service.config.httpOptions = {
          timeout: 15
        };
        service.config.maxRetries = 0;
        makeRequest(function() {});
        return expect(options.timeout).to.equal(15);
      });
      it('signs only once in normal case', function(done) {
        var request, signHandler;
        signHandler = helpers.createSpy('sign');
        helpers.mockHttpResponse(200, {}, ['data']);
        request = makeRequest();
        request.on('sign', signHandler);
        request.build();
        request.signedAt = new Date(request.signedAt - 60 * 5 * 1000);
        request.send();
        expect(signHandler.calls.length).to.equal(1);
        return done();
      });
      return it('resigns if it took more than 10 min to get to send', function(done) {
        var request, signHandler;
        signHandler = helpers.createSpy('sign');
        helpers.mockHttpResponse(200, {}, ['data']);
        request = makeRequest();
        request.on('sign', signHandler);
        request.build();
        request.signedAt = new Date(request.signedAt - 60 * 12 * 1000);
        request.send();
        expect(signHandler.calls.length).to.equal(2);
        return done();
      });
    });

    describe('httpHeaders', function() {
      return it('applies clock skew offset when correcClockSkew is true', function() {
        var offset, request, response, serverDate;
        service = new MockService({
          maxRetries: 3,
          correctClockSkew: true
        });
        serverDate = new Date(new Date().getTime() - 300000);
        helpers.mockHttpResponse(200, {
          date: serverDate.toString()
        }, '');
        helpers.spyOn(service, 'isClockSkewed').andReturn(true);
        request = makeRequest();
        response = request.send();
        offset = Math.abs(service.config.systemClockOffset);
        expect(offset > 299000 && offset < 310000).to.equal(true);
      });
    });

    describe('httpData', function() {
      beforeEach(function() {
        return helpers.mockHttpResponse(200, {}, ['FOO', 'BAR', 'BAZ', 'QUX']);
      });
      it('emits httpData event on each chunk', function(done) {
        var calls, request;
        calls = [];
        request = makeRequest();
        request.on('httpData', function(chunk) {
          return calls.push(chunk.toString());
        });
        request.send();
        expect(calls).to.eql(['FOO', 'BAR', 'BAZ', 'QUX']);
        return done();
      });
      it('does not clear default httpData event if another is added', function(done) {
        var request, response;
        request = makeRequest();
        request.on('httpData', function() {});
        response = request.send();
        expect(response.httpResponse.body.toString()).to.equal('FOOBARBAZQUX');
        return done();
      });
      return it('disables httpData if createUnbufferedStream() is called', function(done) {
        var calls, request, stream;
        calls = [];
        stream = null;
        helpers.mockHttpResponse(200, {}, ['data1', 'data2', 'data3']);
        request = makeRequest();
        request.on('httpData', function(chunk) {
          return calls.push(chunk.toString());
        });
        request.on('httpHeaders', function(statusCode, headers) {
          return stream = request.response.httpResponse.createUnbufferedStream();
        });
        request.send();
        expect(calls.length).to.equal(0);
        expect(stream).to.exist;
        return done();
      });
    });
    if (AWS.util.isNode() && AWS.HttpClient.streamsApiVersion > 1) {
      describe('httpDownloadProgress', function() {
        beforeEach(function() {
          return helpers.mockHttpResponse(200, {
            'content-length': 12
          }, ['FOO', 'BAR', 'BAZ', 'QUX']);
        });
        return it('emits httpDownloadProgress for each chunk', function() {
          var progress, request;
          progress = [];
          request = makeRequest();
          request.on('httpDownloadProgress', function(p) {
            return progress.push(p);
          });
          request.send();
          expect(progress[0]).to.eql({
            loaded: 3,
            total: 12
          });
          expect(progress[1]).to.eql({
            loaded: 6,
            total: 12
          });
          expect(progress[2]).to.eql({
            loaded: 9,
            total: 12
          });
          return expect(progress[3]).to.eql({
            loaded: 12,
            total: 12
          });
        });
      });
    }

    describe('httpError', function() {
      it('rewrites ENOTFOUND error to include helpful message', function() {
        var request;
        helpers.mockHttpResponse({
          code: 'NetworkingError',
          errno: 'ENOTFOUND',
          region: 'mock-region',
          hostname: 'svc.mock-region.example.com',
          retryable: true
        });
        request = makeRequest();
        request.send();
        expect(request.response.error.code).to.equal('UnknownEndpoint');
        return expect(request.response.error.message).to.contain('This service may not be available in the `mock-region\' region.');
      });
      if (AWS.util.getSystemErrorName) {
        // errno is a number after Node 12
        // reference: https://github.com/nodejs/node/pull/28140
        it('rewrites ENOTFOUND error to include helpful message when errno is number', function() {
          var request;
          helpers.mockHttpResponse({
            code: 'NetworkingError',
            errno: -3008,
            region: 'mock-region',
            hostname: 'svc.mock-region.example.com',
            retryable: true
          });
          request = makeRequest();
          request.send();
          expect(request.response.error.code).to.equal('UnknownEndpoint');
          return expect(request.response.error.message).to.contain('This service may not be available in the `mock-region\' region.');
        });
      }
      return it('retries ENOTFOUND errors', function() {
        var request, response, sendHandler;
        helpers.mockHttpResponse({
          code: 'NetworkingError',
          errno: 'ENOTFOUND',
          region: 'mock-region',
          hostname: 'svc.mock-region.example.com',
          retryable: true
        });
        service.config.maxRetries = 10;
        sendHandler = helpers.createSpy('send');
        request = makeRequest();
        request.on('send', sendHandler);
        response = request.send();
        expect(retryHandler.calls.length).not.to.equal(0);
        expect(errorHandler.calls.length).not.to.equal(0);
        expect(completeHandler.calls.length).not.to.equal(0);
        expect(successHandler.calls.length).to.equal(0);
        expect(response.retryCount).to.equal(service.config.maxRetries);
        return expect(sendHandler.calls.length).to.equal(service.config.maxRetries + 1);
      });
    });

    describe('retry', function() {
      it('retries a request with a set maximum retries', function() {
        var request, response, sendHandler;
        sendHandler = helpers.createSpy('send');
        service.config.maxRetries = 10;
        helpers.mockHttpResponse({
          code: 'NetworkingError',
          message: 'Cannot connect'
        });
        request = makeRequest();
        request.on('send', sendHandler);
        response = request.send(function() {});
        expect(retryHandler.calls.length).not.to.equal(0);
        expect(errorHandler.calls.length).not.to.equal(0);
        expect(completeHandler.calls.length).not.to.equal(0);
        expect(successHandler.calls.length).to.equal(0);
        expect(response.retryCount).to.equal(service.config.maxRetries);
        return expect(sendHandler.calls.length).to.equal(service.config.maxRetries + 1);
      });
      it('retries with falloff', function() {
        var baseDelays, expectedDelays, i;
        helpers.mockHttpResponse({
          code: 'NetworkingError',
          message: 'Cannot connect'
        });
        makeRequest(function() {});
        baseDelays = [100, 200, 400];
        expectedDelays = (function() {
          var j, ref, results;
          results = [];
          for (i = j = 0, ref = service.numRetries() - 1; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
            results.push(baseDelays[i] * randomValues[i]);
          }
          return results;
        })();
        return expect(delays).to.eql(expectedDelays);
      });
      it('retries with falloff using custom base', function() {
        var baseDelays, expectedDelays, i;
        service.config.update({
          retryDelayOptions: {
            base: 30
          }
        });
        helpers.mockHttpResponse({
          code: 'NetworkingError',
          message: 'Cannot connect'
        });
        makeRequest(function() {});
        baseDelays = [30, 60, 120];
        expectedDelays = (function() {
          var j, ref, results;
          results = [];
          for (i = j = 0, ref = service.numRetries() - 1; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
            results.push(baseDelays[i] * randomValues[i]);
          }
          return results;
        })();
        return expect(delays).to.eql(expectedDelays);
      });
      it('retries with falloff using custom backoff', function() {
        service.config.update({
          retryDelayOptions: {
            customBackoff: function(retryCount) {
              return 2 * retryCount;
            }
          }
        });
        helpers.mockHttpResponse({
          code: 'NetworkingError',
          message: 'Cannot connect'
        });
        makeRequest(function() {});
        return expect(delays).to.eql([0, 2, 4]);
      });
      it('retries with falloff using custom backoff instead of base', function() {
        service.config.update({
          retryDelayOptions: {
            base: 100,
            customBackoff: function(retryCount) {
              return 2 * retryCount;
            }
          }
        });
        helpers.mockHttpResponse({
          code: 'NetworkingError',
          message: 'Cannot connect'
        });
        makeRequest(function() {});
        return expect(delays).to.eql([0, 2, 4]);
      });
      it('skips retries if custom backoff returns negative delay', function() {
        service.config.update({
          retryDelayOptions: {
            customBackoff: function(retryCount, err) {
              if (err.code === 'NetworkingError') {
                return -1;
              } else {
                return 2 * retryCount;
              }
            }
          }
        });
        helpers.mockHttpResponse({
          code: 'NetworkingError',
          message: 'Cannot connect'
        });
        makeRequest(function() {});
        return expect(delays).to.eql([]);
      });
      it('uses retry from error.retryDelay property', function() {
        var request, response;
        helpers.mockHttpResponse({
          code: 'NetworkingError',
          message: 'Cannot connect'
        });
        request = makeRequest();
        request.on('retry', function(resp) {
          return resp.error.retryDelay = 17;
        });
        response = request.send(function() {});
        return expect(delays).to.eql([17, 17, 17]);
      });
      it('retries if status code is >= 500', function() {
        helpers.mockHttpResponse(500, {}, '');
        return makeRequest(function(err) {
          expect(err.code).to.equal(500);
          expect(err.message).to.equal(null);
          expect(err.statusCode).to.equal(500);
          expect(err.retryable).to.equal(true);
          return expect(this.retryCount).to.equal(service.config.maxRetries);
        });
      });
      it('should not emit error if retried fewer than maxRetries', function() {
        var baseDelays, expectedDelays, i, response;
        helpers.mockIntermittentFailureResponse(2, 200, {}, 'foo');
        response = makeRequest(function() {});
        baseDelays = [100, 200];
        expectedDelays = (function() {
          var j, ref, results;
          results = [];
          for (i = j = 0, ref = delays.length - 1; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
            results.push(baseDelays[i] * randomValues[i]);
          }
          return results;
        })();
        expect(totalWaited).to.equal(expectedDelays.reduce(function(a, b) {
          return a + b;
        }));
        expect(response.retryCount).to.be.lessThan(service.config.maxRetries);
        expect(response.data).to.equal('foo');
        return expect(errorHandler.calls.length).to.equal(0);
      });
      ['ExpiredToken', 'ExpiredTokenException', 'RequestExpired'].forEach(function(name) {
        return it('invalidates expired credentials and retries', function() {
          var creds, response;
          helpers.spyOn(AWS.HttpClient, 'getInstance');
          AWS.HttpClient.getInstance.andReturn({
            handleRequest: function(req, opts, cb, errCb) {
              if (req.headers.Authorization.match('Credential=INVALIDKEY')) {
                helpers.mockHttpSuccessfulResponse(403, {}, name, cb);
              } else {
                helpers.mockHttpSuccessfulResponse(200, {}, 'DATA', cb);
              }
              return new AWS.SequentialExecutor();
            }
          });
          creds = {
            numCalls: 0,
            expired: false,
            accessKeyId: 'INVALIDKEY',
            secretAccessKey: 'INVALIDSECRET',
            get: function(cb) {
              if (this.expired) {
                this.numCalls += 1;
                this.expired = false;
                this.accessKeyId = 'VALIDKEY' + this.numCalls;
                this.secretAccessKey = 'VALIDSECRET' + this.numCalls;
              }
              return cb();
            }
          };
          service.config.credentials = creds;
          response = makeRequest(function() {});
          expect(response.retryCount).to.equal(1);
          expect(creds.accessKeyId).to.equal('VALIDKEY1');
          return expect(creds.secretAccessKey).to.equal('VALIDSECRET1');
        });
      });
      it('retries an expired signature error', function() {
        var request, response;
        helpers.mockHttpResponse(403, {}, '');
        request = makeRequest();
        request.on('extractError', function(resp) {
          return resp.error = {
            code: 'SignatureDoesNotMatch',
            message: 'Signature expired: 10 is now earlier than 20',
            retryable: false
          };
        });
        response = request.send();
        return expect(response.retryCount).to.equal(service.config.maxRetries);
      });
      ['RequestTimeTooSkewed', 'RequestExpired', 'RequestInTheFuture', 'InvalidSignatureException', 'SignatureDoesNotMatch', 'AuthFailure'].forEach(function(code) {
        return it('retries clock skew errors', function() {
          var request, response;
          helpers.mockHttpResponse(400, {}, '');
          service = new MockService({
            maxRetries: 3,
            correctClockSkew: true
          });
          request = makeRequest();
          request.on('extractError', function(resp) {
            return resp.error = {
              code: code,
              message: 'Client clock is skewed'
            };
          });
          response = request.send();
          return expect(response.retryCount).to.equal(service.config.maxRetries);
        });
      });
      it('does not apply clock skew correction when correctClockSkew is false', function() {
        var request, response;
        helpers.mockHttpResponse(400, {}, '');
        service = new MockService({
            maxRetries: 3,
            correctClockSkew: false
        });
        request = makeRequest();
        request.on('extractError', function(resp) {
          return resp.error = {
            code: 'RequestTimeTooSkewed',
            message: 'Client clock is skewed'
          };
        });
        response = request.send();
        return expect(response.retryCount).to.equal(0);
      });
      it('does not retry other signature errors if clock is not skewed', function() {
        var request, response;
        helpers.mockHttpResponse(403, {}, '');
        service = new MockService({
            maxRetries: 3,
            correctClockSkew: false
        });
        request = makeRequest();
        request.on('extractError', function(resp) {
          return resp.error = {
            code: 'SignatureDoesNotMatch',
            message: 'Invalid signature',
            retryable: false
          };
        });
        response = request.send();
        return expect(response.retryCount).to.equal(0);
      });
      [301, 307].forEach(function(code) {
        return it('attempts to redirect on ' + code + ' responses', function() {
          var response;
          helpers.mockHttpResponse(code, {
            location: 'http://redirected'
          }, '');
          service.config.maxRetries = 0;
          service.config.maxRedirects = 5;
          response = makeRequest(function() {});
          expect(response.request.httpRequest.endpoint.host).to.equal('redirected');
          expect(response.request.httpRequest.headers.Host).to.equal('redirected');
          expect(response.error.retryable).to.equal(true);
          expect(response.redirectCount).to.equal(service.config.maxRedirects);
          return expect(delays).to.eql([0, 0, 0, 0, 0]);
        });
      });
      return it('does not redirect if 3xx is missing location header', function() {
        var response;
        helpers.mockHttpResponse(304, {}, '');
        service.config.maxRetries = 0;
        response = makeRequest(function() {});
        expect(response.request.httpRequest.endpoint.host).not.to.equal('redirected');
        expect(response.request.httpRequest.headers.Host).not.to.equal('redirected');
        return expect(response.error.retryable).to.equal(false);
      });
    });

    describe('success', function() {
      return it('emits success on a successful response', function() {
        var response;
        helpers.mockHttpResponse(200, {}, 'Success!');
        response = makeRequest(function() {});
        expect(retryHandler.calls.length).to.equal(0);
        expect(errorHandler.calls.length).to.equal(0);
        expect(completeHandler.calls.length).not.to.equal(0);
        expect(successHandler.calls.length).not.to.equal(0);
        return expect(response.retryCount).to.equal(0);
      });
    });

    describe('error', function() {
      it('emits error if error found and should not be retrying', function() {
        var response;
        helpers.mockHttpResponse(400, {}, '');
        response = makeRequest(function() {});
        expect(retryHandler.calls.length).not.to.equal(0);
        expect(errorHandler.calls.length).not.to.equal(0);
        expect(completeHandler.calls.length).not.to.equal(0);
        expect(successHandler.calls.length).to.equal(0);
        return expect(response.retryCount).to.equal(0);
      });
      return it('emits error if an error is set in extractError', function() {
        var error, extractDataHandler, request, response;
        error = {
          code: 'ParseError',
          message: 'error message'
        };
        extractDataHandler = helpers.createSpy('extractData');
        helpers.mockHttpResponse(400, {}, '');
        request = makeRequest();
        request.on('extractData', extractDataHandler);
        request.on('extractError', function(resp) {
          return resp.error = error;
        });
        response = request.send(function() {});
        expect(response.error).to.equal(error);
        expect(extractDataHandler.calls.length).to.equal(0);
        expect(retryHandler.calls.length).not.to.equal(0);
        expect(errorHandler.calls.length).not.to.equal(0);
        return expect(completeHandler.calls.length).not.to.equal(0);
      });
    });

    describe('logging', function() {
      var data, logfn, logger, match;
      data = null;
      logger = null;
      logfn = function(d) {
        return data += d;
      };
      match = /\[AWS mock 200 .* 0 retries\] mockMethod\(.*foo.*bar.*\)/;
      beforeEach(function() {
        data = '';
        logger = {};
        return service = new MockService({
          logger: logger
        });
      });
      it('does nothing if logging is off', function() {
        service = new MockService({
          logger: null
        });
        helpers.mockHttpResponse(200, {}, []);
        makeRequest().send();
        return expect(completeHandler.calls.length).not.to.equal(0);
      });
      it('calls .log() on logger if it is available', function() {
        helpers.mockHttpResponse(200, {}, []);
        logger.log = logfn;
        makeRequest().send();
        return expect(data).to.match(match);
      });
      return it('calls .write() on logger if it is available', function() {
        helpers.mockHttpResponse(200, {}, []);
        logger.write = logfn;
        makeRequest().send();
        return expect(data).to.match(match);
      });
    });

    describe('logging sensitive information', function() {
      var logger;
      var data = null;
      var apiJSON = null;
      logfn = function(d) {
        return data += d;
      };
      beforeEach(function() {
        logger = {};
        data = '';
        apiJSON = {
          operations: {
            mockMethod: {
              input: {
                type: 'structure',
                members: {
                  foo: {
                    type: 'string',
                  }
                },
              },
              output: {}
            }
          },
          shapes: {}
        };
      });

      it('from input shape of scalars', function() {
        var allShapeTypes = ['boolean', 'timestamp', 'float','integer', 'string', 'base64', 'binary'];
        Array.prototype.forEach.call(allShapeTypes, function(shapeType) {
          apiJSON.operations.mockMethod.input.members.foo = {
            type: shapeType,
            sensitive: true
          };
          var api = new AWS.Model.Api(apiJSON);
          var CustomMockService = MockServiceFromApi(api);
          service = new CustomMockService({logger: logger});
          helpers.mockHttpResponse(200, {}, []);
          logger.log = logfn;
          service.makeRequest('mockMethod', {
            foo: '1234567'
          }).send();
          expect(data.indexOf('1234567')).to.equal(-1);
        });
      });

      it('from input of undefined', function() {
        apiJSON.operations.mockMethod.input.members.foo = {
          type: 'list',
          member: {
            type: 'structure',
            members: {
              bar: { sensitive: true },
              baz: {}
            }
          }
        };
        var api = new AWS.Model.Api(apiJSON);
        var CustomMockService = MockServiceFromApi(api);
        service = new CustomMockService({logger: logger});
        helpers.mockHttpResponse(200, {}, []);
        logger.log = logfn;
        service.makeRequest('mockMethod', {
          foo: [undefined, {bar: 'secret_key_id'}]
        }).send();
        expect(data.indexOf('secret_key_id')).to.equal(-1);
        expect(data.indexOf('undefined')).to.be.greaterThan(-1);
      });

      it('from structure shape with sensitive trait', function() {
        apiJSON.operations.mockMethod.input.sensitive = true;
        var api = new AWS.Model.Api(apiJSON);
        var CustomMockService = MockServiceFromApi(api);
        service = new CustomMockService({logger: logger});
        helpers.mockHttpResponse(200, {}, []);
        logger.log = logfn;
        var request = service.makeRequest('mockMethod', {
          foo: 'secret_key_id'
        });
        request.send();
        expect(data.indexOf('secret_key_id')).to.equal(-1);
        expect(data.indexOf('foo')).to.equal(-1);
      });

      it('from list shape with sensitive trait', function() {
        apiJSON.operations.mockMethod.input.members.foo = {
          type: 'list',
          member: {
            type: 'string'
          },
          sensitive: true
        };
        var api = new AWS.Model.Api(apiJSON);
        var CustomMockService = MockServiceFromApi(api);
        service = new CustomMockService({logger: logger});
        helpers.mockHttpResponse(200, {}, []);
        logger.log = logfn;
        service.makeRequest('mockMethod', {
          foo: ['secret_key_id', 'secret_access_key']
        }).send();
        expect(data.indexOf('secret_key_id')).to.equal(-1);
        expect(data.indexOf('secret_access_key')).to.equal(-1);
      });

      it('from map shape with sensitive trait', function() {
        apiJSON.operations.mockMethod.input.members.foo = {
          type: 'map',
          key: {
            type: 'string'
          },
          value: {
            type: 'string'
          },
          sensitive: true
        };
        var api = new AWS.Model.Api(apiJSON);
        var CustomMockService = MockServiceFromApi(api);
        service = new CustomMockService({logger: logger});
        helpers.mockHttpResponse(200, {}, []);
        logger.log = logfn;
        service.makeRequest('mockMethod', {
          foo: {
            key0: 'secret_key_id',
            key1: 'secret_key_id'
          }
        }).send();
        expect(data.indexOf('key0')).to.equal(-1);
        expect(data.indexOf('key1')).to.equal(-1);
        expect(data.indexOf('secret_key_id')).to.equal(-1);
      });

      it('from array of array shapes with sensitive trait', function() {
        apiJSON.operations.mockMethod.input.members.foo = {
          type: 'list',
          member: {
            type: 'list',
            member: {
              type: 'string',
              sensitive: true
            },
          }
        };
        var api = new AWS.Model.Api(apiJSON);
        var CustomMockService = MockServiceFromApi(api);
        service = new CustomMockService({logger: logger});
        helpers.mockHttpResponse(200, {}, []);
        logger.log = logfn;
        service.makeRequest('mockMethod', {
          foo: [['secret_access_key_a', 'secret_access_key_b']]
        }).send();
        expect(data.indexOf('secret_access_key_a')).to.equal(-1);
        expect(data.indexOf('secret_access_key_b')).to.equal(-1);
      });

      it('from array of structure shapes with sensitive trait', function() {
        apiJSON.operations.mockMethod.input.members.foo = {
          type: 'list',
          member: {
            type: 'structure',
            members: {
              bar: {shape: 'S1'}
            }
          }
        };
        apiJSON.shapes.S1 = {
          type: 'string',
          sensitive: true
        };
        var api = new AWS.Model.Api(apiJSON);
        var CustomMockService = MockServiceFromApi(api);
        service = new CustomMockService({logger: logger});
        helpers.mockHttpResponse(200, {}, []);
        logger.log = logfn;
        service.makeRequest('mockMethod', {
          foo: [{bar: 'secret_access_key_a'}, {bar: 'secret_access_key_b'}]
        }).send();
        expect(data.indexOf('bar')).to.be.greaterThan(-1);
        expect(data.indexOf('secret_access_key_a')).to.equal(-1);
        expect(data.indexOf('secret_access_key_b')).to.equal(-1);
      });

      it('from array of map shapes with sensitive trait', function() {
        apiJSON.operations.mockMethod.input.members.foo = {
          type: 'list',
          member: {
            type: 'map',
            key: {},
            value: { sensitive: true }
          }
        };
        var api = new AWS.Model.Api(apiJSON);
        var CustomMockService = MockServiceFromApi(api);
        service = new CustomMockService({logger: logger});
        helpers.mockHttpResponse(200, {}, []);
        logger.log = logfn;
        service.makeRequest('mockMethod', {
          foo: [{
            bar: 'secret_access_key_a',
            qux: 'secret_access_key_b'
          }]
        }).send();
        expect(data.indexOf('bar')).to.be.greaterThan(-1);
        expect(data.indexOf('qux')).to.be.greaterThan(-1);
        expect(data.indexOf('secret_access_key_a')).to.equal(-1);
        expect(data.indexOf('secret_access_key_b')).to.equal(-1);
      });

      it('from structure of array shapes with sensitive trait', function() {
        apiJSON.operations.mockMethod.input.members.foo = {
          type: 'structure',
          members: {
            bar: { shape: 'S1' }
          }
        };
        apiJSON.shapes.S1 = {
          type: 'list',
          member: {
            type: 'string'
          },
          sensitive: true
        };
        var api = new AWS.Model.Api(apiJSON);
        var CustomMockService = MockServiceFromApi(api);
        service = new CustomMockService({logger: logger});
        helpers.mockHttpResponse(200, {}, []);
        logger.log = logfn;
        service.makeRequest('mockMethod', {
          foo: {bar: ['secret_access_key']}
        }).send();
        expect(data.indexOf('secret_access_key')).to.equal(-1);
      });

      it('from structure of structure shapes with sensitive trait', function() {
        apiJSON.operations.mockMethod.input.members.foo = {
          type: 'structure',
          members: {
            bar: { shape: 'S1' }
          }
        };
        apiJSON.shapes.S1 = {
          type: 'structure',
          members: {
            qux: { shape: 'S2'}
          },
        };
        apiJSON.shapes.S2 = {
          sensitive: true
        };
        var api = new AWS.Model.Api(apiJSON);
        var CustomMockService = MockServiceFromApi(api);
        service = new CustomMockService({logger: logger});
        helpers.mockHttpResponse(200, {}, []);
        logger.log = logfn;
        service.makeRequest('mockMethod', {
          foo: {bar: {qux: 'secret_access_key'}}
        }).send();
        expect(data.indexOf('bar')).to.be.greaterThan(-1);
        expect(data.indexOf('qux')).to.be.greaterThan(-1);
        expect(data.indexOf('secret_access_key')).to.equal(-1);
      });

      it('from structure of map shapes with sensitive trait', function() {
        apiJSON.operations.mockMethod.input.members.foo = {
          type: 'structure',
          members: {
            bar: { shape: 'S1' }
          }
        };
        apiJSON.shapes.S1 = {
          type: 'map',
          key: {},
          value: { shape: 'S2' },
        };
        apiJSON.shapes.S2 = { sensitive: true };
        var api = new AWS.Model.Api(apiJSON);
        var CustomMockService = MockServiceFromApi(api);
        service = new CustomMockService({logger: logger});
        helpers.mockHttpResponse(200, {}, []);
        logger.log = logfn;
        service.makeRequest('mockMethod', {
          foo: {
            bar: {key0: 'secret_access_key_0', key1: 'secret_access_key_1'}
          }
        }).send();
        expect(data.indexOf('bar')).to.be.greaterThan(-1);
        expect(data.indexOf('secret_access_key_0')).to.equal(-1);
        expect(data.indexOf('secret_access_key_1')).to.equal(-1);
      });

      it('from map of structure shapes with sensitive trait', function() {
        apiJSON.operations.mockMethod.input.members.foo = {
          type: 'map',
          key: {},
          value: { shape: 'S1' }
        };
        apiJSON.shapes.S1 = {
          type: 'structure',
          members: {
            bar: { shape: 'S2' }
          }
        };
        apiJSON.shapes.S2 = { sensitive: true };
        var api = new AWS.Model.Api(apiJSON);
        var CustomMockService = MockServiceFromApi(api);
        service = new CustomMockService({logger: logger});
        helpers.mockHttpResponse(200, {}, []);
        logger.log = logfn;
        service.makeRequest('mockMethod', {
          foo: {
            key0: { bar: 'secret_access_key_0' },
            key1: { bar: 'secret_access_key_1' }
          }
        }).send();
        expect(data.indexOf('bar')).to.be.greaterThan(-1);
        expect(data.indexOf('secret_access_key_0')).to.equal(-1);
        expect(data.indexOf('secret_access_key_1')).to.equal(-1);
      });
    });

    describe('terminal callback error handling', function() {
      describe('without domains', function() {
        it('emits uncaughtException', function() {
          helpers.mockResponse({
            data: {}
          });
          expect(function() {
            return makeRequest(function() {
              return invalidCode;
            });
          }).to['throw']();
          expect(completeHandler.calls.length).to.equal(1);
          expect(errorHandler.calls.length).to.equal(0);
          return expect(retryHandler.calls.length).to.equal(0);
        });
        return ['error', 'complete'].forEach(function(evt) {
          return it('raise exceptions from terminal ' + evt + ' events', function() {
            var request;
            helpers.mockHttpResponse(500, {}, []);
            request = makeRequest();
            expect(function() {
              return request.send(function() {
                return invalidCode;
              });
            }).to['throw']();
            return expect(completeHandler.calls.length).not.to.equal(0);
          });
        });
      });
      if (AWS.util.isNode()) {
        describe('with domains', function() {
          var domains = [];

          function createDomain() {
            var domain = require('domain').create();
            domains.push(domain);
            return domain;
          };

          beforeEach(function() {
            return domains = [];
          });

          afterEach(function() {
            domains.forEach(function(d) {
              d.exit();
            });
          });

          it('sends error raised from complete event to a domain', function() {
            var result = false;
            var d = createDomain();

            d.on('error', function(e) {
              result = e;
            });

            d.run(function() {
              helpers.mockHttpResponse(200, {}, []);
              var request = makeRequest();

              request.on('complete', function() {
                // trigger a ReferenceError
                invalidCode;
              });

              expect(function() {
                request.send();
              }).not.to['throw']();

              expect(completeHandler.calls.length).not.to.equal(0);
              expect(retryHandler.calls.length).to.equal(0);
              expect(result.code).to.equal('ReferenceError');
            });
          });

          it('does not leak service error into domain', function() {
            var result = false;
            var d = createDomain();

            d.on('error', function(e) {
              result = e;
            });

            d.run(function() {
              helpers.mockHttpResponse(500, {}, []);
              makeRequest().send();
              expect(completeHandler.calls.length).not.to.equal(0);
              expect(result).to.equal(false);
            });
          });

          it('supports inner domains', function(done) {
            helpers.mockHttpResponse(200, {}, []);

            var err = new ReferenceError();
            var gotOuterError = false;
            var gotInnerError = false;
            var outerDomain = createDomain();

            outerDomain.on('error', function() {
              gotOuterError = true;
            });

            outerDomain.run(function() {
              var request = makeRequest();
              var innerDomain = createDomain();

              innerDomain.enter();
              innerDomain.add(request);

              innerDomain.on('error', function(domErr) {
                gotInnerError = true;
                expect(gotOuterError).to.equal(false);
                expect(gotInnerError).to.equal(true);
                expect(domErr.domainThrown).to.equal(false);
                expect(domErr.domain).to.equal(innerDomain);
                done();
              });

              request.send(function() {
                innerDomain.run(function() {
                  throw err;
                });
              });

            });
          });
        });
      }
    });
  });

}).call(this);

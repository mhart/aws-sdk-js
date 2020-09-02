(function() {
  var AWS, Buffer, helpers, svc;

  helpers = require('../helpers');

  AWS = helpers.AWS;

  Buffer = AWS.util.Buffer;

  svc = AWS.Protocol.Json;

  describe('AWS.Protocol.Json', function() {
    var MockJSONClient, request, response, service;
    MockJSONClient = AWS.util.inherit(AWS.Service, {
      endpointPrefix: 'mockservice',
      api: new AWS.Model.Api({
        metadata: {
          protocol: 'json',
          targetPrefix: 'prefix'
        },
        operations: {
          OperationName: {
            input: {
              type: 'structure',
              members: {}
            },
            output: {
              type: 'structure',
              members: {
                i: {
                  type: 'integer'
                },
                b: {
                  type: 'binary'
                },
                s: {
                  type: 'string'
                }
              }
            }
          }
        }
      })
    });
    AWS.Service.defineMethods(MockJSONClient);
    request = null;
    response = null;
    service = null;
    beforeEach(function() {
      service = new MockJSONClient({
        region: 'region'
      });
      request = new AWS.Request(service, 'operationName');
      return response = request.response;
    });
    describe('buildRequest', function() {
      var buildRequest;
      buildRequest = function() {
        return svc.buildRequest(request);
      };
      it('should use POST method requests', function() {
        buildRequest();
        return expect(request.httpRequest.method).to.equal('POST');
      });
      it('should perform all operations on root (/)', function() {
        buildRequest();
        return expect(request.httpRequest.path).to.equal('/');
      });
      it('allows mounted path to be specified', function() {
        service = new MockJSONClient({
          endpoint: 'https://localhost/foo/bar'
        });
        request = new AWS.Request(service, 'operationName');
        buildRequest();
        return expect(request.httpRequest.path).to.equal('/foo/bar');
      });
      it('should set Content-Type header', function() {
        buildRequest();
        return expect(request.httpRequest.headers['Content-Type']).to.equal('application/x-amz-json-1.0');
      });
      it('should set X-Amz-Target header', function() {
        buildRequest();
        return expect(request.httpRequest.headers['X-Amz-Target']).to.equal('prefix.OperationName');
      });
      it('should set the body to JSON serialized params', function() {
        service.api.operations.operationName.input.members.foo = new AWS.Model.Shape.create({
          type: 'string'
        }, {
          api: service.api
        });
        request.params = {
          foo: 'bar'
        };
        buildRequest();
        return expect(request.httpRequest.body).to.equal('{"foo":"bar"}');
      });
      return it('should preserve numeric types', function() {
        service.api.operations.operationName.input.members.count = new AWS.Model.Shape.create({
          type: 'integer'
        }, {
          api: service.api
        });
        request.params = {
          count: 3
        };
        buildRequest();
        return expect(request.httpRequest.body).to.equal('{"count":3}');
      });
    });
    describe('extractError', function() {
      var extractError;
      extractError = function(body) {
        response.httpResponse.statusCode = 500;
        response.httpResponse.statusMessage = 'Internal Server Error';
        response.httpResponse.body = AWS.util.buffer.toBuffer(body);
        return svc.extractError(response);
      };
      it('removes prefixes from the error code', function() {
        extractError('{"__type":"com.amazon.coral.service#ErrorCode" }');
        expect(response.error).to.be.instanceOf(Error);
        expect(response.error.code).to.equal('ErrorCode');
        return expect(response.data).to.equal(null);
      });
      it('returns the full code when a # is not present', function() {
        extractError('{"__type":"ErrorCode" }');
        expect(response.error).to.be.instanceOf(Error);
        expect(response.error.code).to.equal('ErrorCode');
        return expect(response.data).to.equal(null);
      });
      it('returns the status code when the body is blank', function() {
        extractError('');
        expect(response.error).to.be.instanceOf(Error);
        expect(response.error.code).to.equal('UnknownError');
        expect(response.error.statusCode).to.equal(500);
        expect(response.error.message).to.equal('500');
        return expect(response.data).to.equal(null);
      });
      it('returns the status code when the body is not valid JSON', function() {
        extractError('<html><body><b>Http/1.1 Service Unavailable</b></body> </html>');
        expect(response.error).to.be.instanceOf(Error);
        expect(response.error.code).to.equal('UnknownError');
        expect(response.error.statusCode).to.equal(500);
        expect(response.error.message).to.equal('Internal Server Error');
        return expect(response.data).to.equal(null);
      });
      it('returns UnknownError when the error type is not set', function() {
        extractError('{"message":"Error Message" }');
        expect(response.error).to.be.instanceOf(Error);
        expect(response.error.code).to.equal('UnknownError');
        expect(response.error.message).to.equal('Error Message');
        return expect(response.data).to.equal(null);
      });
      it('returns null for the message when not present', function() {
        extractError('{"__type":"ErrorCode" }');
        expect(response.error).to.be.instanceOf(Error);
        expect(response.error.message).to.equal(null);
        return expect(response.data).to.equal(null);
      });
      it('returns the message when present', function() {
        extractError('{"__type":"ErrorCode", "message":"Error Message" }');
        expect(response.error).to.be.instanceOf(Error);
        expect(response.error.message).to.equal('Error Message');
        return expect(response.data).to.equal(null);
      });
      it('returns the message when the message property is upper-cased', function() {
        extractError('{"__type":"ErrorCode", "Message":"Error Message" }');
        expect(response.error).to.be.instanceOf(Error);
        expect(response.error.message).to.equal('Error Message');
        return expect(response.data).to.equal(null);
      });
      it('returns a special message for RequestEntityToLarge errors', function() {
        extractError('{"__type":"RequestEntityTooLarge" }');
        expect(response.error).to.be.instanceOf(Error);
        expect(response.error.message).to.equal('Request body must be less than 1 MB');
        return expect(response.data).to.equal(null);
      });
      return it('extracts error type from "code" key (Glacier)', function() {
        extractError('{"code":"InvalidParameter"}');
        expect(response.error).to.be.instanceOf(Error);
        return expect(response.error.code).to.equal('InvalidParameter');
      });
    });
    return describe('extractData', function() {
      var extractData;
      extractData = function(body) {
        response.httpResponse.statusCode = 200;
        response.httpResponse.body = AWS.util.buffer.toBuffer(body);
        return svc.extractData(response);
      };
      it('JSON parses http response bodies', function() {
        extractData('{"i":1, "b":"AQID"}');
        expect(response.error).to.equal(null);
        expect(response.data.i).to.equal(1);
        return expect(response.data.b.toString()).to.equal('\u0001\u0002\u0003');
      });
      it('returns raw data if convertResponseTypes is false', function() {
        service.config.convertResponseTypes = false;
        extractData('{"i":1, "b":"AQID"}');
        expect(response.data.i).to.equal(1);
        return expect(response.data.b.toString()).to.equal('AQID');
      });
      it('returns an empty object when the body is an empty string', function() {
        extractData('');
        expect(response.error).to.equal(null);
        return expect(response.data).to.eql({});
      });
      it('returns an empty object when the body is null', function() {
        extractData('');
        expect(response.error).to.equal(null);
        return expect(response.data).to.eql({});
      });
      return it('can handle null binary values', function() {
        extractData('{"i":1, "b": null}');
        expect(response.error).to.equal(null);
        expect(response.data.i).to.equal(1);
        return expect(response.data.b).to.equal(null);
      });
    });
  });

}).call(this);

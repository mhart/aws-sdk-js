(function() {
  var AWS, Buffer, helpers, svc;

  helpers = require('../helpers');

  AWS = helpers.AWS;

  Buffer = AWS.util.Buffer;

  svc = AWS.Protocol.Query;

  describe('AWS.Protocol.Query', function() {
    var request, response, service;
    service = null;
    request = null;
    response = null;
    beforeEach(function() {
      service = new AWS.Service({
        apiConfig: {
          metadata: {
            endpointPrefix: 'mockservice',
            apiVersion: '2012-01-01'
          },
          operations: {
            OperationName: {
              name: 'OperationName',
              input: {
                members: {
                  Input: {
                    type: 'string'
                  },
                  List: {
                    type: 'list',
                    members: {}
                  }
                }
              },
              output: {
                type: 'structure',
                members: {
                  Data: {
                    type: 'structure',
                    members: {
                      Name: {
                        type: 'string'
                      },
                      Count: {
                        type: 'float'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
      request = new AWS.Request(service, 'operationName');
      return response = request.response;
    });
    describe('buildRequest', function() {
      var buildRequest, stringify;
      stringify = function(params) {
        return AWS.util.queryParamsToString(params);
      };
      buildRequest = function(input, list) {
        if (input === void 0) {
          input = 'foo+bar: yuck/baz=~';
        }
        request.params = {
          Input: input,
          List: list
        };
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
        service.setEndpoint('https://localhost/foo/bar');
        request = new AWS.Request(service, 'operationName');
        buildRequest();
        return expect(request.httpRequest.path).to.equal('/foo/bar');
      });
      it('should set Content-Type header', function() {
        buildRequest();
        return expect(request.httpRequest.headers['Content-Type']).to.equal('application/x-www-form-urlencoded; charset=utf-8');
      });
      it('should add the api version param', function() {
        buildRequest();
        return expect(stringify(request.httpRequest.params)).to.match(/Version=2012-01-01/);
      });
      it('should add the operation name as Action', function() {
        buildRequest();
        return expect(stringify(request.httpRequest.params)).to.match(/Action=OperationName/);
      });
      it('should uri encode params properly', function() {
        buildRequest();
        return expect(stringify(request.httpRequest.params)).to.match(/foo%2Bbar%3A%20yuck%2Fbaz%3D~/);
      });
      it('encodes empty string values properly', function() {
        buildRequest('');
        return expect(stringify(request.httpRequest.params)).to.match(/Input=($|&)/);
      });
      return it('serializes empty lists', function() {
        buildRequest(null, []);
        return expect(stringify(request.httpRequest.params)).to.match(/[?&]List=(&|$)/);
      });
    });
    describe('extractError', function() {
      var extractError;
      extractError = function(body) {
        if (body === void 0) {
          body = '<Error>\n  <Code>InvalidArgument</Code>\n  <Message>Provided param is bad</Message>\n</Error>';
        }
        response.httpResponse.statusCode = 400;
        response.httpResponse.statusMessage = 'Bad Request';
        response.httpResponse.body = AWS.util.buffer.toBuffer(body);
        return svc.extractError(response);
      };
      it('extracts error from UnknownOperationException', function() {
        extractError('<UnknownOperationException/>');
        expect(response.error).to.be.instanceOf(Error);
        expect(response.error.code).to.equal('UnknownOperation');
        expect(response.error.message).to.equal('Unknown operation operationName');
        return expect(response.data).to.equal(null);
      });
      it('extracts the error code and message', function() {
        extractError();
        expect(response.error).to.be.instanceOf(Error);
        expect(response.error.code).to.equal('InvalidArgument');
        expect(response.error.message).to.equal('Provided param is bad');
        return expect(response.data).to.equal(null);
      });
      it('returns an empty error when the body is blank', function() {
        extractError('');
        expect(response.error.code).to.equal(400);
        expect(response.error.message).to.equal(null);
        return expect(response.data).to.equal(null);
      });
      it('returns an empty error when the body cannot be parsed', function() {
        extractError(JSON.stringify({
          'foo': 'bar',
          'fizz': ['buzz', 'pop']
        }));
        expect(response.error.code).to.equal(400);
        expect(response.error.message).to.equal('Bad Request');
        return expect(response.data).to.equal(null);
      });
      it('extracts error when inside <Errors>', function() {
        extractError('<SomeResponse>\n  <Errors>\n    <Error>\n      <Code>code</Code><Message>msg</Message>\n    </Error>\n  </Errors>\n</SomeResponse>');
        expect(response.error.code).to.equal('code');
        return expect(response.error.message).to.equal('msg');
      });
      return it('extracts error when <Error> is nested', function() {
        extractError('<SomeResponse>\n  <Error>\n    <Code>code</Code><Message>msg</Message>\n  </Error>\n</SomeResponse>');
        expect(response.error.code).to.equal('code');
        return expect(response.error.message).to.equal('msg');
      });
    });
    return describe('extractData', function() {
      var extractData;
      extractData = function(body) {
        response.httpResponse.statusCode = 200;
        response.httpResponse.body = AWS.util.buffer.toBuffer(body);
        return svc.extractData(response);
      };
      it('parses the response using the operation output rules', function() {
        extractData('<xml>\n  <Data>\n    <Name>abc</Name>\n    <Count>123</Count>\n  </Data>\n</xml>');
        expect(response.error).to.equal(null);
        return expect(response.data).to.eql({
          Data: {
            Name: 'abc',
            Count: 123
          }
        });
      });
      it('performs default xml parsing when output rule is missing', function() {
        delete service.api.operations.operationName.output;
        extractData('<xml>\n  <data>\n    <name>abc</name>\n    <count>123</count>\n  </data>\n</xml>');
        expect(response.error).to.equal(null);
        return expect(response.data).to.eql({
          data: {
            name: 'abc',
            count: '123'
          }
        });
      });
      it('removes wrapping result element if resultWrapper is set', function() {
        service.api.operations.operationName.output.resultWrapper = 'OperationNameResult';
        extractData('<xml>\n  <OperationNameResult>\n    <Data>\n      <Name>abc</Name>\n      <Count>12345.5</Count>\n    </Data>\n  </OperationNameResult>\n</xml>');
        expect(response.error).to.equal(null);
        return expect(response.data).to.eql({
          Data: {
            Name: 'abc',
            Count: 12345.5
          }
        });
      });
      it('extracts requestId from the response', function() {
        extractData('<xml>\n  <requestId>12345-abcde</requestId>\n  <Data>\n    <Name>abc</Name>\n    <Count>123</Count>\n  </Data>\n</xml>');
        expect(response.requestId).to.equal('12345-abcde');
        return expect(response.data).to.eql({
          Data: {
            Name: 'abc',
            Count: 123
          }
        });
      });
      it('extracts requestId even if output members are absent', function() {
        delete service.api.operations.operationName.output;
        extractData('<xml>\n  <requestId>12345-abcde</requestId>\n</xml>');
        expect(response.requestId).to.equal('12345-abcde');
        return expect(response.data).to.eql({
          requestId: '12345-abcde'
        });
      });
      it('does not override RequestId if it is modeled', function() {
        var shape;
        shape = AWS.Model.Shape.create({
          type: 'string'
        }, {
          api: {
            protocol: 'query'
          }
        }, 'foo');
        service.api.operations.operationName.output.members.RequestId = shape;
        extractData('<xml>\n  <requestId>12345-abcde</requestId>\n  <foo>foo-bar</foo>\n  <Data>\n    <Name>abc</Name>\n    <Count>123</Count>\n  </Data>\n</xml>');
        return expect(response.data).to.eql({
          Data: {
            Name: 'abc',
            Count: 123
          },
          RequestId: 'foo-bar'
        });
      });
      return it('does not override requestId if it is modeled', function() {
        var shape;
        shape = AWS.Model.Shape.create({
          type: 'string'
        }, {
          api: {
            protocol: 'query'
          }
        }, 'foo');
        service.api.operations.operationName.output.members.requestId = shape;
        extractData('<xml>\n  <requestId>12345-abcde</requestId>\n  <foo>foo-bar</foo>\n  <Data>\n    <Name>abc</Name>\n    <Count>123</Count>\n  </Data>\n</xml>');
        return expect(response.data).to.eql({
          Data: {
            Name: 'abc',
            Count: 123
          },
          requestId: 'foo-bar'
        });
      });
    });
  });

}).call(this);

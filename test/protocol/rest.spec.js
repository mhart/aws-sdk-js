(function() {
  var AWS, Api, Operation, helpers, svc;

  helpers = require('../helpers');

  AWS = helpers.AWS;

  Operation = helpers.AWS.Model.Operation;

  Api = helpers.AWS.Model.Api;

  svc = AWS.Protocol.Rest;

  describe('AWS.Protocol.Rest', function() {
    var MockRESTService, defop, request, response, service;
    MockRESTService = helpers.util.inherit(AWS.Service, {
      endpointPrefix: 'mockservice'
    });
    request = null;
    response = null;
    service = null;
    beforeEach(function() {
      MockRESTService.prototype.api = new Api({
        operations: {
          SampleOperation: {
            http: {
              method: 'POST',
              requestUri: '/'
            }
          }
        }
      });
      AWS.Service.defineMethods(MockRESTService);
      service = new MockRESTService({
        region: 'region'
      });
      request = new AWS.Request(service, 'sampleOperation');
      return response = request.response;
    });
    defop = function(op) {
      return AWS.util.property(service.api.operations, 'sampleOperation', new Operation('sampleOperation', op, {
        api: service.api
      }));
    };
    describe('buildRequest', function() {
      var build, input;
      input = null;
      build = function() {
        svc.buildRequest(request);
        return request;
      };
      describe('method', function() {
        return it('populates method from the operation', function() {
          defop({
            http: {
              method: 'GET'
            }
          });
          return expect(build().httpRequest.method).to.equal('GET');
        });
      });
      describe('uri', function() {
        beforeEach(function() {
          return input = {
            type: 'structure',
            members: {
              Id: {
                location: 'uri',
                locationName: 'Id'
              }
            }
          };
        });
        it('populates uri from the operation', function() {
          defop({
            http: {
              requestUri: '/path'
            }
          });
          return expect(build().httpRequest.path).to.equal('/path');
        });
        it('appends to existing httpRequest endpoint', function() {
          service = new MockRESTService({
            endpoint: 'https://localhost/foo/bar'
          });
          request = new AWS.Request(service, 'sampleOperation');
          request.params = {
            Id: 'abc'
          };
          defop({
            input: input,
            http: {
              requestUri: '/Owner/{Id}'
            }
          });
          return expect(build().httpRequest.path).to.equal('/foo/bar/Owner/abc');
        });
        it('replaces param placeholders', function() {
          request.params = {
            Id: 'abc'
          };
          defop({
            input: input,
            http: {
              requestUri: '/Owner/{Id}'
            }
          });
          return expect(build().httpRequest.path).to.equal('/Owner/abc');
        });
        it('replaces param with empty string', function() {
          request.params = {
            Id: ''
          };
          defop({
            input: input,
            http: {
              requestUri: '/Owner/{Id}'
            }
          });
          return expect(build().httpRequest.path).to.equal('/Owner/');
        });
        it('can replace multiple path placeholders', function() {
          request.params = {
            Id: 'abc',
            Count: 123
          };
          input.members.Count = {
            type: 'integer',
            location: 'uri'
          };
          defop({
            input: input,
            http: {
              requestUri: '/{Id}/{Count}'
            }
          });
          return expect(build().httpRequest.path).to.equal('/abc/123');
        });
        it('performs querystring param replacements', function() {
          request.params = {
            Id: 'abc'
          };
          defop({
            input: input,
            http: {
              requestUri: '/path'
            }
          });
          input.members.Id = {
            location: 'querystring',
            locationName: 'id-param'
          };
          return expect(build().httpRequest.path).to.equal('/path?id-param=abc');
        });
        it('performs querystring param replacements on lists', function() {
          request.params = {
            Id: ['abc', 'def', 'ghi']
          };
          defop({
            input: input,
            http: {
              requestUri: '/path'
            }
          });
          input.members.Id = {
            type: 'list',
            location: 'querystring',
            locationName: 'a',
            member: {
              type: 'string'
            }
          };
          return expect(build().httpRequest.path).to.equal('/path?a=abc&a=def&a=ghi');
        });
        it('omits querystring when param is not provided', function() {
          defop({
            input: input,
            http: {
              requestUri: '/path'
            }
          });
          input.members.Id = {
            location: 'querystring',
            locationName: 'id-param'
          };
          return expect(build().httpRequest.path).to.equal('/path');
        });
        it('accpets multiple query params with uri params', function() {
          request.params = {
            Abc: 'abc',
            Xyz: 'xyz',
            Bar: 'bar'
          };
          defop({
            input: input,
            http: {
              requestUri: '/{Abc}/{Xyz}'
            }
          });
          input.members.Abc = {
            location: 'uri'
          };
          input.members.Xyz = {
            location: 'uri'
          };
          input.members.Foo = {
            location: 'querystring',
            locationName: 'foo'
          };
          input.members.Bar = {
            location: 'querystring',
            locationName: 'bar'
          };
          return expect(build().httpRequest.path).to.equal('/abc/xyz?bar=bar');
        });
        it('uri escapes params in both path and querystring', function() {
          request.params = {
            Path: 'a b',
            Query: 'a/b'
          };
          defop({
            input: input,
            http: {
              requestUri: '/{Path}'
            }
          });
          input.members.Path = {
            location: 'uri'
          };
          input.members.Query = {
            location: 'querystring',
            locationName: 'query'
          };
          return expect(build().httpRequest.path).to.equal('/a%20b?query=a%2Fb');
        });
        it('serialize params in right format in querystring', function() {
          var date = new Date(60 * 60 * 1000);
          request.params = {
            Foo: date,
            Bar: [date, date],
          };
          defop({
            input: input,
            http: {
              requestUri: '/path'
            }
          });
          input.members.Foo = {
            type: 'timestamp',
            timestampFormat: 'unixTimestamp',
            location: 'querystring',
            locationName: 'foo'
          };
          input.members.Bar = {
            type: 'list',
            location: 'querystring',
            member: {
              type: 'timestamp',
            }
          };
          expect(build().httpRequest.path).to.equal('/path?Bar=1970-01-01T01%3A00%3A00Z&Bar=1970-01-01T01%3A00%3A00Z&foo=3600');
        });
      });
      describe('headers', function() {
        beforeEach(function() {
          return input = {
            type: 'structure',
            members: {
              ACL: {
                location: 'header',
                locationName: 'x-amz-acl'
              }
            }
          };
        });
        it('populates the headers with present params', function() {
          request.params = {
            ACL: 'public-read'
          };
          defop({
            input: input
          });
          return expect(build().httpRequest.headers['x-amz-acl']).to.equal('public-read');
        });
        it('populates the headers type translations', function() {
          request.params = {
            Count: 123
          };
          defop({
            input: {
              members: {
                Count: {
                  locationName: 'count',
                  type: 'integer',
                  location: 'header'
                }
              }
            }
          });
          return expect(build().httpRequest.headers['count']).to.equal('123');
        });
        it('uses default rule name if locationName property is not present', function() {
          request.params = {
            ACL: 'public-read'
          };
          delete input.members.ACL.locationName;
          defop({
            input: input
          });
          return expect(build().httpRequest.headers['ACL']).to.equal('public-read');
        });
        return it('works with map types', function() {
          request.params = {
            Metadata: {
              foo: 'bar',
              abc: 'xyz'
            }
          };
          input.members.Metadata = {
            type: 'map',
            location: 'headers',
            locationName: 'x-amz-meta-'
          };
          defop({
            input: input
          });
          build();
          expect(request.httpRequest.headers['x-amz-meta-foo']).to.equal('bar');
          return expect(request.httpRequest.headers['x-amz-meta-abc']).to.equal('xyz');
        });
      });
      describe('timestamp header with format', function() {
        return it('populates the header with correct timestamp formatting', function() {
          var date;
          date = new Date();
          date.setMilliseconds(0);
          request.params = {
            IfModifiedSince: date
          };
          input.members.IfModifiedSince = {
            location: 'header',
            locationName: 'If-Modified-Since',
            type: 'timestamp',
            timestampFormat: 'rfc822'
          };
          defop({
            input: input
          });
          return expect(build().httpRequest.headers['If-Modified-Since']).to.equal(date.toUTCString());
        });
      });
      describe('timestamp header without format', function() {
        return it('populates the header using the api formatting', function() {
          var date;
          date = new Date();
          date.setMilliseconds(0);
          request.params = {
            IfModifiedSince: date
          };
          input.members.IfModifiedSince = {
            location: 'header',
            locationName: 'If-Modified-Since',
            type: 'timestamp'
          };
          defop({
            input: input
          });
          return expect(build().httpRequest.headers['If-Modified-Since']).to.equal(date.toUTCString());
        });
      });
      return describe('timestamp header with api formatting and parameter formatting', function() {
        return it('populates the header using the parameter formatting', function() {
          var date;
          date = new Date();
          date.setMilliseconds(0);
          request.params = {
            IfModifiedSince: date
          };
          input.members.IfModifiedSince = {
            location: 'header',
            locationName: 'If-Modified-Since',
            type: 'timestamp',
            timestampFormat: 'rfc822'
          };
          defop({
            input: input
          });
          return expect(build().httpRequest.headers['If-Modified-Since']).to.equal(date.toUTCString());
        });
      });
    });
    return describe('extractData', function() {
      var extract, output;
      output = {
        type: 'structure',
        members: {
          ContentType: {
            type: 'string',
            location: 'header',
            locationName: 'content-type'
          }
        }
      };
      extract = function() {
        defop({
          output: output
        });
        svc.extractData(response);
        return response;
      };
      describe('headers', function() {
        it('extracts header values', function() {
          response.httpResponse.headers['content-type'] = 'text/plain';
          return expect(extract().data.ContentType).to.equal('text/plain');
        });
        it('extracts headers when the rule name is camel-cased', function() {
          response.httpResponse.headers['content-type'] = 'text/plain';
          output.members.ContentType.locationName = 'Content-Type';
          return expect(extract().data.ContentType).to.equal('text/plain');
        });
        it('extracts headers when the header name is camel-cased', function() {
          response.httpResponse.headers['Content-Type'] = 'text/plain';
          return expect(extract().data.ContentType).to.equal('text/plain');
        });
        it('extracts map types from header', function() {
          output.members.Metadata = {
            type: 'map',
            location: 'headers',
            locationName: 'x-amz-meta-'
          };
          response.httpResponse.headers['X-AMZ-META-FOO'] = 'foo';
          response.httpResponse.headers['x-amz-meta-bar'] = 'bar';
          extract();
          expect(response.data.Metadata.FOO).to.equal('foo');
          return expect(response.data.Metadata.bar).to.equal('bar');
        });
        return it('adds empty map if no matching headers are found', function() {
          output.members.Metadata = {
            type: 'map',
            location: 'headers',
            locationName: 'x-amz-meta-'
          };
          return expect(extract().data.Metadata).to.eql({});
        });
      });
      return describe('status code', function() {
        it('extracts the http status when instructed to', function() {
          output.members.Result = {
            type: 'integer',
            location: 'statusCode'
          };
          response.httpResponse.statusCode = 200;
          return expect(extract().data.Result).to.equal(200);
        });
        return it('casts string status codes to integers', function() {
          output.members.Result = {
            type: 'integer',
            location: 'statusCode'
          };
          response.httpResponse.statusCode = '202';
          return expect(extract().data.Result).to.equal(202);
        });
      });
    });
  });

}).call(this);

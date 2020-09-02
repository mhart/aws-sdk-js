(function() {
  var AWS, Buffer, helpers, svc;

  helpers = require('../helpers');

  AWS = helpers.AWS;

  Buffer = AWS.util.Buffer;

  svc = AWS.Protocol.RestXml;

  describe('AWS.Protocol.RestXml', function() {
    var MockRESTXMLService, defop, request, response, service, xmlns;
    MockRESTXMLService = AWS.util.inherit(AWS.Service, {
      endpointPrefix: 'mockservice'
    });
    xmlns = 'http://mockservice.com/xmlns';
    request = null;
    response = null;
    service = null;
    beforeEach(function() {
      MockRESTXMLService.prototype.api = new AWS.Model.Api({
        metadata: {
          xmlNamespace: xmlns
        },
        operations: {
          SampleOperation: {
            http: {
              method: 'POST',
              requestUri: '/'
            }
          }
        }
      });
      AWS.Service.defineMethods(MockRESTXMLService);
      service = new MockRESTXMLService({
        region: 'region'
      });
      request = new AWS.Request(service, 'sampleOperation');
      return response = request.response;
    });
    defop = function(op) {
      return AWS.util.property(service.api.operations, 'sampleOperation', new AWS.Model.Operation('sampleOperation', op, {
        api: service.api
      }));
    };
    describe('buildRequest', function() {
      var build;
      build = function() {
        svc.buildRequest(request);
        return request;
      };
      describe('empty bodies', function() {
        it('defaults body to empty string when there are no inputs', function() {
          defop({
            input: {
              type: 'structure',
              members: {}
            }
          });
          return expect(build().httpRequest.body).to.equal('');
        });
        return it('defaults body to empty string when no body params are present', function() {
          request.params = {
            Bucket: 'abc',
            ACL: 'canned-acl'
          };
          defop({
            http: {
              requestUri: '/{Bucket}'
            },
            input: {
              type: 'structure',
              members: {
                Bucket: {
                  location: 'uri'
                },
                ACL: {
                  locationName: 'x-amz-acl',
                  location: 'header'
                }
              }
            }
          });
          build();
          expect(request.httpRequest.body).to.equal('');
          expect(request.httpRequest.path).to.equal('/abc');
          return expect(request.httpRequest.headers['x-amz-acl']).to.equal('canned-acl');
        });
      });
      describe('string bodies', function() {
        ['GET', 'HEAD'].forEach(function(method) {
          return it('does not populate a body on a ' + method + ' request', function() {
            request.params = {
              Data: 'abc'
            };
            defop({
              http: {
                method: method
              },
              input: {
                payload: 'Data',
                members: {
                  Data: {
                    type: 'string'
                  }
                }
              }
            });
            return expect(build().httpRequest.body).to.equal('');
          });
        });
        return it('populates the body with string types directly', function() {
          request.params = {
            Bucket: 'bucket-name',
            Data: 'abc'
          };
          defop({
            http: {
              requestUri: '/{Bucket}'
            },
            input: {
              payload: 'Data',
              members: {
                Bucket: {
                  location: 'uri'
                },
                Data: {
                  type: 'string'
                }
              }
            }
          });
          return expect(build().httpRequest.body).to.equal('abc');
        });
      });
      describe('xml bodies', function() {
        it('populates the body with XML from the params', function() {
          var xml;
          request.params = {
            ACL: 'canned-acl',
            Config: {
              Abc: 'abc',
              Locations: ['a', 'b', 'c'],
              Data: [
                {
                  Foo: 'foo1',
                  Bar: 'bar1'
                }, {
                  Foo: 'foo2',
                  Bar: 'bar2'
                }
              ]
            },
            Bucket: 'bucket-name',
            Marker: 'marker',
            Limit: 123,
            Metadata: {
              abc: 'xyz',
              mno: 'hjk'
            }
          };
          defop({
            http: {
              requestUri: '/{Bucket}'
            },
            input: {
              payload: 'Config',
              members: {
                Bucket: {
                  type: 'string',
                  location: 'uri'
                },
                Marker: {
                  type: 'string',
                  location: 'querystring',
                  locationName: 'next-marker'
                },
                Limit: {
                  type: 'integer',
                  location: 'querystring',
                  locationName: 'limit'
                },
                ACL: {
                  type: 'string',
                  location: 'header',
                  locationName: 'x-amz-acl'
                },
                Metadata: {
                  type: 'map',
                  location: 'headers',
                  locationName: 'x-amz-meta-'
                },
                Config: {
                  type: 'structure',
                  members: {
                    Abc: {
                      type: 'string'
                    },
                    Locations: {
                      type: 'list',
                      member: {
                        type: 'string',
                        locationName: 'Location'
                      }
                    },
                    Data: {
                      type: 'list',
                      member: {
                        type: 'structure',
                        members: {
                          Foo: {
                            type: 'string'
                          },
                          Bar: {
                            type: 'string'
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          });
          xml = '<Config xmlns="http://mockservice.com/xmlns">\n  <Abc>abc</Abc>\n  <Locations>\n    <Location>a</Location>\n    <Location>b</Location>\n    <Location>c</Location>\n  </Locations>\n  <Data>\n    <member>\n      <Foo>foo1</Foo>\n      <Bar>bar1</Bar>\n    </member>\n    <member>\n      <Foo>foo2</Foo>\n      <Bar>bar2</Bar>\n    </member>\n  </Data>\n</Config>';
          build();
          expect(request.httpRequest.method).to.equal('POST');
          expect(request.httpRequest.path).to.equal('/bucket-name?limit=123&next-marker=marker');
          expect(request.httpRequest.headers['x-amz-acl']).to.equal('canned-acl');
          expect(request.httpRequest.headers['x-amz-meta-abc']).to.equal('xyz');
          expect(request.httpRequest.headers['x-amz-meta-mno']).to.equal('hjk');
          return helpers.matchXML(request.httpRequest.body, xml);
        });
        return it('omits the body xml when body params are not present', function() {
          request.params = {
            Bucket: 'abc'
          };
          defop({
            http: {
              requestUri: '/{Bucket}'
            },
            input: {
              members: {
                Bucket: {
                  location: 'uri'
                },
                Config: {}
              }
            }
          });
          build();
          expect(request.httpRequest.body).to.equal('');
          return expect(request.httpRequest.path).to.equal('/abc');
        });
      });
      return it('uses payload member name for payloads', function() {
        request.params = {
          Data: {
            Member1: 'member1',
            Member2: 'member2'
          }
        };
        defop({
          input: {
            payload: 'Data',
            members: {
              Data: {
                type: 'structure',
                locationName: 'RootElement',
                members: {
                  Member1: {
                    type: 'string'
                  },
                  Member2: {
                    type: 'string'
                  }
                }
              }
            }
          }
        });
        return helpers.matchXML(build().httpRequest.body, '<RootElement xmlns="http://mockservice.com/xmlns">\n  <Member1>member1</Member1>\n  <Member2>member2</Member2>\n</RootElement>');
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
      it('extracts the error code and message', function() {
        extractError();
        expect(response.error).to.be.instanceOf(Error);
        expect(response.error.code).to.equal('InvalidArgument');
        expect(response.error.message).to.equal('Provided param is bad');
        return expect(response.data).to.equal(null);
      });
      it('returns an empty error when the body is blank', function() {
        extractError('');
        expect(response.error).to.be.instanceOf(Error);
        expect(response.error.code).to.equal(400);
        expect(response.error.message).to.equal(null);
        return expect(response.data).to.equal(null);
      });
      it('returns an empty error when the body cannot be parsed', function() {
        extractError(JSON.stringify({
          'foo': 'bar',
          'fizz': ['buzz', 'pop']
        }));
        expect(response.error).to.be.instanceOf(Error);
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
      it('parses the xml body', function() {
        defop({
          output: {
            type: 'structure',
            members: {
              Foo: {},
              Bar: {
                type: 'list',
                member: {
                  locationName: 'Item'
                }
              }
            }
          }
        });
        extractData('<xml>\n  <Foo>foo</Foo>\n  <Bar>\n    <Item>a</Item>\n    <Item>b</Item>\n    <Item>c</Item>\n  </Bar>\n</xml>');
        return expect(response.data).to.eql({
          Foo: 'foo',
          Bar: ['a', 'b', 'c']
        });
      });
      it('sets payload element to a Buffer object when it streams', function() {
        defop({
          output: {
            type: 'structure',
            payload: 'Body',
            members: {
              Body: {
                streaming: true
              }
            }
          }
        });
        extractData('Buffer data');
        expect(Buffer.isBuffer(response.data.Body)).to.equal(true);
        return expect(response.data.Body.toString()).to.equal('Buffer data');
      });
      it('sets payload element to String when it does not stream', function() {
        defop({
          output: {
            type: 'structure',
            payload: 'Body',
            members: {
              Body: {
                type: 'string'
              }
            }
          }
        });
        extractData('Buffer data');
        expect(typeof response.data.Body).to.equal('string');
        return expect(response.data.Body).to.equal('Buffer data');
      });
      it('sets payload element along with other outputs', function() {
        response.httpResponse.headers['x-amz-foo'] = 'foo';
        response.httpResponse.headers['x-amz-bar'] = 'bar';
        defop({
          output: {
            type: 'structure',
            payload: 'Baz',
            members: {
              Foo: {
                location: 'header',
                locationName: 'x-amz-foo'
              },
              Bar: {
                location: 'header',
                locationName: 'x-amz-bar'
              },
              Baz: {}
            }
          }
        });
        extractData('Buffer data');
        expect(response.data.Foo).to.equal('foo');
        expect(response.data.Bar).to.equal('bar');
        return expect(response.data.Baz).to.equal('Buffer data');
      });
      return it('parses headers when a payload is provided', function() {
        response.httpResponse.headers['x-amz-foo'] = 'foo';
        defop({
          output: {
            type: 'structure',
            payload: 'Bar',
            members: {
              Foo: {
                location: 'header',
                locationName: 'x-amz-foo'
              },
              Bar: {
                type: 'structure',
                members: {
                  Baz: {
                    type: 'string'
                  }
                }
              }
            }
          }
        });
        extractData('<Bar><Baz>Buffer data</Baz></Bar>');
        expect(response.data.Foo).to.equal('foo');
        return expect(response.data.Bar.Baz).to.equal('Buffer data');
      });
    });
  });

}).call(this);

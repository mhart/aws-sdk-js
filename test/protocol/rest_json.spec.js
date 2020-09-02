(function() {
  var AWS, Buffer, Operation, helpers, svc;

  helpers = require('../helpers');

  AWS = helpers.AWS;

  Operation = AWS.Model.Operation;

  Buffer = helpers.util.Buffer;

  svc = AWS.Protocol.RestJson;

  describe('AWS.Protocol.RestJson', function() {
    var MockJSONRESTService, defop, operation, request, response, service;
    MockJSONRESTService = helpers.util.inherit(AWS.Service, {
      endpointPrefix: 'mockservice'
    });
    operation = null;
    request = null;
    response = null;
    service = null;
    beforeEach(function() {
      MockJSONRESTService.prototype.api = new AWS.Model.Api({
        operations: {
          sampleOperation: {
            http: {
              method: 'POST',
              uri: '/'
            },
            input: {
              type: 'structure',
              members: {}
            },
            output: {
              type: 'structure',
              members: {
                a: {
                  type: 'string'
                },
                b: {
                  type: 'string'
                }
              }
            }
          }
        },
        shapes: {
          structureshape: {
            type: 'structure',
            members: {
              a: {
                type: 'string'
              },
              b: {
                type: 'string'
              }
            }
          }
        }
      });
      AWS.Service.defineMethods(MockJSONRESTService);
      operation = MockJSONRESTService.prototype.api.operations.sampleOperation;
      service = new MockJSONRESTService({
        region: 'region'
      });
      request = new AWS.Request(service, 'sampleOperation');
      return response = new AWS.Response(request);
    });
    defop = function(op) {
      return helpers.util.property(service.api.operations, 'sampleOperation', new Operation('sampleOperation', op, {
        api: service.api
      }));
    };
    describe('buildRequest', function() {
      var build;
      build = function() {
        svc.buildRequest(request);
        return request;
      };

      describe('method', function() {
        it('populates method from the operation', function() {
          defop({
            http: {
              method: 'GET'
            }
          });
          expect(build().httpRequest.method).to.equal('GET');
        });
      });

      describe('uri', function() {
        it('populates uri from the operation', function() {
          defop({
            http: {
              requestUri: '/path'
            }
          });
          expect(build().httpRequest.path).to.equal('/path');
        });

        it('replaces param placeholders', function() {
          request.params = {
            Id: 'abc'
          };
          defop({
            http: {
              requestUri: '/Owner/{Id}'
            },
            input: {
              type: 'structure',
              members: {
                Id: {
                  location: 'uri'
                }
              }
            }
          });
          expect(build().httpRequest.path).to.equal('/Owner/abc');
        });

        it('can replace multiple path placeholders', function() {
          request.params = {
            Id: 'abc',
            Count: 123
          };
          defop({
            http: {
              requestUri: '/{Id}/{Count}'
            },
            input: {
              type: 'structure',
              members: {
                Id: {
                  location: 'uri',
                  type: 'string'
                },
                Count: {
                  type: 'integer',
                  location: 'uri'
                }
              }
            }
          });
          expect(build().httpRequest.path).to.equal('/abc/123');
        });

        it('performs querystring param replacements', function() {
          request.params = {
            Id: 'abc'
          };
          defop({
            http: {
              requestUri: '/path'
            },
            input: {
              type: 'structure',
              members: {
                Id: {
                  location: 'querystring',
                  locationName: 'id-param'
                }
              }
            }
          });
          expect(build().httpRequest.path).to.equal('/path?id-param=abc');
        });
      });

      describe('headers', function() {
        it('populates the headers with present params', function() {
          request.params = {
            ACL: 'public-read'
          };
          defop({
            input: {
              members: {
                ACL: {
                  location: 'header',
                  locationName: 'x-amz-acl'
                }
              }
            }
          });
          expect(build().httpRequest.headers['x-amz-acl']).to.equal('public-read');
        });

        it('uses default rule name if .n property is not present', function() {
          request.params = {
            ACL: 'public-read'
          };
          defop({
            input: {
              members: {
                ACL: {
                  location: 'header'
                }
              }
            }
          });
          expect(build().httpRequest.headers['ACL']).to.equal('public-read');
        });

        it('works with map types', function() {
          request.params = {
            Metadata: {
              foo: 'bar',
              abc: 'xyz'
            }
          };
          defop({
            input: {
              members: {
                Metadata: {
                  type: 'map',
                  location: 'headers',
                  locationName: 'x-amz-meta-'
                }
              }
            }
          });
          build();
          expect(request.httpRequest.headers['x-amz-meta-foo']).to.equal('bar');
          expect(request.httpRequest.headers['x-amz-meta-abc']).to.equal('xyz');
        });

        it('should add a Content-Type header', function() {
          request.params = {};
          defop({
            http: {
              method: 'POST'
            }
          });
          build();
          expect(request.httpRequest.headers['Content-Type'])
            .to.equal('application/json');
        });

        it('should add a Content-Type with binary/octet-stream if paylaod is binary', function() {
          request.params = {
            Body: 'foobar'
          };
          defop({
            input: {
              payload: 'Body',
              members: {
                Body: {
                  type: 'binary'
                }
              }
            }
          });
          expect(build().httpRequest.headers['Content-Type']).to.equal('binary/octet-stream');
        });

        it('should add a Content-Type with binary/octet-stream if paylaod is streaming', function() {
          request.params = {
            Body: 'foobar'
          };
          defop({
            input: {
              payload: 'Body',
              members: {
                Body: {
                  type: 'blob',
                  streaming: true
                }
              }
            }
          });
          expect(build().httpRequest.headers['Content-Type']).to.equal('binary/octet-stream');
        });

        it('should not add a Content-Type if paylaod is already defined', function() {
          request.params = {
            Body: 'foobar'
          };

          request.httpRequest.headers['Content-Type'] = 'foo';
          defop({
            input: {
              payload: 'Body',
              members: {
                Body: {
                  type: 'blob',
                  streaming: true
                }
              }
            }
          });
          expect(build().httpRequest.headers['Content-Type']).to.equal('foo');
        });

      });

      describe('body', function() {
        ['HEAD', 'DELETE'].forEach(function(method) {
          it('does not populate a body on a ' + method + ' request', function() {
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
            expect(build().httpRequest.body).to.equal('');
          });
        });

        it('does not send empty for GET methods', function() {
          request.params = {};
          defop({
            http: {
              method: 'GET'
            },
            input: {
              members: {
                Data: {
                  type: 'string'
                }
              }
            }
          });
          expect(build().httpRequest.body).to.eql('');

          ['POST', 'PUT'].forEach(function(method) {
            defop({
              http: {
                method: method
              },
              input: {
                members: {
                  Data: {
                    type: 'string'
                  }
                }
              }
            });
            expect(build().httpRequest.body).to.eql('{}');
          });
        });

        it('builds root element if rules contains root', function() {
          request.params = {
            Config: {
              Name: 'foo',
              Type: 'bar'
            }
          };
          defop({
            input: {
              payload: 'Config',
              members: {
                Config: {
                  type: 'structure',
                  members: {
                    Name: {
                      type: 'string'
                    },
                    Type: {
                      type: 'string'
                    }
                  }
                }
              }
            }
          });
          expect(build().httpRequest.body.toString()).to.equal('{"Name":"foo","Type":"bar"}');
        });

        it('builds payload element as non JSON data if rules contains payload', function() {
          request.params = {
            Body: 'foobar'
          };
          defop({
            input: {
              payload: 'Body',
              members: {
                Body: {
                  type: 'binary'
                }
              }
            }
          });
          expect(build().httpRequest.body).to.equal('foobar');
        });
      });
    });

    describe('extractError', function() {
      var extractError;
      extractError = function(body) {
        response.httpResponse.statusCode = 500;
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
      return it('returns a special message for RequestEntityToLarge errors', function() {
        extractError('{"__type":"RequestEntityTooLarge" }');
        expect(response.error).to.be.instanceOf(Error);
        expect(response.error.message).to.equal('Request body must be less than 1 MB');
        return expect(response.data).to.equal(null);
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
        defop({
          output: {
            type: 'structure',
            members: {
              a: {
                type: 'integer'
              },
              b: {
                type: 'string'
              }
            }
          }
        });
        extractData('{"a":1, "b":"xyz"}');
        expect(response.error).to.equal(null);
        return expect(response.data).to.eql({
          a: 1,
          b: 'xyz'
        });
      });
      it('pulls header data out of response', function() {
        response.httpResponse.headers['x-title'] = 'The title';
        defop({
          output: {
            type: 'structure',
            members: {
              Title: {
                location: 'header',
                locationName: 'x-title'
              }
            }
          }
        });
        extractData('{}');
        expect(response.error).to.equal(null);
        return expect(response.data.Title).to.equal('The title');
      });
      it('pulls body out into data key if body is a scalar payload', function() {
        defop({
          output: {
            type: 'structure',
            payload: 'Body',
            members: {
              Body: {
                location: 'body',
                type: 'string'
              }
            }
          }
        });
        extractData('foobar');
        expect(response.error).to.equal(null);
        return expect(response.data.Body).to.equal('foobar');
      });
      it('pulls body out into data key if body is a structure payload', function() {
        defop({
          output: {
            type: 'structure',
            payload: 'Body',
            members: {
              Body: {
                shape: 'structureshape'
              }
            }
          }
        });
        extractData('{"a": "foo", "b": "bar"}');
        expect(response.error).to.equal(null);
        return expect(response.data.Body).to.eql({
          a: 'foo',
          b: 'bar'
        });
      });
      it('pulls body out as Buffer if body is streaming payload', function() {
        defop({
          output: {
            type: 'structure',
            payload: 'Body',
            members: {
              Body: {
                location: 'body',
                type: 'binary',
                streaming: true
              }
            }
          }
        });
        extractData('foobar');
        expect(response.error).to.equal(null);
        expect(Buffer.isBuffer(response.data.Body)).to.equal(true);
        return expect(response.data.Body.toString()).to.equal('foobar');
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
        defop({
          output: {
            type: 'structure',
            members: {
              bin: {
                type: 'binary'
              },
              i: {
                type: 'integer'
              }
            }
          }
        });
        extractData('{"i": 1, "bin": null}');
        expect(response.error).to.equal(null);
        expect(response.data.i).to.equal(1);
        return expect(response.data.bin).to.equal(null);
      });
    });
  });

}).call(this);

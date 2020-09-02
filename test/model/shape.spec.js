(function() {
  var AWS, helpers;

  helpers = require('../helpers');

  AWS = helpers.AWS;

  describe('AWS.Model.Shape', function() {
    describe('Traits', function() {
      it('inherits sensitive trait', function() {
        var api, shape;
        api = new AWS.Model.Api({
          shapes: {
            S2: {
              'type': 'blob',
              'sensitive': true
            }
          }
        });
        shape = AWS.Model.Shape.create({
          members: {
            body: {
              shape: 'S2'
            }
          }
        }, {
          api: api
        });
        return expect(shape.members.body.isSensitive).to.eql(true);
      });
      return it('inherits streaming trait', function() {
        var api, shape;
        api = new AWS.Model.Api({
          shapes: {
            S1: {
              'type': 'blob',
              'streaming': true
            }
          }
        });
        shape = AWS.Model.Shape.create({
          members: {
            body: {
              shape: 'S1'
            }
          }
        }, {
          api: api
        });
        return expect(shape.members.body.isStreaming).to.eql(true);
      });
    });

    if (AWS.util.isNode() && AWS.util.Buffer.alloc) {
      describe('Sensitive binary data', function() {
        it('should not use Buffer.from() for decoding sensitive data', function() {
          var binaryTypes = ['blob', 'binary', 'base64'];
          for (var i = 0; i < binaryTypes.length; i++) {
              api = new AWS.Model.Api({
                shapes: {
                  S2: {
                    'type': binaryTypes[i],
                    'sensitive': true
                  }
                }
              });
              var buf = api.shapes.S2.toType([0x11, 0x12]);
              // The shared buffer space in NodeJS. Response sensitive data should not lay in here
              // see: https://nodejs.org/docs/latest/api/buffer.html#buffer_buffer_from_buffer_alloc_and_buffer_allocunsafe
              var bufferSpace = new Uint8Array(AWS.util.Buffer.from('foo').buffer);
              expect(bufferSpace[buf.byteOffset]).to.not.eql(0x11);
              expect(bufferSpace[buf.byteOffset+1]).to.not.eql(0x12);
          };
        });
      });
    }

    return describe('TimestampShape', function() {
      describe('timestampFormat', function() {
        it('can be inherited', function() {
          var api = new AWS.Model.Api({
              metadata: {
                timestampFormat: 'rfc822'
              },
              shapes: {
                S1: {
                  type: 'timestamp',
                  timestampFormat: 'iso8601'
                }
              }
            });
            var shape = AWS.Model.Shape.create({
              members: {
                Date: {
                  shape: 'S1'
                }
              }
            }, {
              api: api
            });
            expect(shape.members.Date.timestampFormat).to.eql('iso8601');
        });
        it('prefers rfc822 if header', function() {
          var api = new AWS.Model.Api({
              metadata: {
                timestampFormat: 'iso8601'
              },
              shapes: {
                S1: {
                  type: 'timestamp'
                }
              }
            });
            var shape = AWS.Model.Shape.create({
              members: {
                Date: {
                  shape: 'S1',
                  location: 'header'
                }
              }
            }, {
              api: api
            });
            expect(shape.members.Date.timestampFormat).to.eql('rfc822');
        });
        it('prefers own timestampFormat if not header', function() {
          var api = new AWS.Model.Api({
            metadata: {
              timestampFormat: 'unixTimestamp'
            },
            shapes: {
              S1: {
                type: 'timestamp',
                timestampFormat: 'rfc822'
              }
            }
          });
          var shape = AWS.Model.Shape.create({
            members: {
              Date: {
                shape: 'S1',
                timestampFormat: 'iso8601'
              }
            }
          }, {
            api: api
          });
          expect(shape.members.Date.timestampFormat).to.eql('iso8601');
        });
        it('will default to unixTimestamp when if not specified and protocol is json', function() {
          var api = new AWS.Model.Api({
            metadata: {
              protocol: 'json'
            },
            shapes: {
              S1: {
                type: 'timestamp'
              }
            }
          });
          var shape = AWS.Model.Shape.create({
            members: {
              Date: {
                shape: 'S1',
              }
            }
          }, {
            api: api
          });
          expect(shape.members.Date.timestampFormat).to.eql('unixTimestamp');
        });
        it('will default to unixTimestamp when if not specified and protocol is rest-json', function() {
          var api = new AWS.Model.Api({
            metadata: {
              protocol: 'rest-json'
            },
            shapes: {
              S1: {
                type: 'timestamp'
              }
            }
          });
          var shape = AWS.Model.Shape.create({
            members: {
              Date: {
                shape: 'S1',
              }
            }
          }, {
            api: api
          });
          expect(shape.members.Date.timestampFormat).to.eql('unixTimestamp');
        });
        it('will default to iso8601 when if not specified and protocol is rest-xml', function() {
          var api = new AWS.Model.Api({
            metadata: {
              protocol: 'rest-xml'
            },
            shapes: {
              S1: {
                type: 'timestamp'
              }
            }
          });
          var shape = AWS.Model.Shape.create({
            members: {
              Date: {
                shape: 'S1',
              }
            }
          }, {
            api: api
          });
          expect(shape.members.Date.timestampFormat).to.eql('iso8601');
        });
        it('will default to iso8601 when if not specified and protocol is query', function() {
          var api = new AWS.Model.Api({
            metadata: {
              protocol: 'query'
            },
            shapes: {
              S1: {
                type: 'timestamp'
              }
            }
          });
          var shape = AWS.Model.Shape.create({
            members: {
              Date: {
                shape: 'S1',
              }
            }
          }, {
            api: api
          });
          expect(shape.members.Date.timestampFormat).to.eql('iso8601');
        });
        it('will default to iso8601 when if not specified and protocol is ec2', function() {
          var api = new AWS.Model.Api({
            metadata: {
              protocol: 'ec2'
            },
            shapes: {
              S1: {
                type: 'timestamp'
              }
            }
          });
          var shape = AWS.Model.Shape.create({
            members: {
              Date: {
                shape: 'S1',
              }
            }
          }, {
            api: api
          });
          expect(shape.members.Date.timestampFormat).to.eql('iso8601');
        });
      });

      describe('toType()', function() {
        it('converts unix timestamps', function() {
          var api, date, shape;
          api = new AWS.Model.Api({
            metadata: {
              timestampFormat: 'unixTimestamp'
            }
          });
          shape = AWS.Model.Shape.create({
            type: 'timestamp'
          }, {
            api: api
          });
          date = shape.toType(12300);
          return expect(date).to.eql(new Date(12300000));
        });
        it('converts iso8601 timestamps', function() {
          var api, date, shape;
          api = new AWS.Model.Api({
            metadata: {
              timestampFormat: 'iso8601'
            }
          });
          shape = AWS.Model.Shape.create({
            type: 'timestamp'
          }, {
            api: api
          });
          date = shape.toType('1970-01-01T00:00:00Z');
          return expect(date).to.eql(new Date(0));
        });
        return it('converts rfc822 timestamps', function() {
          var api, date, shape;
          api = new AWS.Model.Api({
            metadata: {
              timestampFormat: 'rfc822'
            }
          });
          shape = AWS.Model.Shape.create({
            type: 'timestamp'
          }, {
            api: api
          });
          date = shape.toType('Thu, 01 Jan 1970 00:00:00 GMT');
          return expect(date).to.eql(new Date(0));
        });
      });
      describe('toWireFormat()', function() {
        it('converts all header shapes to rfc822', function() {
          var api, date, shape;
          api = new AWS.Model.Api({
            metadata: {
              timestampFormat: 'unixTimestamp'
            }
          });
          shape = AWS.Model.Shape.create({
            type: 'timestamp',
            location: 'header'
          }, {
            api: api
          });
          date = shape.toWireFormat(new Date(0));
          return expect(date).to.match(/Thu, 0?1 Jan 1970 00:00:00 (GMT|UTC)/);
        });
        it('converts all timestamps in JSON protocol to unixTimestamp', function() {
          var api, date, shape;
          api = new AWS.Model.Api({
            metadata: {
              protocol: 'json'
            }
          });
          shape = AWS.Model.Shape.create({
            type: 'timestamp'
          }, {
            api: api
          });
          date = shape.toWireFormat(new Date(12300000));
          expect(date).to.equal(12300);
          api = new AWS.Model.Api({
            metadata: {
              protocol: 'rest-json'
            }
          });
          shape = AWS.Model.Shape.create({
            type: 'timestamp'
          }, {
            api: api
          });
          date = shape.toWireFormat(new Date(12300000));
          return expect(date).to.equal(12300);
        });
        return it('converts all timestamps in XML/query protocol to iso8601', function() {
          var api, date, shape;
          api = new AWS.Model.Api({
            metadata: {
              protocol: 'rest-xml'
            }
          });
          shape = AWS.Model.Shape.create({
            type: 'timestamp'
          }, {
            api: api
          });
          date = shape.toWireFormat(new Date(12300000));
          expect(date).to.equal('1970-01-01T03:25:00Z');
          api = new AWS.Model.Api({
            metadata: {
              protocol: 'query'
            }
          });
          shape = AWS.Model.Shape.create({
            type: 'timestamp'
          }, {
            api: api
          });
          date = shape.toWireFormat(new Date(12300000));
          return expect(date).to.equal('1970-01-01T03:25:00Z');
        });
      });
      return describe('BooleanShape', function() {
        return describe('toType()', function() {
          var shape;
          shape = AWS.Model.Shape.create({
            type: 'boolean'
          });
          it('converts true / false booleans', function() {
            expect(shape.toType(true)).to.eql(true);
            return expect(shape.toType(false)).to.eql(false);
          });
          it('converts string "true" and "false" to boolean', function() {
            expect(shape.toType('true')).to.eql(true);
            return expect(shape.toType('false')).to.eql(false);
          });
          it('converts other strings to false', function() {
            return expect(shape.toType('nottrue')).to.eql(false);
          });
          return it('converts null/undefined to null', function() {
            expect(shape.toType(null)).to.eql(null);
            return expect(shape.toType(void 0)).to.eql(null);
          });
        });
      });
    });
  });

}).call(this);

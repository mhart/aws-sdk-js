(function() {
  var helpers = require('../helpers');
  var AWS = helpers.AWS;
  var toBuffer = AWS.util.buffer.toBuffer;
  var encode = AWS.util.base64.encode;
  var isBrowser = AWS.util.isBrowser;
  var docClient = null;
  var NumberValue = require('../../lib/dynamodb/numberValue');

  beforeEach(function() {
    return docClient = new AWS.DynamoDB.DocumentClient();
  });

  var translateInput = function(input) {
    var request;
    request = docClient.put(input);
    request.emit('validate', [request]);
    return request.params;
  };

  describe('AWS.DynamoDB.DocumentClient', function() {
    it('returns a request', function() {
      var request;
      request = docClient.get({
        Key: {
          foo: 1
        }
      });
      return expect(request instanceof AWS.Request).to.equal(true);
    });

    describe('supports sets', function() {
      it('validates type of set', function() {
        return expect(function() {
          return docClient.createSet([true, false, false]);
        }).to['throw']('Sets can contain string, number, or binary values');
      });

      it('detects type of sets', function() {
        expect(docClient.createSet(['1', '2', 'string']).type).to.equal('String');
        expect(docClient.createSet([1, 2, 3]).type).to.equal('Number');
        return expect(docClient.createSet([toBuffer('foo'), toBuffer('bar')]).type).to.equal('Binary');
      });

      it('supports sets with falsy values', function() {
        expect(docClient.createSet([0]).type).to.equal('Number');
        return expect(docClient.createSet(['']).type).to.equal('String');
      });

      it('validates set elements if validate: true', function() {
        expect(function() {
          return docClient.createSet([1, 2, 'string'], {
            validate: true
          });
        }).to['throw']('Number Set contains String value');
        expect(function() {
          return docClient.createSet(['string', 'string', 2], {
            validate: true
          });
        }).to['throw']('String Set contains Number value');
        expect(function() {
          return docClient.createSet([1, 2, toBuffer('foo')], {
            validate: true
          });
        }).to['throw']('Number Set contains Binary value');
      });

      it('does not validate set elements if validate: true unset', function() {
        expect(function() {
          return docClient.createSet([1, 2, 'string']);
        }).to.not['throw']('Number Set contains String value');
        expect(function() {
          return docClient.createSet(['string', 'string', 2]);
        }).to.not['throw']('String Set contains Number value');
        expect(function() {
          return docClient.createSet([1, 2, toBuffer('foo')]);
        }).to.not['throw']('Number Set contains Binary value');
      });
    });

    describe('input', function() {
      it('translates strings', function() {
        var input, params;
        input = {
          Item: {
            foo: 'bar'
          }
        };
        params = {
          Item: {
            foo: {
              S: 'bar'
            }
          }
        };
        expect(translateInput(input)).to.eql(params);
      });

      it('converts empty strings to null when convertEmptyValues option set', function() {
        var client, input, params, request;
        input = {
          Item: {
            foo: ''
          }
        };
        params = {
          Item: {
            foo: {
              NULL: true
            }
          }
        };
        client = new AWS.DynamoDB.DocumentClient({
          convertEmptyValues: true
        });
        request = client.put(input);
        request.emit('validate', [request]);

        expect(request.params).to.eql(params);
      });

      it('does not convert empty strings to null when convertEmptyValues option not set', function() {
        var client, input, params, request;
        input = {
          Item: {
            foo: ''
          }
        };
        params = {
          Item: {
            foo: {
              S: ''
            }
          }
        };
        client = new AWS.DynamoDB.DocumentClient();
        request = client.put(input);
        request.emit('validate', [request]);
        expect(request.params).to.eql(params);
      });

      it('translates binary buffers', function() {
        var buffer, input, params;
        buffer = toBuffer('bar');
        input = {
          Item: {
            foo: buffer
          }
        };
        params = {
          Item: {
            foo: {
              B: buffer
            }
          }
        };
        expect(translateInput(input)).to.eql(params);
      });

      it('converts empty binary buffers to null when convertEmptyValues option set', function() {
        var buffer, client, input, params, request;
        buffer = toBuffer('');
        input = {
          Item: {
            foo: buffer
          }
        };
        params = {
          Item: {
            foo: {
              NULL: true
            }
          }
        };
        client = new AWS.DynamoDB.DocumentClient({
          convertEmptyValues: true
        });
        request = client.put(input);
        request.emit('validate', [request]);
        expect(request.params).to.eql(params);
      });

      it('does not convert empty binary buffers to null when convertEmptyValues option not set', function() {
        var buffer, client, input, params, request;
        buffer = toBuffer('');
        input = {
          Item: {
            foo: buffer
          }
        };
        params = {
          Item: {
            foo: {
              B: buffer
            }
          }
        };
        client = new AWS.DynamoDB.DocumentClient();
        request = client.put(input);
        request.emit('validate', [request]);
        expect(request.params).to.eql(params);
      });

      it('translates numbers', function() {
        var input, params;
        input = {
          Item: {
            foo: 1
          }
        };
        params = {
          Item: {
            foo: {
              N: '1'
            }
          }
        };
        expect(translateInput(input)).to.eql(params);
      });

      it('translates booleans', function() {
        var input, params;
        input = {
          Item: {
            foo: true,
            bar: false
          }
        };
        params = {
          Item: {
            foo: {
              BOOL: true
            },
            bar: {
              BOOL: false
            }
          }
        };
        expect(translateInput(input)).to.eql(params);
      });

      it('translates null', function() {
        var input, params;
        input = {
          Item: {
            foo: null
          }
        };
        params = {
          Item: {
            foo: {
              NULL: true
            }
          }
        };
        expect(translateInput(input)).to.eql(params);
      });

      it('translates maps', function() {
        var input, params;
        input = {
          Item: {
            foo: {
              bar: 'string',
              baz: 'string'
            }
          }
        };
        params = {
          Item: {
            foo: {
              M: {
                bar: {
                  S: 'string'
                },
                baz: {
                  S: 'string'
                }
              }
            }
          }
        };
        expect(translateInput(input)).to.eql(params);
      });

      it('converts empty map members to null when convertEmptyValues option set', function() {
        var client, input, params, request;
        input = {
          Item: {
            foo: {
              bar: 'string',
              baz: 'string',
              quux: '',
              fizz: toBuffer(''),
              buzz: docClient.createSet([''])
            }
          }
        };
        params = {
          Item: {
            foo: {
              M: {
                bar: {
                  S: 'string'
                },
                baz: {
                  S: 'string'
                },
                quux: {
                  NULL: true
                },
                fizz: {
                  NULL: true
                },
                buzz: {
                  NULL: true
                }
              }
            }
          }
        };
        client = new AWS.DynamoDB.DocumentClient({
          convertEmptyValues: true
        });
        request = client.put(input);
        request.emit('validate', [request]);
        expect(request.params).to.eql(params);
      });

      it('does not covert empty map members to null when convertEmptyValues option not set', function() {
        var client, emptyBuffer, input, params, request;
        emptyBuffer = toBuffer('');
        input = {
          Item: {
            foo: {
              bar: 'string',
              baz: 'string',
              quux: '',
              fizz: emptyBuffer,
              buzz: docClient.createSet([''])
            }
          }
        };
        params = {
          Item: {
            foo: {
              M: {
                bar: {
                  S: 'string'
                },
                baz: {
                  S: 'string'
                },
                quux: {
                  S: ''
                },
                fizz: {
                  B: emptyBuffer
                },
                buzz: {
                  SS: ['']
                }
              }
            }
          }
        };
        client = new AWS.DynamoDB.DocumentClient();
        request = client.put(input);
        request.emit('validate', [request]);
        expect(request.params).to.eql(params);
      });

      it('translates lists', function() {
        var buffer, input, params;
        buffer = toBuffer('quux');
        input = {
          Item: {
            foo: {
              bar: ['string', 2, buffer]
            }
          }
        };
        params = {
          Item: {
            foo: {
              M: {
                bar: {
                  L: [
                    {
                      S: 'string'
                    }, {
                      N: '2'
                    }, {
                      B: buffer
                    }
                  ]
                }
              }
            }
          }
        };
        expect(translateInput(input)).to.eql(params);
      });

      it('converts empty list members to null when convertEmptyValues option set', function() {
        var buffer, client, input, params, request;
        buffer = toBuffer('quux');
        input = {
          Item: {
            foo: {
              bar: ['string', 2, buffer, '', toBuffer(''), docClient.createSet([''])]
            }
          }
        };
        params = {
          Item: {
            foo: {
              M: {
                bar: {
                  L: [
                    {
                      S: 'string'
                    }, {
                      N: '2'
                    }, {
                      B: buffer
                    }, {
                      NULL: true
                    }, {
                      NULL: true
                    }, {
                      NULL: true
                    }
                  ]
                }
              }
            }
          }
        };
        client = new AWS.DynamoDB.DocumentClient({
          convertEmptyValues: true
        });
        request = client.put(input);
        request.emit('validate', [request]);
        expect(request.params).to.eql(params);
      });

      it('does not covert empty list members to null when convertEmptyValues option not set', function() {
        var buffer, client, emptyBuffer, input, params, request;
        emptyBuffer = toBuffer('');
        buffer = toBuffer('quux');
        input = {
          Item: {
            foo: {
              bar: ['string', 2, buffer, '', emptyBuffer, docClient.createSet([''])]
            }
          }
        };
        params = {
          Item: {
            foo: {
              M: {
                bar: {
                  L: [
                    {
                      S: 'string'
                    }, {
                      N: '2'
                    }, {
                      B: buffer
                    }, {
                      S: ''
                    }, {
                      B: emptyBuffer
                    }, {
                      SS: ['']
                    }
                  ]
                }
              }
            }
          }
        };
        client = new AWS.DynamoDB.DocumentClient();
        request = client.put(input);
        request.emit('validate', [request]);
        expect(request.params).to.eql(params);
      });

      it('translates string sets', function() {
        var input, params, set;
        set = docClient.createSet(['bar', 'baz', 'quux']);
        input = {
          Item: {
            foo: set
          }
        };
        params = {
          Item: {
            foo: {
              SS: ['bar', 'baz', 'quux']
            }
          }
        };
        expect(translateInput(input)).to.eql(params);
      });

      it('removes empty strings from sets when convertEmptyValues option set', function() {
        var client, input, params, request, set;
        set = docClient.createSet(['bar', 'baz', 'quux', '']);
        input = {
          Item: {
            foo: set
          }
        };
        params = {
          Item: {
            foo: {
              SS: ['bar', 'baz', 'quux']
            }
          }
        };
        client = new AWS.DynamoDB.DocumentClient({
          convertEmptyValues: true
        });
        request = client.put(input);
        request.emit('validate', [request]);
        expect(request.params).to.eql(params);
      });

      it('does not remove empty strings from sets when convertEmptyValues option not set', function() {
        var client, input, params, request, set;
        set = docClient.createSet(['bar', 'baz', 'quux', '']);
        input = {
          Item: {
            foo: set
          }
        };
        params = {
          Item: {
            foo: {
              SS: ['bar', 'baz', 'quux', '']
            }
          }
        };
        client = new AWS.DynamoDB.DocumentClient();
        request = client.put(input);
        request.emit('validate', [request]);
        expect(request.params).to.eql(params);
      });

      it('converts empty sets to null when convertEmptyValues option set', function() {
        var client, input, params, request, set;
        set = docClient.createSet(['']);
        input = {
          Item: {
            foo: set
          }
        };
        params = {
          Item: {
            foo: {
              NULL: true
            }
          }
        };
        client = new AWS.DynamoDB.DocumentClient({
          convertEmptyValues: true
        });
        request = client.put(input);
        request.emit('validate', [request]);
        expect(request.params).to.eql(params);
      });

      it('does not convert empty sets to null when convertEmptyValues option not set', function() {
        var client, input, params, request, set;
        set = docClient.createSet(['']);
        input = {
          Item: {
            foo: set
          }
        };
        params = {
          Item: {
            foo: {
              SS: ['']
            }
          }
        };
        client = new AWS.DynamoDB.DocumentClient();
        request = client.put(input);
        request.emit('validate', [request]);
        expect(request.params).to.eql(params);
      });

      it('translates number sets', function() {
        var input, params, set;
        set = docClient.createSet([1, 2, 3]);
        input = {
          Item: {
            foo: set
          }
        };
        params = {
          Item: {
            foo: {
              NS: ['1', '2', '3']
            }
          }
        };
        expect(translateInput(input)).to.eql(params);
      });

      it('translates binary sets', function() {
        var bar, baz, input, params, quux, set;
        bar = toBuffer('bar');
        baz = toBuffer('baz');
        quux = toBuffer('quux');
        set = docClient.createSet([bar, baz, quux]);
        input = {
          Item: {
            foo: set
          }
        };
        params = {
          Item: {
            foo: {
              BS: [bar, baz, quux]
            }
          }
        };
        expect(translateInput(input)).to.eql(params);
      });

      it('removes empty binary members from sets when convertEmptyValues option set', function() {
        var bar, baz, client, empty, input, params, quux, request, set;
        bar = toBuffer('bar');
        baz = toBuffer('baz');
        quux = toBuffer('quux');
        empty = toBuffer('');
        set = docClient.createSet([bar, baz, quux, empty]);
        input = {
          Item: {
            foo: set
          }
        };
        params = {
          Item: {
            foo: {
              BS: [bar, baz, quux]
            }
          }
        };
        client = new AWS.DynamoDB.DocumentClient({
          convertEmptyValues: true
        });
        request = client.put(input);
        request.emit('validate', [request]);
        expect(request.params).to.eql(params);
      });

      it('removes empty binary members from sets when convertEmptyValues option set', function() {
        var bar, baz, client, empty, input, params, quux, request, set;
        bar = toBuffer('bar');
        baz = toBuffer('baz');
        quux = toBuffer('quux');
        empty = toBuffer('');
        set = docClient.createSet([bar, baz, quux, empty]);
        input = {
          Item: {
            foo: set
          }
        };
        params = {
          Item: {
            foo: {
              BS: [bar, baz, quux]
            }
          }
        };
        client = new AWS.DynamoDB.DocumentClient({
          convertEmptyValues: true
        });
        request = client.put(input);
        request.emit('validate', [request]);
        expect(request.params).to.eql(params);
      });

      it('translates recursive maps', function() {
        var input, params;
        input = {
          Item: {
            name: {
              first: 'foo',
              last: 'bar',
              aliases: ['alpha', 'beta', 'gamma']
            },
            address: {
              mailing: {
                street: '123 foo bar'
              },
              billing: {
                street: '456 baz quux'
              }
            }
          }
        };
        params = {
          Item: {
            name: {
              M: {
                first: {
                  'S': 'foo'
                },
                last: {
                  'S': 'bar'
                },
                aliases: {
                  'L': [
                    {
                      'S': 'alpha'
                    }, {
                      'S': 'beta'
                    }, {
                      'S': 'gamma'
                    }
                  ]
                }
              }
            },
            address: {
              M: {
                mailing: {
                  M: {
                    street: {
                      'S': '123 foo bar'
                    }
                  }
                },
                billing: {
                  M: {
                    street: {
                      'S': '456 baz quux'
                    }
                  }
                }
              }
            }
          }
        };
        expect(translateInput(input)).to.eql(params);
      });

      it('translates nested maps', function() {
        var input, params;
        input = {
          Item: {
            names: [
              {
                first: 'foo',
                last: 'bar',
                aliases: ['alpha', 'beta', 'gamma']
              }, {
                first: 'baz',
                last: 'quux',
                aliases: ['pi', 'rho', 'sigma']
              }
            ]
          }
        };
        params = {
          Item: {
            names: {
              L: [
                {
                  M: {
                    first: {
                      'S': 'foo'
                    },
                    last: {
                      'S': 'bar'
                    },
                    aliases: {
                      'L': [
                        {
                          S: 'alpha'
                        }, {
                          S: 'beta'
                        }, {
                          S: 'gamma'
                        }
                      ]
                    }
                  }
                }, {
                  M: {
                    first: {
                      'S': 'baz'
                    },
                    last: {
                      'S': 'quux'
                    },
                    aliases: {
                      'L': [
                        {
                          S: 'pi'
                        }, {
                          S: 'rho'
                        }, {
                          S: 'sigma'
                        }
                      ]
                    }
                  }
                }
              ]
            }
          }
        };
        expect(translateInput(input)).to.eql(params);
      });

      it('translates recusive lists', function() {
        var buffer, input, params;
        buffer = toBuffer('foo');
        input = {
          Item: {
            tags: [
              ['alpha', 'beta', 'gamma', buffer], [1, 2, 3, buffer], [
                {
                  moreTags: [
                    'pi', 'rho', 'sigma', {
                      someMoreTags: ['bar', 'baz']
                    }
                  ]
                }
              ]
            ]
          }
        };
        params = {
          Item: {
            tags: {
              L: [
                {
                  L: [
                    {
                      'S': 'alpha'
                    }, {
                      'S': 'beta'
                    }, {
                      'S': 'gamma'
                    }, {
                      'B': buffer
                    }
                  ]
                }, {
                  L: [
                    {
                      'N': '1'
                    }, {
                      'N': '2'
                    }, {
                      'N': '3'
                    }, {
                      'B': buffer
                    }
                  ]
                }, {
                  L: [
                    {
                      'M': {
                        moreTags: {
                          'L': [
                            {
                              'S': 'pi'
                            }, {
                              'S': 'rho'
                            }, {
                              'S': 'sigma'
                            }, {
                              'M': {
                                someMoreTags: {
                                  'L': [
                                    {
                                      'S': 'bar'
                                    }, {
                                      'S': 'baz'
                                    }
                                  ]
                                }
                              }
                            }
                          ]
                        }
                      }
                    }
                  ]
                }
              ]
            }
          }
        };
        expect(translateInput(input)).to.eql(params);
      });

      it('translates nested sets', function() {
        var input, numberSet, params, stringSet;
        stringSet = docClient.createSet(['alpha', 'beta', 'gamma']);
        numberSet = docClient.createSet([1, 2, 3]);
        input = {
          Item: {
            name: {
              first: 'foo',
              last: 'bar',
              aliases: stringSet,
              scores: [numberSet, numberSet, numberSet]
            }
          }
        };
        params = {
          Item: {
            name: {
              M: {
                first: {
                  S: 'foo'
                },
                last: {
                  S: 'bar'
                },
                aliases: {
                  SS: ['alpha', 'beta', 'gamma']
                },
                scores: {
                  L: [
                    {
                      NS: ['1', '2', '3']
                    }, {
                      NS: ['1', '2', '3']
                    }, {
                      NS: ['1', '2', '3']
                    }
                  ]
                }
              }
            }
          }
        };
        expect(translateInput(input)).to.eql(params);
      });
    });

    describe('output', function() {
      it('translates strings', function(done) {
        var output, wire;
        wire = JSON.stringify({
          Item: {
            foo: {
              S: 'bar'
            }
          }
        });
        output = {
          Item: {
            foo: 'bar'
          }
        };
        helpers.mockHttpResponse(200, {}, wire);
        docClient.get({
          Key: {
            foo: 1
          }
        }, function(err, data) {
          expect(data).to.eql(output);
          done();
        });
      });

      it('translates numbers', function(done) {
        var output, wire;
        wire = JSON.stringify({
          Item: {
            foo: {
              N: '1'
            }
          }
        });
        output = {
          Item: {
            foo: 1
          }
        };
        helpers.mockHttpResponse(200, {}, wire);
        docClient.get({
          Key: {
            foo: 1
          }
        }, function(err, data) {
          expect(data).to.eql(output);
          done();
        });
      });

      it(
        'converts numbers to NumberValues when the wrapNumbers option is set',
        function(done) {
          var client = new AWS.DynamoDB.DocumentClient({
            wrapNumbers: true
          });
          var wire = JSON.stringify({
            Item: {
              foo: {
                N: '900719925474099100'
              }
            }
          });

          helpers.mockHttpResponse(200, {}, wire);
          client.get({
            Key: {
              bar: 1
            }
          }, function(err, data) {
            expect(data.Item.foo.value).to.equal('900719925474099100');
            done();
          });
        }
      );

      it('translates booleans', function(done) {
        var output, wire;
        wire = JSON.stringify({
          Item: {
            foo: {
              BOOL: true
            },
            bar: {
              BOOL: false
            }
          }
        });
        output = {
          Item: {
            foo: true,
            bar: false
          }
        };
        helpers.mockHttpResponse(200, {}, wire);
        docClient.get({
          Key: {
            foo: 1
          }
        }, function(err, data) {
          expect(data).to.eql(output);
          done();
        });
      });

      it('translates null', function(done) {
        var output, wire;
        wire = JSON.stringify({
          Item: {
            foo: {
              NULL: true
            }
          }
        });
        output = {
          Item: {
            foo: null
          }
        };
        helpers.mockHttpResponse(200, {}, wire);
        docClient.get({
          Key: {
            foo: 1
          }
        }, function(err, data) {
          expect(data).to.eql(output);
          done();
        });
      });

      it('translates maps', function(done) {
        var output, wire;
        wire = JSON.stringify({
          Item: {
            foo: {
              M: {
                bar: {
                  S: 'string'
                },
                baz: {
                  S: 'string'
                }
              }
            }
          }
        });
        output = {
          Item: {
            foo: {
              bar: 'string',
              baz: 'string'
            }
          }
        };
        helpers.mockHttpResponse(200, {}, wire);
        docClient.get({
          Key: {
            foo: 1
          }
        }, function(err, data) {
          expect(data).to.eql(output);
          done();
        });
      });

      it('translates lists', function(done) {
        var buffer, output, wire;
        buffer = toBuffer('quux');
        wire = JSON.stringify({
          Item: {
            foo: {
              M: {
                bar: {
                  L: [
                    {
                      S: 'string'
                    }, {
                      N: '2'
                    }, {
                      B: encode(buffer)
                    }, {
                      BOOL: true
                    }
                  ]
                }
              }
            }
          }
        });
        output = {
          Item: {
            foo: {
              bar: ['string', 2, buffer, true]
            }
          }
        };
        helpers.mockHttpResponse(200, {}, wire);
        docClient.get({
          Key: {
            foo: 1
          }
        }, function(err, data) {
          expect(data).to.eql(output);
          done();
        });
      });

      it('translates string sets', function(done) {
        var output, set, wire;
        set = docClient.createSet(['bar', 'baz', 'quux']);
        wire = JSON.stringify({
          Item: {
            foo: {
              'SS': ['bar', 'baz', 'quux']
            }
          }
        });
        output = {
          Item: {
            foo: set
          }
        };
        helpers.mockHttpResponse(200, {}, wire);
        docClient.get({
          Key: {
            foo: 1
          }
        }, function(err, data) {
          expect(data).to.eql(output);
          done();
        });
      });

      it('translates number sets', function(done) {
        var output, set, wire;
        set = docClient.createSet([1, 2, 3]);
        wire = JSON.stringify({
          Item: {
            foo: {
              'NS': ['1', '2', '3']
            }
          }
        });
        output = {
          Item: {
            foo: set
          }
        };
        helpers.mockHttpResponse(200, {}, wire);
        docClient.get({
          Key: {
            foo: 1
          }
        }, function(err, data) {
          expect(data).to.eql(output);
          done();
        });
      });

      it(
        'converts number sets to NumberValue sets when the wrapNumbers option is set',
        function(done) {
          var client = new AWS.DynamoDB.DocumentClient({
            wrapNumbers: true
          });
          var wire = JSON.stringify({
            Item: {
              foo: {
                'NS': [
                  '900719925474099100',
                  '900719925474099101',
                  '900719925474099102',
                  '900719925474099103'
                ]
              }
            }
          });
          helpers.mockHttpResponse(200, {}, wire);
          client.get({
            Key: {
              foo: 1
            }
          }, function(err, data) {
            for (var i = 0; i < data.Item.foo.values.length; i++) {
              expect(data.Item.foo.values[i].value)
                  .to.equal('90071992547409910' + i);
            }
            done();
          });
        }
      );

      it('translates binary sets', function(done) {
        var bar, baz, output, quux, set, wire;
        bar = toBuffer('bar');
        baz = toBuffer('baz');
        quux = toBuffer('quux');
        set = docClient.createSet([bar, baz, quux]);
        wire = JSON.stringify({
          Item: {
            foo: {
              'BS': [encode(bar), encode(baz), encode(quux)]
            }
          }
        });
        output = {
          Item: {
            foo: set
          }
        };
        helpers.mockHttpResponse(200, {}, wire);
        docClient.get({
          Key: {
            foo: 1
          }
        }, function(err, data) {
          expect(data).to.eql(output);
          done();
        });
      });

      it('stringifies string sets', function(done) {
        var outputString, wire;
        wire = JSON.stringify({
          Item: {
            foo: {
              'SS': ['bar', 'baz', 'quux']
            }
          }
        });
        outputString = '{"Item":{"foo":["bar","baz","quux"]}}';
        helpers.mockHttpResponse(200, {}, wire);
        docClient.get({
          Key: {
            foo: 1
          }
        }, function(err, data) {
          expect(JSON.stringify(data)).to.eql(outputString);
          done();
        });
      });

      it('stringifies number sets', function(done) {
        var outputString, wire;
        wire = JSON.stringify({
          Item: {
            foo: {
              'NS': ['1', '2', '3']
            }
          }
        });
        outputString = '{"Item":{"foo":[1,2,3]}}';
        helpers.mockHttpResponse(200, {}, wire);
        docClient.get({
          Key: {
            foo: 1
          }
        }, function(err, data) {
          expect(JSON.stringify(data)).to.eql(outputString);
          done();
        });
      });

      it('stringifies binary sets', function(done) {
        var bar, baz, outputString, quux, wire;
        bar = toBuffer('bar');
        baz = toBuffer('baz');
        quux = toBuffer('quux');
        wire = JSON.stringify({
          Item: {
            foo: {
              'BS': [encode(bar), encode(baz), encode(quux)]
            }
          }
        });
        outputString = '{"Item":{"foo":[{"type":"Buffer","data":[98,97,114]},{"type":"Buffer","data":[98,97,122]},{"type":"Buffer","data":[113,117,117,120]}]}}';
        if (process.version < 'v0.12' && !isBrowser()) {
          outputString = '{"Item":{"foo":[[98,97,114],[98,97,122],[113,117,117,120]]}}';
        }
        helpers.mockHttpResponse(200, {}, wire);
        docClient.get({
          Key: {
            foo: 1
          }
        }, function(err, data) {
          expect(JSON.stringify(data)).to.eql(outputString);
          done();
        });
      });

      it('translates recursive maps', function(done) {
        var output, wire;
        wire = JSON.stringify({
          Item: {
            name: {
              M: {
                first: {
                  'S': 'foo'
                },
                last: {
                  'S': 'bar'
                },
                aliases: {
                  'L': [
                    {
                      'S': 'alpha'
                    }, {
                      'S': 'beta'
                    }, {
                      'S': 'gamma'
                    }
                  ]
                }
              }
            },
            address: {
              M: {
                mailing: {
                  M: {
                    street: {
                      'S': '123 foo bar'
                    }
                  }
                },
                billing: {
                  M: {
                    street: {
                      'S': '456 baz quux'
                    }
                  }
                }
              }
            }
          }
        });
        output = {
          Item: {
            name: {
              first: 'foo',
              last: 'bar',
              aliases: ['alpha', 'beta', 'gamma']
            },
            address: {
              mailing: {
                street: '123 foo bar'
              },
              billing: {
                street: '456 baz quux'
              }
            }
          }
        };
        helpers.mockHttpResponse(200, {}, wire);
        docClient.get({
          Key: {
            foo: 1
          }
        }, function(err, data) {
          expect(data).to.eql(output);
          done();
        });
      });

      it('translates nested maps', function(done) {
        var output, wire;
        wire = JSON.stringify({
          Item: {
            names: {
              L: [
                {
                  M: {
                    first: {
                      'S': 'foo'
                    },
                    last: {
                      'S': 'bar'
                    },
                    aliases: {
                      'L': [
                        {
                          S: 'alpha'
                        }, {
                          S: 'beta'
                        }, {
                          S: 'gamma'
                        }
                      ]
                    }
                  }
                }, {
                  M: {
                    first: {
                      'S': 'baz'
                    },
                    last: {
                      'S': 'quux'
                    },
                    aliases: {
                      'L': [
                        {
                          S: 'pi'
                        }, {
                          S: 'rho'
                        }, {
                          S: 'sigma'
                        }
                      ]
                    }
                  }
                }
              ]
            }
          }
        });
        output = {
          Item: {
            names: [
              {
                first: 'foo',
                last: 'bar',
                aliases: ['alpha', 'beta', 'gamma']
              }, {
                first: 'baz',
                last: 'quux',
                aliases: ['pi', 'rho', 'sigma']
              }
            ]
          }
        };
        helpers.mockHttpResponse(200, {}, wire);
        docClient.get({
          Key: {
            foo: 1
          }
        }, function(err, data) {
          expect(data).to.eql(output);
          done();
        });
      });

      it('translates recusive lists', function(done) {
        var buffer, output, wire;
        buffer = toBuffer('foo');
        wire = JSON.stringify({
          Item: {
            tags: {
              L: [
                {
                  L: [
                    {
                      'S': 'alpha'
                    }, {
                      'S': 'beta'
                    }, {
                      'S': 'gamma'
                    }, {
                      'B': encode(buffer)
                    }
                  ]
                }, {
                  L: [
                    {
                      'N': '1'
                    }, {
                      'N': '2'
                    }, {
                      'N': '3'
                    }, {
                      'B': encode(buffer)
                    }
                  ]
                }, {
                  L: [
                    {
                      'M': {
                        moreTags: {
                          'L': [
                            {
                              'S': 'pi'
                            }, {
                              'S': 'rho'
                            }, {
                              'S': 'sigma'
                            }, {
                              'M': {
                                someMoreTags: {
                                  'L': [
                                    {
                                      'S': 'bar'
                                    }, {
                                      'S': 'baz'
                                    }, {
                                      'N': '1'
                                    }, {
                                      'BOOL': true
                                    }
                                  ]
                                }
                              }
                            }
                          ]
                        }
                      }
                    }
                  ]
                }
              ]
            }
          }
        });
        output = {
          Item: {
            tags: [
              ['alpha', 'beta', 'gamma', buffer], [1, 2, 3, buffer], [
                {
                  moreTags: [
                    'pi', 'rho', 'sigma', {
                      someMoreTags: ['bar', 'baz', 1, true]
                    }
                  ]
                }
              ]
            ]
          }
        };
        helpers.mockHttpResponse(200, {}, wire);
        docClient.get({
          Key: {
            foo: 1
          }
        }, function(err, data) {
          expect(data).to.eql(output);
          done();
        });
      });

      it('translates nested sets', function(done) {
        var numberSet, output, stringSet, wire;
        stringSet = docClient.createSet(['alpha', 'beta', 'gamma']);
        numberSet = docClient.createSet([1, 2, 3]);
        wire = JSON.stringify({
          Item: {
            name: {
              M: {
                first: {
                  S: 'foo'
                },
                last: {
                  S: 'bar'
                },
                aliases: {
                  SS: ['alpha', 'beta', 'gamma']
                },
                scores: {
                  L: [
                    {
                      NS: ['1', '2', '3']
                    }, {
                      NS: ['1', '2', '3']
                    }, {
                      NS: ['1', '2', '3']
                    }
                  ]
                }
              }
            }
          }
        });
        output = {
          Item: {
            name: {
              first: 'foo',
              last: 'bar',
              aliases: stringSet,
              scores: [numberSet, numberSet, numberSet]
            }
          }
        };
        helpers.mockHttpResponse(200, {}, wire);
        docClient.get({
          Key: {
            foo: 1
          }
        }, function(err, data) {
          expect(data).to.eql(output);
          done();
        });
      });
    });

    describe('response.nextPage', function() {
      var client = null,
        fill = function(err, data) {
          request.emit('validate', [request]);
          response.error = err;
          response.data = data;
        },
        request = null,
        response = null;

      beforeEach(function() {
        client = new AWS.DynamoDB.DocumentClient({
          paramValidation: false
        });
        request = client.query({
          ExpressionAttributeValues: {
            foo: 'bar'
          }
        });
        return response = request.response;
      });

      it('returns null if there are no more pages', function() {
        fill(null, {});
        expect(response.nextPage()).to.equal(null);
      });

      it('returns a request object with the next page marker filled in params', function() {
        var req;
        fill(null, {
          LastEvaluatedKey: {
            fizz: 'pop'
          }
        });
        req = response.nextPage();
        expect(req.params.ExclusiveStartKey.fizz).to.equal('pop');
        expect(req.operation).to.equal(response.request.operation);
      });

      it('uses untranslated params', function() {
        var req;
        fill(null, {
          LastEvaluatedKey: 'baz'
        });
        req = response.nextPage();
        expect(req.params.ExpressionAttributeValues.foo).to.equal('bar');
      });

      it('throws error if response returned an error and there is no callback', function() {
        fill(new Error('error!'), null, true);
        expect(function() {
          response.nextPage();
        }).to['throw']('error!');
      });

      it('sends the request if passed with a callback', function(done) {
        helpers.mockHttpResponse(200, {}, ['']);
        fill(null, {
          LastEvaluatedKey: 'baz'
        });
        response.nextPage(function(err, data) {
          expect(err).to.equal(null);
          expect(data).to.eql({});
          done();
        });
      });

      it('passes null to callback if there are no more pages', function() {
        fill(null, {});
        response.nextPage(function(err, data) {
          expect(err).to.equal(null);
          expect(data).to.equal(null);
        });
      });

      it('passes error through if original response returned an error', function() {
        fill('error!', null);
        response.nextPage(function(err, data) {
          expect(err).to.equal('error!');
          expect(data).to.equal(null);
        });
      });
    });
  });

  describe('validate supported operations', function() {
    var serviceClientOperationsMap = {
      batchGet: 'batchGetItem',
      batchWrite: 'batchWriteItem',
      delete: 'deleteItem',
      get: 'getItem',
      put: 'putItem',
      query: 'query',
      scan: 'scan',
      update: 'updateItem',
      transactGet: 'transactGetItems',
      transactWrite: 'transactWriteItems'
    };
    var client = new AWS.DynamoDB.DocumentClient({paramValidation: false});
    AWS.util.arrayEach(Object.keys(serviceClientOperationsMap), function(operation) {
      var request = client[operation]({});
      it('operation' + operation + ' is available', function() {
        request.emit('validate', [request]);
        expect(request.operation).to.eql(serviceClientOperationsMap[operation]);
      });
    });
  });

}).call(this);

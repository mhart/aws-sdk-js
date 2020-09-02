(function() {
  var QueryParamSerializer, Shape, helpers;

  helpers = require('../helpers');

  QueryParamSerializer = require('../../lib/query/query_param_serializer');

  Shape = helpers.AWS.Model.Shape;

  describe('QueryParamSerializer', function() {
    var serialize;
    serialize = function(requestParams, rules) {
      var params, serializer, shape;
      params = [];
      serializer = new QueryParamSerializer();
      shape = Shape.create({
        type: 'structure',
        members: rules
      }, {
        api: {}
      });
      serializer.serialize(requestParams, shape, function(name, value) {
        return params.push([name, value]);
      });
      return params;
    };
    describe('scalar params', function() {
      it('can serialize simple strings', function() {
        var params, rules;
        rules = {
          Name1: {
            type: 'string'
          },
          Name2: {
            type: 'string'
          }
        };
        params = serialize({
          Name1: 'abc',
          Name2: 'xyz'
        }, rules);
        return expect(params).to.eql([['Name1', 'abc'], ['Name2', 'xyz']]);
      });
      it('stringifies values', function() {
        var params, rules;
        rules = {
          Count: {
            type: 'string'
          }
        };
        params = serialize({
          Count: 1
        }, rules);
        return expect(params).to.eql([['Count', '1']]);
      });
      it('defaults params to strings when type not specified', function() {
        var params, rules;
        rules = {
          ParamName: {}
        };
        params = serialize({
          ParamName: 'abc'
        }, rules);
        return expect(params).to.eql([['ParamName', 'abc']]);
      });
      return it('ignores null values', function() {
        var params, rules;
        rules = {
          ParamName: {}
        };
        params = serialize({
          ParamName: null
        }, rules);
        return expect(params).to.eql([]);
      });
    });
    describe('structures', function() {
      it('works with deeply nested objects', function() {
        var params, rules;
        rules = {
          Aa: {
            type: 'structure',
            members: {
              Bb: {
                type: 'structure',
                members: {
                  Cc: {
                    type: 'structure',
                    members: {
                      Dd: {}
                    }
                  }
                }
              }
            }
          }
        };
        params = serialize({
          Aa: {
            Bb: {
              Cc: {
                Dd: 'value'
              }
            }
          }
        }, rules);
        return expect(params).to.eql([['Aa.Bb.Cc.Dd', 'value']]);
      });
      it('works with nested objects that have multiple properties', function() {
        var params, rules;
        rules = {
          Root: {
            type: 'structure',
            members: {
              Abc: {},
              Xyz: {}
            }
          },
          Root2: {}
        };
        params = serialize({
          Root: {
            Abc: '1',
            Xyz: '2'
          },
          Root2: '3'
        }, rules);
        return expect(params).to.eql([['Root.Abc', '1'], ['Root.Xyz', '2'], ['Root2', '3']]);
      });
      it('applies structure member names', function() {
        var params, rules;
        rules = {
          Root: {
            type: 'structure',
            locationName: 'ROOT',
            members: {
              Leaf: {
                locationName: 'lEAF'
              }
            }
          }
        };
        params = serialize({
          Root: {
            Leaf: 'value'
          }
        }, rules);
        return expect(params).to.eql([['ROOT.lEAF', 'value']]);
      });
      return it('ignores null', function() {
        var params, rules;
        rules = {
          Root: {
            type: 'structure',
            locationName: 'ROOT',
            members: {
              Leaf: {
                locationName: 'lEAF'
              }
            }
          }
        };
        params = serialize({
          Root: null
        }, rules);
        return expect(params).to.eql([]);
      });
    });
    describe('lists', function() {
      describe('flattened', function() {
        it('numbers list members starting at 1', function() {
          var params, rules;
          rules = {
            Name: {
              type: 'list',
              flattened: true,
              member: {
                type: 'string'
              }
            }
          };
          params = serialize({
            Name: ['a', 'b', 'c']
          }, rules);
          return expect(params).to.eql([['Name.1', 'a'], ['Name.2', 'b'], ['Name.3', 'c']]);
        });
        it('Uses list-member names instead of the list name', function() {
          var params, rules;
          rules = {
            Root: {
              type: 'structure',
              members: {
                Items: {
                  type: 'list',
                  flattened: true,
                  member: {
                    locationName: 'ListItem'
                  }
                }
              }
            }
          };
          params = serialize({
            Root: {
              Items: ['a', 'b', 'c']
            }
          }, rules);
          return expect(params).to.eql([['Root.ListItem.1', 'a'], ['Root.ListItem.2', 'b'], ['Root.ListItem.3', 'c']]);
        });
        it('accepts nested arrays', function() {
          var params, rules;
          rules = {
            Person: {
              type: 'structure',
              members: {
                Name: {
                  type: 'list',
                  flattened: true,
                  member: {
                    type: 'string'
                  }
                }
              }
            }
          };
          params = serialize({
            Person: {
              Name: ['a', 'b', 'c']
            }
          }, rules);
          return expect(params).to.eql([['Person.Name.1', 'a'], ['Person.Name.2', 'b'], ['Person.Name.3', 'c']]);
        });
        it('supports lists of complex types', function() {
          var params, rules;
          rules = {
            Root: {
              type: 'list',
              flattened: true,
              member: {
                type: 'structure',
                members: {
                  Aa: {},
                  Bb: {}
                }
              }
            }
          };
          params = serialize({
            Root: [
              {
                Aa: 'a1',
                Bb: 'b1'
              }, {
                Aa: 'a2',
                Bb: 'b2'
              }
            ]
          }, rules);
          return expect(params.sort()).to.eql([['Root.1.Aa', 'a1'], ['Root.1.Bb', 'b1'], ['Root.2.Aa', 'a2'], ['Root.2.Bb', 'b2']]);
        });
        return it('serializes list members as strings when member rule not present', function() {
          var params, rules;
          rules = {
            Root: {
              type: 'list',
              flattened: true,
              member: {
                type: 'string'
              }
            }
          };
          params = serialize({
            Root: ['a', 'b', 'c']
          }, rules);
          return expect(params).to.eql([['Root.1', 'a'], ['Root.2', 'b'], ['Root.3', 'c']]);
        });
      });
      return describe('non-flat', function() {
        it('adds a `.member` prefix to each list member', function() {
          var params, rules;
          rules = {
            Person: {
              type: 'list',
              member: {
                type: 'string'
              }
            }
          };
          params = serialize({
            Person: ['a', 'b', 'c']
          }, rules);
          return expect(params).to.eql([['Person.member.1', 'a'], ['Person.member.2', 'b'], ['Person.member.3', 'c']]);
        });
        return it('observes both list name and list member name', function() {
          var params, rules;
          rules = {
            People: {
              type: 'list',
              locationName: 'Person',
              member: {
                locationName: 'Name'
              }
            }
          };
          params = serialize({
            People: ['a', 'b', 'c']
          }, rules);
          return expect(params).to.eql([['Person.Name.1', 'a'], ['Person.Name.2', 'b'], ['Person.Name.3', 'c']]);
        });
      });
    });
    describe('maps', function() {
      it('accepts a hash (object) of arbitrary key/value pairs', function() {
        var data, params, rules;
        rules = {
          Attributes: {
            type: 'map',
            flattened: true,
            key: {},
            value: {}
          }
        };
        data = {
          Attributes: {
            Color: 'red',
            Size: 'large',
            Value: 'low'
          }
        };
        params = serialize(data, rules);
        return expect(params).to.eql([['Attributes.1.key', 'Color'], ['Attributes.1.value', 'red'], ['Attributes.2.key', 'Size'], ['Attributes.2.value', 'large'], ['Attributes.3.key', 'Value'], ['Attributes.3.value', 'low']]);
      });
      return describe('non-flat', function() {
        return it('adds .entry. to name', function() {
          var data, params, rules;
          rules = {
            Attributes: {
              type: 'map',
              key: {},
              value: {}
            }
          };
          data = {
            Attributes: {
              Color: 'red',
              Size: 'large',
              Value: 'low'
            }
          };
          params = serialize(data, rules);
          return expect(params).to.eql([['Attributes.entry.1.key', 'Color'], ['Attributes.entry.1.value', 'red'], ['Attributes.entry.2.key', 'Size'], ['Attributes.entry.2.value', 'large'], ['Attributes.entry.3.key', 'Value'], ['Attributes.entry.3.value', 'low']]);
        });
      });
    });
    describe('maps with member names', function() {
      return it('applies member name traits', function() {
        var data, params, rules;
        rules = {
          Attributes: {
            type: 'map',
            flattened: true,
            key: {
              locationName: 'Name'
            },
            value: {
              locationName: 'Value'
            }
          }
        };
        data = {
          Attributes: {
            Color: 'red',
            Size: 'large',
            Value: 'low'
          }
        };
        params = serialize(data, rules);
        return expect(params).to.eql([['Attributes.1.Name', 'Color'], ['Attributes.1.Value', 'red'], ['Attributes.2.Name', 'Size'], ['Attributes.2.Value', 'large'], ['Attributes.3.Name', 'Value'], ['Attributes.3.Value', 'low']]);
      });
    });
    return describe('timestamps', function() {
      it('serializes timestamp to iso8601 strings by default', function() {
        var date, params, rules;
        date = new Date();
        date.setMilliseconds(0);
        rules = {
          Date: {
            type: 'timestamp'
          }
        };
        params = serialize({
          Date: date
        }, rules);
        return expect(params).to.eql([['Date', helpers.util.date.iso8601(date)]]);
      });
      return it('obeys format options in the rules', function() {
        var date, params, rules;
        date = new Date();
        date.setMilliseconds(0);
        rules = {
          Date: {
            type: 'timestamp',
            timestampFormat: 'rfc822'
          }
        };
        params = serialize({
          Date: date
        }, rules);
        return expect(params).to.eql([['Date', helpers.util.date.rfc822(date)]]);
      });
    });
  });

}).call(this);

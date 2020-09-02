(function() {
  var AWS, helpers;

  helpers = require('../helpers');

  AWS = helpers.AWS;

  describe('AWS.JSON.Builder', function() {
    var api, build, builder, timestampFormat;
    builder = new AWS.JSON.Builder();
    timestampFormat = 'iso8601';
    api = null;
    beforeEach(function() {
      return api = new AWS.Model.Api({
        metadata: {
          timestampFormat: timestampFormat,
          protocol: 'json'
        }
      });
    });
    build = function(rules, params) {
      var shape;
      shape = AWS.Model.Shape.create(rules, {
        api: api
      });
      return builder.build(params, shape);
    };
    return describe('build', function() {
      it('returns an empty document when there are no params', function() {
        return expect(build({}, {})).to.equal('{}');
      });
      describe('structures', function() {
        var rules;
        rules = {
          type: 'structure',
          members: {
            Items: {
              type: 'structure',
              members: {
                A: {
                  type: 'string'
                },
                B: {
                  type: 'string'
                }
              }
            }
          }
        };
        it('translates input', function() {
          var params;
          params = {
            Items: {
              A: 'a',
              B: 'b'
            }
          };
          return expect(build(rules, params)).to.equal('{"Items":{"A":"a","B":"b"}}');
        });
        it('ignores null', function() {
          return expect(build(rules, {
            Items: null
          })).to.equal('{}');
        });
        return it('ignores undefined', function() {
          return expect(build(rules, {
            Items: void 0
          })).to.equal('{}');
        });
      });
      describe('lists', function() {
        var rules;
        rules = {
          type: 'structure',
          members: {
            Items: {
              type: 'list',
              member: {
                type: 'string'
              }
            }
          }
        };
        it('translates input', function() {
          var params;
          params = {
            Items: ['a', 'b', 'c']
          };
          return expect(build(rules, params)).to.equal('{"Items":["a","b","c"]}');
        });
        it('ignores null', function() {
          return expect(build(rules, {
            Items: null
          })).to.equal('{}');
        });
        return it('ignores undefined', function() {
          return expect(build(rules, {
            Items: void 0
          })).to.equal('{}');
        });
      });
      describe('maps', function() {
        var rules;
        rules = {
          type: 'structure',
          members: {
            Items: {
              type: 'map',
              key: {
                type: 'string'
              },
              value: {
                type: 'string'
              }
            }
          }
        };
        it('translates maps', function() {
          var params;
          params = {
            Items: {
              A: 'a',
              B: 'b'
            }
          };
          return expect(build(rules, params)).to.equal('{"Items":{"A":"a","B":"b"}}');
        });
        it('ignores null', function() {
          return expect(build(rules, {
            Items: null
          })).to.equal('{}');
        });
        return it('ignores undefined', function() {
          return expect(build(rules, {
            Items: void 0
          })).to.equal('{}');
        });
      });
      it('translates nested maps', function() {
        var now, params, rules, str;
        rules = {
          type: 'structure',
          members: {
            Items: {
              type: 'map',
              value: {
                type: 'integer'
              }
            }
          }
        };
        now = new Date();
        now.setMilliseconds(100);
        params = {
          Items: {
            MyKey: '5',
            MyOtherKey: '10'
          }
        };
        str = '{"Items":{"MyKey":5,"MyOtherKey":10}}';
        return expect(build(rules, params)).to.equal(str);
      });
      it('traslates nested timestamps and ignore the metadata timestampFormat', function() {
        var formatted, now, params, rules;
        rules = {
          type: 'structure',
          members: {
            Build: {
              type: 'structure',
              members: {
                When: {
                  type: 'timestamp'
                }
              }
            }
          }
        };
        now = new Date();
        now.setMilliseconds(100);
        params = {
          Build: {
            When: now
          }
        };
        formatted = AWS.util.date.unixTimestamp(now);
        return expect(build(rules, params)).to.match(new RegExp('\\{"Build":\\{"When":' + formatted + '\\}\\}'));
      });
      it('translates integers formatted as strings', function() {
        var rules;
        rules = {
          type: 'structure',
          members: {
            Integer: {
              type: 'integer'
            }
          }
        };
        return expect(build(rules, {
          Integer: '20'
        })).to.equal('{"Integer":20}');
      });
      it('translates floats formatted as strings', function() {
        var rules;
        rules = {
          type: 'structure',
          members: {
            Float: {
              type: 'float'
            }
          }
        };
        return expect(build(rules, {
          Float: '20.1'
        })).to.equal('{"Float":20.1}');
      });
      return it('ignores nulls null as null', function() {
        var rules;
        rules = {
          type: 'structure',
          members: {
            Float: {
              type: 'float'
            },
            Other: {
              type: 'string'
            }
          }
        };
        return expect(build(rules, {
          Float: null,
          Other: 'foo'
        })).to.equal('{"Other":"foo"}');
      });
    });
  });

}).call(this);

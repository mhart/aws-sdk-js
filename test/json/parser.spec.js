(function() {
  var AWS, helpers;

  helpers = require('../helpers');

  AWS = helpers.AWS;

  describe('AWS.JSON.Parser', function() {
    var api, parse, parser, timestampFormat;
    parser = new AWS.JSON.Parser();
    timestampFormat = 'iso8601';
    api = null;
    beforeEach(function() {
      return api = new AWS.Model.Api({
        metadata: {
          timestampFormat: timestampFormat
        }
      });
    });
    parse = function(rules, params) {
      var shape;
      shape = AWS.Model.Shape.create(rules, {
        api: api
      });
      return parser.parse(params, shape);
    };
    return describe('parse', function() {
      it('returns an empty document when there are no params', function() {
        var rules;
        rules = {
          type: 'structure',
          members: {}
        };
        return expect(parse(rules, '{}')).to.eql({});
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
          params = '{ "Items": { "A": "a", "B": "b" } }';
          return expect(parse(rules, params)).to.eql({
            'Items': {
              'A': 'a',
              'B': 'b'
            }
          });
        });
        return it('ignores null', function() {
          return expect(parse(rules, '{"Items": null}')).to.eql({});
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
          params = '{"Items":["a","b","c"]}';
          return expect(parse(rules, params)).to.eql({
            Items: ['a', 'b', 'c']
          });
        });
        return it('ignores null', function() {
          return expect(parse(rules, '{"Items": null}')).to.eql({});
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
          params = '{"Items":{"A":"a","B":"b"}}';
          return expect(parse(rules, params)).to.eql({
            Items: {
              A: 'a',
              B: 'b'
            }
          });
        });
        return it('ignores null', function() {
          return expect(parse(rules, '{"Items": null}')).to.eql({});
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
            MyKey: 5,
            MyOtherKey: 10
          }
        };
        str = '{"Items":{"MyKey":5,"MyOtherKey":10}}';
        return expect(parse(rules, str)).to.eql(params);
      });
      it('traslates nested timestamps', function() {
        var formatted, params, rules, time;
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
        time = new Date(0);
        params = {
          Build: {
            When: time
          }
        };
        formatted = AWS.util.date.iso8601(time);
        return expect(parse(rules, '{"Build":{"When":"' + formatted + '"}}')).to.eql(params);
      });
      return it('translates binary types', function() {
        var data, rules;
        rules = {
          type: 'structure',
          members: {
            Binary1: {
              type: 'binary'
            },
            Binary2: {
              type: 'base64'
            }
          }
        };
        data = parse(rules, '{"Binary1":"AQID","Binary2":"AQID"}');
        expect(AWS.util.Buffer.isBuffer(data.Binary1));
        expect(AWS.util.Buffer.isBuffer(data.Binary2));
        expect(data.Binary1.toString()).to.equal('\u0001\u0002\u0003');
        return expect(data.Binary2.toString()).to.equal('\u0001\u0002\u0003');
      });
    });
  });

}).call(this);

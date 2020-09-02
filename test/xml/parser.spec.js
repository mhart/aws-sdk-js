(function() {
  var AWS, helpers;

  helpers = require('../helpers');

  AWS = helpers.AWS;

  describe('AWS.XML.Parser', function() {
    var parse;
    parse = function(xml, rules, callback) {
      var shape;
      if (rules) {
        shape = AWS.Model.Shape.create(rules, {
          api: {
            protocol: 'rest-xml'
          }
        });
      } else {
        shape = {};
      }
      return callback.call(this, new AWS.XML.Parser().parse(xml, shape));
    };
    describe('default behavior', function() {
      var rules;
      rules = null;
      it('returns empty object when string is empty', function() {
        return parse('', null, function(data) {
          return expect(data).to.eql({});
        });
      });
      it('returns an empty object from an empty document', function() {
        var xml;
        xml = '<xml/>';
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({});
        });
      });
      it('returns empty elements as empty string', function() {
        var xml;
        xml = '<xml><element/></xml>';
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({
            element: ''
          });
        });
      });
      it('converts string elements to properties', function() {
        var xml;
        xml = '<xml><foo>abc</foo><bar>xyz</bar></xml>';
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({
            foo: 'abc',
            bar: 'xyz'
          });
        });
      });
      it('converts nested elements into objects', function() {
        var xml;
        xml = '<xml><foo><bar>yuck</bar></foo></xml>';
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({
            foo: {
              bar: 'yuck'
            }
          });
        });
      });
      it('returns everything as a string (even numbers)', function() {
        var xml;
        xml = '<xml><count>123</count></xml>';
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({
            count: '123'
          });
        });
      });
      return it('ignores xmlns on the root element', function() {
        var xml;
        xml = '<xml xmlns="http://foo.bar.com"><Abc>xyz</Abc></xml>';
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({
            Abc: 'xyz'
          });
        });
      });
    });
    describe('structures', function() {
      it('returns empty objects as {}', function() {
        var rules, xml;
        xml = '<xml><Item/></xml>';
        rules = {
          type: 'structure',
          members: {
            Item: {
              type: 'structure',
              members: {
                Name: {
                  type: 'string'
                }
              }
            }
          }
        };
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({
            Item: {}
          });
        });
      });

      it('parses attributes from tags', function() {
        var rules, xml;
        xml = '<xml xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"> <Item xsi:name="name"></Item></xml>';
        rules = {
          type: 'structure',
          members: {
            Item: {
              type: 'structure',
              members: {
                Name: {
                  type: 'string',
                  xmlAttribute: true,
                  locationName: 'xsi:name'
                }
              }
            }
          }
        };
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({
            Item: {
              Name: 'name'
            }
          });
        });
      });

      it('resolves nested duplicate fields by choosing direct children', function() {
        var xml = '<xml><Item><Nested><Enabled>false</Enabled></Nested><Enabled>true</Enabled></Item></xml>';
        var rules = {
          type: 'structure',
          members: {
            Item: {
              type: 'structure',
              members: {
                Enabled: {
                  type: 'boolean'
                },
                Nested: {
                  type: 'structure',
                  members: {
                    Enabled: {
                      type: 'boolean'
                    }
                  }
                }
              }
            }
          }
        };

        parse(xml, rules, function(data) {
          expect(data).to.eql({
            Item: {
              Enabled: true,
              Nested: {
                Enabled: false
              }
            }
          });
        });
      });
    });
    describe('lists', function() {
      it('returns empty lists as []', function() {
        var rules, xml;
        xml = '<xml><items/></xml>';
        rules = {
          type: 'structure',
          members: {
            items: {
              type: 'list',
              member: {
                type: 'string'
              }
            }
          }
        };
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({
            items: []
          });
        });
      });
      it('returns missing lists as []', function() {
        var rules, xml;
        xml = '<xml></xml>';
        rules = {
          type: 'structure',
          members: {
            items: {
              type: 'list',
              member: {
                type: 'string'
              }
            }
          }
        };
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({
            items: []
          });
        });
      });
      it('return empty string for missing list when xmlNoDefaultLists is set', function() {
        xml = '<xml></xml>';
        rules = {
          type: 'structure',
          members: {
            items: {
              type: 'list',
              member: {
                type: 'string'
              }
            }
          }
        };
        var shape = AWS.Model.Shape.create(rules, {
          api: {
            protocol: 'rest-xml',
            xmlNoDefaultLists: true
          }
        });
        var data = new AWS.XML.Parser().parse(xml, shape);
        expect(data).to.eql({});
      });
      it('Converts xml lists of strings into arrays of strings', function() {
        var rules, xml;
        xml = '<xml>\n  <items>\n    <member>abc</member>\n    <member>xyz</member>\n  </items>\n</xml>';
        rules = {
          type: 'structure',
          members: {
            items: {
              type: 'list',
              member: {}
            }
          }
        };
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({
            items: ['abc', 'xyz']
          });
        });
      });
      it('observes list member names when present', function() {
        var rules, xml;
        xml = '<xml>\n  <items>\n    <item>abc</item>\n    <item>xyz</item>\n  </items>\n</xml>';
        rules = {
          type: 'structure',
          members: {
            items: {
              type: 'list',
              member: {
                locationName: 'item'
              }
            }
          }
        };
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({
            items: ['abc', 'xyz']
          });
        });
      });
      it('can parse lists of strucures', function() {
        var rules, xml;
        xml = '<xml>\n  <People>\n    <member><Name>abc</Name></member>>\n    <member><Name>xyz</Name></member>>\n  </People>\n</xml>';
        rules = {
          type: 'structure',
          members: {
            People: {
              type: 'list',
              member: {
                type: 'structure',
                members: {
                  Name: {
                    type: 'string'
                  }
                }
              }
            }
          }
        };
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({
            People: [
              {
                Name: 'abc'
              }, {
                Name: 'xyz'
              }
            ]
          });
        });
      });
      return it('can parse lists of strucures with renames', function() {
        var rules, xml;
        xml = '<xml>\n  <People>\n    <Person><Name>abc</Name></Person>>\n    <Person><Name>xyz</Name></Person>>\n  </People>\n</xml>';
        rules = {
          type: 'structure',
          members: {
            People: {
              type: 'list',
              member: {
                type: 'structure',
                locationName: 'Person',
                members: {
                  Name: {
                    type: 'string'
                  }
                }
              }
            }
          }
        };
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({
            People: [
              {
                Name: 'abc'
              }, {
                Name: 'xyz'
              }
            ]
          });
        });
      });
    });
    describe('flattened lists', function() {
      var xml;
      xml = '<xml>\n  <person>\n    <name>Unknown</name>\n    <alias>John Doe</alias>\n    <alias>Jane Doe</alias>\n  </person>\n</xml>';
      it('collects sibling elements of the same name', function() {
        var rules;
        rules = {
          type: 'structure',
          members: {
            person: {
              type: 'structure',
              members: {
                name: {},
                aka: {
                  type: 'list',
                  flattened: true,
                  member: {
                    locationName: 'alias'
                  }
                }
              }
            }
          }
        };
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({
            person: {
              name: 'Unknown',
              aka: ['John Doe', 'Jane Doe']
            }
          });
        });
      });
      it('flattened lists can be composed of complex obects', function() {
        var rules, values;
        xml = '<xml>\n  <name>Name</name>\n  <complexValue>\n    <a>1</a>\n    <b>2</b>\n  </complexValue>\n  <complexValue>\n    <a>3</a>\n    <b>4</b>\n  </complexValue>\n</xml>';
        rules = {
          type: 'structure',
          members: {
            name: {
              type: 'string'
            },
            values: {
              type: 'list',
              flattened: true,
              member: {
                locationName: 'complexValue',
                type: 'structure',
                members: {
                  a: {
                    type: 'integer'
                  },
                  b: {
                    type: 'integer'
                  }
                }
              }
            }
          }
        };
        values = {
          name: 'Name',
          values: [
            {
              a: 1,
              b: 2
            }, {
              a: 3,
              b: 4
            }
          ]
        };
        return parse(xml, rules, function(data) {
          return expect(data).to.eql(values);
        });
      });
      return it('can parse flattened lists of complex objects', function() {
        var rules;
        xml = '<xml>\n  <Count>2</Count>\n  <Person><Name>abc</Name></Person>\n  <Person><Name>xyz</Name></Person>\n</xml>';
        rules = {
          type: 'structure',
          members: {
            Count: {
              type: 'integer'
            },
            People: {
              type: 'list',
              flattened: true,
              member: {
                type: 'structure',
                locationName: 'Person',
                members: {
                  Name: {}
                }
              }
            }
          }
        };
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({
            Count: 2,
            People: [
              {
                Name: 'abc'
              }, {
                Name: 'xyz'
              }
            ]
          });
        });
      });
    });
    describe('maps', function() {
      describe('non-flattened', function() {
        it('returns empty maps as {}', function() {
          var rules, xml;
          xml = '<xml>\n  <DomainMap/>\n</xml>';
          rules = {
            type: 'structure',
            members: {
              DomainMap: {
                type: 'map',
                value: {
                  type: 'string'
                }
              }
            }
          };
          return parse(xml, rules, function(data) {
            return expect(data).to.eql({
              DomainMap: {}
            });
          });
        });

        it('resolves nested duplicate fields by choosing direct children', function() {
          var xml = '';
          xml += '<xml>';
          xml +=   '<FooMap>';
          xml +=     '<entry>';
          xml +=       '<value>';
          xml +=         '<Nested>';
          xml +=           '<key>Foo</key>';
          xml +=         '</Nested>';
          xml +=       '</value>';
          xml +=       '<key>Count</key>';
          xml +=     '</entry>';
          xml +=   '</FooMap>';
          xml += '</xml>';

          var rules = {
            type: 'structure',
            members: {
              FooMap: {
                type: 'map',
                value: {
                  type: 'structure',
                  members: {
                    Nested: {
                      type: 'structure',
                      members: {
                        key: {}
                      }
                    }
                  }
                }
              }
            }
          };

          parse(xml, rules, function(data) {
            expect(data).to.eql({
              FooMap: {
                Count: {
                  Nested: {
                    key: 'Foo'
                  }
                }
              }
            });
          });
        });

        it('expects entry, key, and value elements by default', function() {
          var rules, xml;
          xml = '<xml>\n  <SummaryMap>\n    <entry>\n      <key>Groups</key>\n      <value>31</value>\n    </entry>\n    <entry>\n      <key>GroupsQuota</key>\n      <value>50</value>\n    </entry>\n    <entry>\n      <key>UsersQuota</key>\n      <value>150</value>\n    </entry>\n  </SummaryMap>\n</xml>';
          rules = {
            type: 'structure',
            members: {
              SummaryMap: {
                type: 'map',
                value: {
                  type: 'integer'
                }
              }
            }
          };
          return parse(xml, rules, function(data) {
            return expect(data).to.eql({
              SummaryMap: {
                Groups: 31,
                GroupsQuota: 50,
                UsersQuota: 150
              }
            });
          });
        });
        return it('can use alternate names for key and value elements', function() {
          var rules, xml;
          xml = '<xml>\n  <SummaryMap>\n    <entry>\n      <Property>Groups</Property>\n      <Count>31</Count>\n    </entry>\n    <entry>\n      <Property>GroupsQuota</Property>\n      <Count>50</Count>\n    </entry>\n    <entry>\n      <Property>UsersQuota</Property>\n      <Count>150</Count>\n    </entry>\n  </SummaryMap>\n</xml>';
          rules = {
            type: 'structure',
            members: {
              Summary: {
                type: 'map',
                locationName: 'SummaryMap',
                key: {
                  locationName: 'Property'
                },
                value: {
                  type: 'integer',
                  locationName: 'Count'
                }
              }
            }
          };
          return parse(xml, rules, function(data) {
            return expect(data).to.eql({
              Summary: {
                Groups: 31,
                GroupsQuota: 50,
                UsersQuota: 150
              }
            });
          });
        });
      });
      return describe('flattened', function() {
        it('expects key and value elements by default', function() {
          var rules, xml;
          xml = '<xml>\n  <Attributes>\n    <key>color</key>\n    <value>red</value>\n  </Attributes>\n  <Attributes>\n    <key>size</key>\n    <value>large</value>\n  </Attributes>\n</xml>';
          rules = {
            type: 'structure',
            members: {
              Attributes: {
                type: 'map',
                flattened: true
              }
            }
          };
          return parse(xml, rules, function(data) {
            return expect(data).to.eql({
              Attributes: {
                color: 'red',
                size: 'large'
              }
            });
          });
        });
        return it('can use alternate names for key and value elements', function() {
          var rules, xml;
          xml = '<xml>\n  <Attribute>\n    <AttrName>age</AttrName>\n    <AttrValue>35</AttrValue>\n  </Attribute>\n  <Attribute>\n    <AttrName>height</AttrName>\n    <AttrValue>72</AttrValue>\n  </Attribute>\n</xml>';
          rules = {
            type: 'structure',
            members: {
              Attributes: {
                locationName: 'Attribute',
                type: 'map',
                flattened: true,
                key: {
                  locationName: 'AttrName'
                },
                value: {
                  locationName: 'AttrValue',
                  type: 'integer'
                }
              }
            }
          };
          return parse(xml, rules, function(data) {
            return expect(data).to.eql({
              Attributes: {
                age: 35,
                height: 72
              }
            });
          });
        });
      });
    });
    describe('booleans', function() {
      var rules;
      rules = {
        type: 'structure',
        members: {
          enabled: {
            type: 'boolean'
          }
        }
      };
      it('converts the string "true" in to the boolean value true', function() {
        var xml;
        xml = '<xml><enabled>true</enabled></xml>';
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({
            enabled: true
          });
        });
      });
      it('converts the string "false" in to the boolean value false', function() {
        var xml;
        xml = '<xml><enabled>false</enabled></xml>';
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({
            enabled: false
          });
        });
      });
      return it('converts the empty elements into null', function() {
        var xml;
        xml = '<xml><enabled/></xml>';
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({
            enabled: null
          });
        });
      });
    });
    describe('timestamp', function() {
      var rules;
      rules = {
        type: 'structure',
        members: {
          CreatedAt: {
            type: 'timestamp'
          }
        }
      };
      it('returns an empty element as null', function() {
        var xml;
        xml = '<xml><CreatedAt/></xml>';
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({
            CreatedAt: null
          });
        });
      });
      it('understands unix timestamps', function() {
        var date, timestamp, xml;
        timestamp = 1349908100;
        date = new Date(timestamp * 1000);
        xml = '<xml><CreatedAt>' + timestamp + '</CreatedAt></xml>';
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({
            CreatedAt: date
          });
        });
      });
      it('understands basic iso8601 strings', function() {
        var date, timestamp, xml;
        timestamp = '2012-10-10T15:47:10.001Z';
        date = new Date(timestamp);
        xml = '<xml><CreatedAt>' + timestamp + '</CreatedAt></xml>';
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({
            CreatedAt: date
          });
        });
      });
      it('understands basic rfc822 strings', function() {
        var date, timestamp, xml;
        timestamp = 'Wed, 10 Oct 2012 15:59:55 UTC';
        date = new Date(timestamp);
        xml = '<xml><CreatedAt>' + timestamp + '</CreatedAt></xml>';
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({
            CreatedAt: date
          });
        });
      });
      return it('throws an error when unable to determine the format', function() {
        var e, error, message, timestamp, xml;
        timestamp = 'bad-date-format';
        xml = '<xml><CreatedAt>' + timestamp + '</CreatedAt></xml>';
        message = 'unhandled timestamp format: ' + timestamp;
        error = {};
        try {
          parse(xml, rules, function() {});
        } catch (error1) {
          e = error1;
          error = e;
        }
        return expect(error.message).to.eql(message);
      });
    });
    describe('numbers', function() {
      var rules;
      rules = {
        type: 'structure',
        members: {
          decimal: {
            type: 'float'
          }
        }
      };
      it('float parses elements types as integer', function() {
        var xml;
        xml = '<xml><decimal>123.456</decimal></xml>';
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({
            decimal: 123.456
          });
        });
      });
      return it('returns null for empty elements', function() {
        var xml;
        xml = '<xml><decimal/></xml>';
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({
            decimal: null
          });
        });
      });
    });
    describe('integers', function() {
      var rules;
      rules = {
        type: 'structure',
        members: {
          count: {
            type: 'integer'
          }
        }
      };
      it('integer parses elements types as integer', function() {
        var xml;
        xml = '<xml><count>123</count></xml>';
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({
            count: 123
          });
        });
      });
      return it('returns null for empty elements', function() {
        var xml;
        xml = '<xml><count/></xml>';
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({
            count: null
          });
        });
      });
    });
    describe('renaming elements', function() {
      it('can rename scalar elements', function() {
        var rules, xml;
        rules = {
          type: 'structure',
          members: {
            aka: {
              locationName: 'alias'
            }
          }
        };
        xml = '<xml><alias>John Doe</alias></xml>';
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({
            aka: 'John Doe'
          });
        });
      });
      return it('can rename nested elements', function() {
        var rules, xml;
        rules = {
          type: 'structure',
          members: {
            person: {
              members: {
                name: {},
                aka: {
                  locationName: 'alias'
                }
              }
            }
          }
        };
        xml = '<xml><person><name>Joe</name><alias>John Doe</alias></person></xml>';
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({
            person: {
              name: 'Joe',
              aka: 'John Doe'
            }
          });
        });
      });
    });
    describe('strings', function() {
      return it('parses empty strings as ""', function() {
        var rules, xml;
        rules = {
          type: 'structure',
          members: {
            Value: {
              type: 'string'
            }
          }
        };
        xml = '<xml><Value></Value></xml>';
        return parse(xml, rules, function(data) {
          return expect(data.Value).to.equal('');
        });
      });
    });
    describe('base64 encoded strings', function() {
      return it('base64 decodes string elements with encoding="base64"', function() {
        var rules, xml;
        rules = {
          type: 'structure',
          members: {
            Value: {
              type: 'string'
            }
          }
        };
        xml = '<xml>\n  <Value encoding="base64">Zm9v</Value>\n</xml>';
        parse(xml, rules, function(data) {
          return expect(data.Value.toString()).to.equal('foo');
        });
        rules = {
          type: 'structure',
          members: {
            Value: {}
          }
        };
        xml = '<xml>\n  <Value encoding="base64">Zm9v</Value>\n</xml>';
        return parse(xml, rules, function(data) {
          return expect(data.Value.toString()).to.equal('foo');
        });
      });
    });
    describe('elements with XML namespaces', function() {
      return it('strips the xmlns element', function() {
        var rules, xml;
        rules = {
          type: 'structure',
          members: {
            List: {
              type: 'list',
              member: {
                type: 'structure',
                members: {
                  Attr1: {},
                  Attr2: {
                    type: 'structure',
                    members: {
                      Foo: {}
                    }
                  }
                }
              }
            }
          }
        };
        xml = '<xml xmlns="http://s3.amazonaws.com/doc/2006-03-01/">\n  <List>\n    <member>\n      <Attr1 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="CanonicalUser">abc</Attr1>\n      <Attr2 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="CanonicalUser"><Foo>bar</Foo></Attr2>\n    </member>\n  </List>\n</xml>';
        return parse(xml, rules, function(data) {
          return expect(data).to.eql({
            List: [
              {
                Attr1: 'abc',
                Attr2: {
                  Foo: 'bar'
                }
              }
            ]
          });
        });
      });
    });
    describe('parsing errors', function() {
      it('throws an error when unable to parse the xml', function() {
        var e, error, rules, xml;
        xml = 'asdf';
        rules = {};
        error = {};
        try {
          new AWS.XML.Parser().parse(xml, rules);
        } catch (error1) {
          e = error1;
          error = e;
        }
        return expect(error.code).to.equal('XMLParserError');
      });
      it('throws an error when xml is incomplete or does not close all tags', function() {
        var e, error, rules, xml;
        xml = '<Content><Member>MemberText</Member><Subcontent><Submember>SubMemberText';
        rules = {};
        error = {};
        try {
          new AWS.XML.Parser().parse(xml, rules);
        } catch (error1) {
          e = error1;
          error = e;
        }
        return expect(error.code).to.equal('XMLParserError');
      });
      return it('xml parser errors are retryable', function() {
        var e, error, rules, xml;
        xml = '<Content><Member>MemberText</Member><Subcontent><Submember>SubMemberText';
        rules = {};
        error = {};
        try {
          new AWS.XML.Parser().parse(xml, rules);
        } catch (error1) {
          e = error1;
          error = e;
        }
        return expect(error.retryable).to.be['true'];
      });
    });

    describe('response metadata', function() {
      it('resolves nested duplicate fields by choosing direct children', function() {
        var xml = '';
        xml += '<xml>';
        xml +=   '<Item>';
        xml +=     '<ResponseMetadata><Foo>foo</Foo></ResponseMetadata>';
        xml +=   '</Item>';
        xml +=   '<ResponseMetadata><RequestId>request-id</RequestId></ResponseMetadata>';
        xml += '</xml>';

        var rules = {
          type: 'structure',
          members: {
            Item: {
              type: 'structure',
              members: {
                ResponseMetadata: {
                  type: 'structure',
                  members: {
                    Foo: {}
                  }
                }
              }
            }
          }
        };

        parse(xml, rules, function(data) {
          expect(data).to.eql({
            Item: {
              ResponseMetadata: {
                Foo: 'foo'
              }
            },
            ResponseMetadata: {
              RequestId: 'request-id'
            }
          });
        });
      });
    });
  });

}).call(this);

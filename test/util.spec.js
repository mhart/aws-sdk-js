(function() {
  var AWS, Buffer, helpers;

  helpers = require('./helpers');

  AWS = helpers.AWS;

  Buffer = AWS.util.Buffer;

  describe('uriEscape', function() {
    var e;
    e = AWS.util.uriEscape;
    it('escapes spaces as %20', function() {
      return expect(e('a b')).to.equal('a%20b');
    });
    it('escapes + as %2B', function() {
      return expect(e('a+b')).to.equal('a%2Bb');
    });
    it('escapes / as %2F', function() {
      return expect(e('a/b')).to.equal('a%2Fb');
    });
    it('escapes \' as %27', function() {
      return expect(e('a\'b')).to.equal('a%27b');
    });
    it('escapes * as %2A', function() {
      return expect(e('a*b')).to.equal('a%2Ab');
    });
    it('does not escape ~', function() {
      return expect(e('a~b')).to.equal('a~b');
    });
    return it('encodes utf8 characters', function() {
      return expect(e('ёŝ')).to.equal('%D1%91%C5%9D');
    });
  });

  describe('readFileSync', function() {
    var err, errorFound, readFileSync;
    readFileSync = AWS.util.readFileSync;
    if (AWS.util.isBrowser()) {
      return it('will always return null in the browser', function() {
        return expect(readFileSync('fake/path')).to.eql(null);
      });
    } else {
      errorFound = false;
      try {
        readFileSync('fake/path');
      } catch (error) {
        err = error;
        errorFound = true;
      }
      return expect(errorFound).to.equal(true);
    }
  });

  describe('uriEscapePath', function() {
    var e;
    e = AWS.util.uriEscapePath;
    it('does not escape forward slashes', function() {
      var s;
      s = 'a&b/x=y/1+2/m?n';
      return expect(e(s)).to.equal('a%26b/x%3Dy/1%2B2/m%3Fn');
    });
    return it('leaves leading and trailing forward slashes in place', function() {
      var s;
      s = '/ab cd/';
      return expect(e(s)).to.equal('/ab%20cd/');
    });
  });

  describe('AWS.util.queryParamsToString', function() {
    var qpts;
    qpts = AWS.util.queryParamsToString;
    it('sorts query parameters before stringifying', function() {
      return expect(qpts({
        c: '1',
        b: '2',
        a: '3'
      })).to.equal('a=3&b=2&c=1');
    });
    it('handles empty values', function() {
      return expect(qpts({
        a: '',
        b: '2'
      })).to.equal('a=&b=2');
    });
    it('handles null/undefined values', function() {
      return expect(qpts({
        a: void 0,
        b: null
      })).to.equal('a=&b=');
    });
    it('calls uriEscape on each name and value', function() {
      var spy;
      spy = helpers.spyOn(AWS.util, 'uriEscape').andCallThrough();
      qpts({
        c: '1',
        b: '2',
        a: '3'
      });
      return expect(spy.calls.length).to.equal(6);
    });
    it('handles values as lists', function() {
      return expect(qpts({
        a: ['c', 'b', 'a'],
        b: '4'
      })).to.equal('a=a&a=b&a=c&b=4');
    });
    it('escapes list values', function() {
      return expect(qpts({
        a: ['+', '&', '*'],
        b: '4'
      })).to.equal('a=%26&a=%2A&a=%2B&b=4');
    });
    return it('does not provide value if value is null', function() {
      return expect(qpts({
        a: null,
        b: null
      })).to.equal('a=&b=');
    });
  });

  describe('AWS.util.date', function() {
    var util;
    util = AWS.util.date;
    describe('getDate', function() {
      it('should return current date by default', function() {
        var now, obj;
        now = new Date(0);
        obj = AWS.util.isNode() ? global : window;
        helpers.spyOn(obj, 'Date').andCallFake(function() {
          return now;
        });
        return expect(util.getDate()).to.equal(now);
      });
      return describe('systemClockOffset', function() {
        var config, date, mocked, ref;
        ref = [], date = ref[0], mocked = ref[1], config = ref[2];
        beforeEach(function() {
          var obj, ref1;
          ref1 = [Date, false, AWS.config], date = ref1[0], mocked = ref1[1], config = ref1[2];
          obj = AWS.util.isNode() ? global : window;
          return helpers.spyOn(obj, 'Date').andCallFake(function(t) {
            if (mocked) {
              return new date(t);
            } else {
              mocked = true;
              return new date(0);
            }
          });
        });
        afterEach(function() {
          AWS.config = config;
          return AWS.config.systemClockOffset = 0;
        });
        it('returns a date with a millisecond offset if provided', function() {
          AWS.config.systemClockOffset = 10000;
          return expect(util.getDate().getTime()).to.equal(10000);
        });
        it('returns a date with a millisecond offset from a non-Config object', function() {
          AWS.config = {
            systemClockOffset: 10000
          };
          expect(util.getDate().getTime()).to.equal(10000);
          return AWS.config = config;
        });
        return it('returns a date with no offset if non-Config object has no systemClockOffset property', function() {
          AWS.config = {};
          return expect(util.getDate().getTime()).to.equal(0);
        });
      });
    });

    describe('applyClockOffset', function() {
      it('should apply new clock offset to AWS.config given new service time', function() {
        var now = new Date().getTime();
        AWS.config.systemClockOffset = 0;
        AWS.util.applyClockOffset(now + 30000);
        var updatedOffset = AWS.config.systemClockOffset;
        expect(29900 < updatedOffset && 30100 > updatedOffset).to.equal(true);
      });
    });

    describe('isClockSkewed', function() {
      it('should apply new clock offset to AWS.config given new service time', function() {
        var util = AWS.util;
        var now = new Date();
        obj = AWS.util.isNode() ? global : window;
        helpers.spyOn(obj, 'Date').andCallFake(function() {
          return now;
        });
        expect(util.isClockSkewed(now.getTime() + 300100)).to.equal(true);
        expect(util.isClockSkewed(now.getTime() + 299900)).to.equal(false);
      });
    });

    describe('iso8601', function() {
      it('should return date formatted as YYYYMMDDTHHmmssZ', function() {
        var date;
        date = new Date(600000);
        date.setMilliseconds(0);
        helpers.spyOn(util, 'getDate').andCallFake(function() {
          return date;
        });
        return expect(util.iso8601()).to.equal('1970-01-01T00:10:00Z');
      });
      return it('should allow date parameter', function() {
        var date;
        date = new Date(660000);
        date.setMilliseconds(0);
        return expect(util.iso8601(date)).to.equal('1970-01-01T00:11:00Z');
      });
    });

    describe('rfc822', function() {
      it('should return date formatted as YYYYMMDDTHHmmssZ', function() {
        var date;
        date = new Date(600000);
        date.setMilliseconds(0);
        helpers.spyOn(util, 'getDate').andCallFake(function() {
          return date;
        });
        return expect(util.rfc822()).to.match(/^Thu, 0?1 Jan 1970 00:10:00 (GMT|UTC)$/);
      });
      return it('should allow date parameter', function() {
        var date;
        date = new Date(660000);
        date.setMilliseconds(0);
        return expect(util.rfc822(date)).to.match(/^Thu, 0?1 Jan 1970 00:11:00 (GMT|UTC)$/);
      });
    });
    return describe('unixTimestamp', function() {
      it('should return date formatted as unix timestamp', function() {
        var date;
        date = new Date(600000);
        date.setMilliseconds(0);
        helpers.spyOn(util, 'getDate').andCallFake(function() {
          return date;
        });
        return expect(util.unixTimestamp()).to.equal(600);
      });
      it('should allow date parameter', function() {
        var date;
        date = new Date(660000);
        date.setMilliseconds(0);
        return expect(util.unixTimestamp(date)).to.equal(660);
      });
      return it('should return date formatted as unix timestamp with milliseconds', function() {
        helpers.spyOn(util, 'getDate').andCallFake(function() {
          return new Date(600123);
        });
        return expect(util.unixTimestamp()).to.equal(600.123);
      });
    });
  });

  describe('AWS.util.string', function() {
    var len;
    len = AWS.util.string.byteLength;
    return describe('byteLength', function() {
      it('handles null/undefined objects', function() {
        expect(len(void 0)).to.equal(0);
        return expect(len(null)).to.equal(0);
      });
      it('handles buffer input', function() {
        return expect(len(new AWS.util.buffer.toBuffer('∂ƒ©∆'))).to.equal(10);
      });
      it('handles string input', function() {
        expect(len('')).to.equal(0);
        return expect(len('∂ƒ©∆')).to.equal(10);
      });
      if (AWS.util.isNode()) {
        it('handles file object input (path property)', function() {
          var file, fileLen, fs;
          fs = require('fs');
          file = fs.createReadStream(__filename);
          fileLen = fs.lstatSync(file.path).size;
          expect(len(file)).to.equal(fileLen);
          return expect(len({
            path: __filename
          })).to.equal(fileLen);
        });
      }
      it('fails if input is not a string, buffer, or file', function() {
        var e, err;
        err = null;
        try {
          len(3.14);
        } catch (error) {
          e = error;
          err = e;
        }
        expect(err.message).to.equal('Cannot determine length of 3.14');
        return expect(err.object).to.equal(3.14);
      });
      return it('ignores path property unless it is a string', function() {
        var e, err, object;
        object = {};
        err = null;
        try {
          len(object);
        } catch (error) {
          e = error;
          err = e;
        }
        expect(err.message).to.match(/Cannot determine length of /);
        return expect(err.object).to.equal(object);
      });
    });
  });

  describe('AWS.util.ini', function() {
    return describe('parse', function() {
      it('parses an ini file', function() {
        var ini, map;
        ini = '; comment at the beginning of the line\n[section1] ; comment at end of line\ninvalidline\nkey1=value1 ; another comment\n  key2 = value2;value3\n  key3 = value4 # yet another comment\n[emptysection]\n#key1=value1';
        map = AWS.util.ini.parse(ini);
        expect(map.section1.key1).to.equal('value1');
        expect(map.section1.key2).to.equal('value2;value3');
        expect(map.section1.key3).to.equal('value4');
        return expect(map.emptysection).to.equal(void 0);
      });
      return it('ignores leading and trailing white space', function() {
        var ini, map;
        ini = '[section1] ; comment at end of line\n\r\tkey1=\t\rvalue1\t\r\n\v\f\tkey2=value2\f\v\n\u00a0key3   =  \u00a0value3\u3000\n[emptysection]';
        map = AWS.util.ini.parse(ini);
        expect(map.section1.key1).to.equal('value1');
        expect(map.section1.key2).to.equal('value2');
        return expect(map.section1.key3).to.equal('value3');
      });
    });
  });

  describe('AWS.util.buffer', function() {
    describe ('alloc', function () {
      it('should throw if first parameter is not number', function(done) {
        try {
          AWS.util.buffer.alloc('foo');
        } catch (e) {
          expect(e.message).to.eql('size passed to alloc must be a number.');
          done();
        }
      });
    });
    return describe('concat', function() {
      return it('concatenates a list of buffers', function() {
        var buffer1, buffer2, buffer3;
        buffer1 = AWS.util.buffer.toBuffer('abcdefg');
        buffer2 =  AWS.util.buffer.toBuffer('hijklmn');
        buffer3 = AWS.util.buffer.concat([buffer1, buffer2]);
        expect(buffer3.length).to.equal(14);
        return expect(buffer3.toString()).to.equal('abcdefghijklmn');
      });
    });
  });

  describe('AWS.util.crypto', function() {
    var util;
    util = AWS.util.crypto;
    describe('crc32', function() {
      it('returns the correct CRC32 value for binary data', function() {
        var buffer, i, j, ref;
        buffer = AWS.util.buffer.alloc(4433);
        for (i = j = 0, ref = buffer.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
          buffer.writeUInt8(i % 256, i);
        }
        return expect(util.crc32(buffer)).to.equal(899332870);
      });
      return it('handles String values', function() {
        var string;
        string = '{"ConsumedCapacityUnits":1.0}';
        return expect(util.crc32(string)).to.equal(2614884069);
      });
    });
    describe('toHex', function() {
      return it('should convert binary data to hex string', function() {
        return expect(util.toHex('ABC')).to.equal('414243');
      });
    });
    describe('hmac', function() {
      var input, key, result;
      input = 'foo';
      key = 'KEY';
      result = '116a3725a3540067a09e4dba64bb6b3fb27b4d98a1a2e2dbcb8b4cffa73585d5';
      it('should return a keyed hash as a binary digest', function() {
        var expected;
        expected = util.hmac(key, input);
        return expect(util.toHex(expected)).to.equal(result);
      });
      it('should return a keyed hash as hex digest', function() {
        var expected;
        expected = util.hmac(key, input, 'hex');
        return expect(expected).to.equal(result);
      });
      it('accepts the crypto function as an argument', function() {
        var r;
        r = util.hmac('secret', 'the quick brown fox', 'base64', 'sha1');
        return expect(r).to.equal('z1BzGT+uG/2qGzE1UHb5m/skn1E=');
      });
      return it('accepts UTF-8 input for string', function() {
        var r;
        r = util.hmac('foo', 'å∆ç∂', 'hex');
        return expect(r).to.equal('bc11556145cbe4935ba187b9f8ba0c12bae2c866e5795013dfe2d08cabc33e13');
      });
    });
    describe('sha256', function() {
      var input, result;
      input = 'foo';
      result = '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae';
      it('should return binary data hashed with sha256', function() {
        var expected;
        expected = util.sha256(input);
        return expect(util.toHex(expected)).to.equal(result);
      });
      it('should return hex data hashed with sha256', function() {
        var expected;
        expected = util.sha256(input, 'hex');
        return expect(expected).to.equal(result);
      });
      it('accepts UTF-8 input', function() {
        var r;
        r = util.sha256('ß∂ƒ©', 'hex');
        return expect(r).to.equal('3c01ddd413d2cacac59a255e4aade0d9058a8a9ea8b2dfe5bb2dc4ed132b4139');
      });
      it('handles async interface', function() {
        return util.sha256(input, 'hex', function(e, d) {
          return expect(d).to.equal(result);
        });
      });
      if (AWS.util.isNode()) {
        it('handles streams in async interface', function(done) {
          var Transform, tr;
          Transform = AWS.util.stream.Transform;
          tr = new Transform;
          tr._transform = function(data, encoding, callback) {
            return callback(null, data);
          };
          tr.push(AWS.util.buffer.toBuffer(input));
          tr.end();
          return util.sha256(tr, 'hex', function(e, d) {
            expect(d).to.equal(result);
            return done();
          });
        });
      }
      if (AWS.util.isBrowser()) {
        it('handles Blobs (no phantomjs)', function(done) {
          result = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3';
          return util.sha256(new Blob([1, 2, 3]), 'hex', function(e, d) {
            expect(e).to.eql(null);
            expect(d).to.equal(result);
            return done();
          });
        });
        return it('handles Uint8Array objects directly', function(done) {
          result = '039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81';
          return util.sha256(new Uint8Array([1, 2, 3]), 'hex', function(e, d) {
            expect(e).to.eql(null);
            expect(d).to.equal(result);
            return done();
          });
        });
      }
    });
    return describe('md5', function() {
      var input, result;
      input = 'foo';
      result = 'acbd18db4cc2f85cedef654fccc4a4d8';
      it('should return binary data hashed with md5', function() {
        var expected;
        expected = util.md5(input);
        return expect(util.toHex(expected)).to.equal(result);
      });
      it('should return hex data hashed with md5', function() {
        var expected;
        expected = util.md5(input, 'hex');
        return expect(expected).to.equal(result);
      });
      it('accepts UTF-8 input', function() {
        var r;
        r = util.md5('ￃ', 'hex');
        return expect(r).to.equal('b497dbbe19fb58cddaeef11f9d40804c');
      });
      it('handles async interface', function() {
        return util.md5(input, 'hex', function(e, d) {
          return expect(d).to.equal(result);
        });
      });
      if (AWS.util.isNode()) {
        return it('handles streams in async interface', function(done) {
          var Transform, tr;
          Transform = AWS.util.stream.Transform;
          tr = new Transform;
          tr._transform = function(data, enc, callback) {
            return callback(null, data);
          };
          tr.push(AWS.util.buffer.toBuffer(input));
          tr.end();
          return util.md5(tr, 'hex', function(e, d) {
            expect(d).to.equal(result);
            return done();
          });
        });
      }
    });
  });

  describe('AWS.util.each', function() {
    it('should iterate over a hash', function() {
      var parts;
      parts = [];
      AWS.util.each({
        a: 1,
        b: 2,
        c: 3
      }, function(key, item) {
        return parts.push([key + '_', item + 1]);
      });
      return expect(parts).to.eql([['a_', 2], ['b_', 3], ['c_', 4]]);
    });
    it('should iterate over an array', function() {
      var total;
      total = 0;
      AWS.util.each([1, 2, 3], function(idx, item) {
        return total += item;
      });
      return expect(total).to.equal(6);
    });
    it('should ignore inherited properties', function() {
      var obj, objCtor, parts;
      objCtor = function() {
        this.a = 1;
        this.b = 2;
        return this.c = 3;
      };
      objCtor.prototype = {
        d: 4,
        e: 5,
        f: 6
      };
      obj = new objCtor();
      parts = [];
      AWS.util.each(obj, function(key, item) {
        return parts.push([key + '_', item + 1]);
      });
      return expect(parts).to.eql([['a_', 2], ['b_', 3], ['c_', 4]]);
    });
    it('callback should not change "this" scope', function() {
      return new function() {
        var self;
        this['class'] = 'MyClass';
        self = this;
        return AWS.util.each.apply(this, [
          [1, 2, 3], function() {
            return expect(this).to.equal(self);
          }
        ]);
      };
    });
    return it('can abort out of loop', function() {
      var string;
      string = '';
      AWS.util.each({
        a: 1,
        b: 2,
        c: 3
      }, function(key, item) {
        if (item === 2) {
          return AWS.util.abort;
        }
        return string += key;
      });
      return expect(string).to.equal('a');
    });
  });

  describe('AWS.util.arrayEach', function() {
    it('should iterate over arrays', function() {
      var total;
      total = 0;
      AWS.util.arrayEach([1, 2, 3], function(item) {
        return total += item;
      });
      return expect(total).to.equal(6);
    });
    it('should pass index as second parameter', function() {
      var lastIndex;
      lastIndex = null;
      return AWS.util.arrayEach([1, 2, 3], function(item, idx) {
        expect(typeof idx).to.equal('number');
        if (lastIndex !== null) {
          expect(lastIndex).to.equal(idx - 1);
        }
        return lastIndex = idx;
      });
    });
    return it('can abort out of loop', function() {
      var total;
      total = 0;
      AWS.util.arrayEach([1, 2, 3], function(item, idx) {
        if (idx === 1) {
          return AWS.util.abort;
        }
        return total += item;
      });
      return expect(total).to.equal(1);
    });
  });

  describe('AWS.util.copy', function() {
    it('does not copy null or undefined', function() {
      expect(AWS.util.copy(null)).to.equal(null);
      return expect(AWS.util.copy(void 0)).to.equal(void 0);
    });
    it('should perform a shallow copy of an object', function() {
      var copied, obj;
      obj = {
        a: 1,
        b: 2,
        c: 3
      };
      copied = AWS.util.copy(obj);
      expect(copied).not.to.equal(obj);
      return expect(copied).to.eql({
        a: 1,
        b: 2,
        c: 3
      });
    });
    return it('should copy inherited properties', function() {
      var copied, obj, objCtor;
      objCtor = function() {
        this.a = 1;
        this.b = 2;
        return this.c = 3;
      };
      objCtor.prototype = {
        d: 4
      };
      obj = new objCtor();
      copied = AWS.util.copy(obj);
      expect(copied).not.to.equal(obj);
      return expect(copied).to.eql({
        a: 1,
        b: 2,
        c: 3,
        d: 4
      });
    });
  });

  describe('AWS.util.merge', function() {
    it('should merge an object into another and return new object', function() {
      var newObj, obj;
      obj = {
        a: 1,
        b: 2,
        c: 3
      };
      newObj = AWS.util.merge(obj, {
        d: 4,
        e: 5,
        a: 6
      });
      expect(newObj).to.eql({
        a: 6,
        b: 2,
        c: 3,
        d: 4,
        e: 5
      });
      return expect(obj).to.eql({
        a: 1,
        b: 2,
        c: 3
      });
    });
  });

  describe('AWS.util.update', function() {
    it('should merge an object into another', function() {
      var obj;
      obj = {
        a: 1,
        b: 2,
        c: 3
      };
      AWS.util.update(obj, {
        d: 4,
        e: 5,
        a: 6
      });
      return expect(obj).to.eql({
        a: 6,
        b: 2,
        c: 3,
        d: 4,
        e: 5
      });
    });
    it('should return the merged object', function() {
      var obj;
      obj = {
        a: 1,
        b: 2
      };
      return expect(AWS.util.update(obj, {
        c: 3
      })).to.eql({a: 1, b: 2, c: 3});
    });
  });

  describe('AWS.util.inherit', function() {
    it('should inherit an object and append features', function() {
      var Base, Derived, derived;
      Base = function(value) {
        return this.defaultValue = value;
      };
      Base.prototype = {
        main: function() {
          return 'main';
        },
        other: 'other'
      };
      Derived = AWS.util.inherit(Base, {
        constructor: function(value) {
          return Base.apply(this, [value + 5]);
        },
        main: function() {
          return 'notMain';
        },
        foo: function() {
          return 'bar';
        }
      });
      derived = new Derived(5);
      expect(derived).to.be.instanceOf(Base);
      expect(derived.constructor).to.equal(Derived);
      expect(derived.main()).to.equal('notMain');
      expect(derived.other).to.equal('other');
      expect(derived.defaultValue).to.equal(10);
      return expect(derived.foo()).to.equal('bar');
    });
    return it('should create pass-through constructor if not defined', function() {
      var Base, Derived, derived;
      Base = AWS.util.inherit({
        constructor: helpers.createSpy()
      });
      Derived = AWS.util.inherit(Base, {
        other: true
      });
      derived = new Derived(1, 2, 'three');
      expect(derived.other).to.equal(true);
      return expect(Base.prototype.constructor.calls[0]['arguments']).to.eql([1, 2, 'three']);
    });
  });

  describe('AWS.util.mixin', function() {
    it('copies properties to other object prototype', function() {
      var obj;
      obj = {
        prototype: {
          a: 1,
          b: 2
        }
      };
      AWS.util.mixin(obj, {
        prototype: {
          b: 3,
          c: 4
        }
      });
      return expect(obj.prototype).to.eql({
        a: 1,
        b: 3,
        c: 4
      });
    });
    it('resets prototype constructor', function() {
      var obj;
      obj = {
        prototype: {
          constructor: 'PASS'
        }
      };
      AWS.util.mixin(obj, {
        prototype: {
          constructor: 'FAIL'
        }
      });
      return expect(obj.prototype).to.eql({
        constructor: 'PASS'
      });
    });
    return it('returns original klass', function() {
      var obj, out;
      obj = {
        prototype: {
          foo: 1
        }
      };
      out = AWS.util.mixin(obj, {
        prototype: {
          bar: 2
        }
      });
      return expect(out).to.equal(obj);
    });
  });

  describe('AWS.util.isType', function() {
    it('accepts function for type', function() {
      return expect(AWS.util.isType([], Array)).to.equal(true);
    });
    return it('accepts string for type', function() {
      return expect(AWS.util.isType([], 'Array')).to.equal(true);
    });
  });

  describe('AWS.util.isEmpty', function() {
    it('returns true when passed an empty object literal', function() {
      return expect(AWS.util.isEmpty({})).to.equal(true);
    });
    return it('returns true when passed a non-empty object literal', function() {
      return expect(AWS.util.isEmpty({
        a: 1
      })).to.equal(false);
    });
  });

  describe('AWS.util.error', function() {
    it('returns the created error object with extra options', function() {
      var err, origError;
      origError = new Error();
      err = AWS.util.error(origError, {
        message: 'msg',
        code: 'code'
      });
      expect(err).to.equal(origError);
      expect(err.message).to.equal('msg');
      return expect(err.code).to.equal('code');
    });
    it('accepts missing options', function() {
      var err, origError;
      origError = new Error('ERROR');
      err = AWS.util.error(origError);
      expect(err).to.equal(origError);
      return expect(err.message).to.equal('ERROR');
    });
    it('maintains the original error message property', function() {
      var err, origError;
      origError = new Error('ERROR');
      err = AWS.util.error(origError, {
        code: 'code'
      });
      expect(err).to.equal(origError);
      expect(err.message).to.equal('ERROR');
      return expect(err.code).to.equal('code');
    });
    return it('keeps track of the old error', function() {
      var err, origError;
      origError = new Error('ERROR');
      origError.value = 1;
      err = AWS.util.error(origError, {
        code: 'code',
        message: 'FOO'
      });
      expect(err.originalError.message).to.equal('ERROR');
      expect(err.originalError.code).to.equal(void 0);
      return expect(err.originalError.value).to.equal(1);
    });
  });

  describe('AWS.util.base64', function() {
    var base64;
    base64 = AWS.util.base64;
    describe('encode', function() {
      it('encodes the given string', function() {
        expect(base64.encode('foo')).to.equal('Zm9v');
        return expect(base64.encode('ёŝ')).to.equal('0ZHFnQ==');
      });
      it('encodes the given buffer', function() {
        expect(base64.encode(AWS.util.buffer.toBuffer('foo'))).to.equal('Zm9v');
        return expect(base64.encode(AWS.util.buffer.toBuffer('ёŝ'))).to.equal('0ZHFnQ==');
      });
      it('throws if a number is supplied', function() {
        var e, err;
        err = null;
        try {
          base64.encode(3.14);
        } catch (error) {
          e = error;
          err = e;
        }
        return expect(err.message).to.equal('Cannot base64 encode number 3.14');
      });
      it('does not encode null', function() {
        return expect(base64.encode(null)).to.eql(null);
      });
      return it('does not encode undefined', function() {
        return expect(base64.encode(void 0)).to.eql(void 0);
      });
    });
    return describe('decode', function() {
      it('decodes the given string', function() {
        expect(base64.decode('Zm9v').toString()).to.equal('foo');
        return expect(base64.decode('0ZHFnQ==').toString()).to.equal('ёŝ');
      });
      it('decodes the given buffer', function() {
        expect(base64.decode(AWS.util.buffer.toBuffer('Zm9v', 'base64')).toString()).to.equal('foo');
        return expect(base64.decode(AWS.util.buffer.toBuffer('0ZHFnQ==', 'base64')).toString()).to.equal('ёŝ');
      });
      it('throws if a number is supplied', function() {
        var e, err;
        err = null;
        try {
          base64.decode(3.14);
        } catch (error) {
          e = error;
          err = e;
        }
        return expect(err.message).to.equal('Cannot base64 decode number 3.14');
      });
      it('does not decode null', function() {
        return expect(base64.decode(null)).to.eql(null);
      });
      return it('does not decode undefined', function() {
        return expect(base64.decode(void 0)).to.eql(void 0);
      });
    });
  });

  describe('AWS.util.hoistPayloadMember', function() {
    var buildService, hoist, service;
    hoist = AWS.util.hoistPayloadMember;
    service = null;
    buildService = function(api) {
      return service = new AWS.Service({
        endpoint: 'http://localhost',
        apiConfig: api
      });
    };
    it('hoists structure payload members', function(done) {
      var api, httpResp, req;
      api = {
        'metadata': {
          'protocol': 'rest-xml'
        },
        'operations': {
          'sample': {
            'output': {
              'shape': 'OutputShape'
            }
          }
        },
        'shapes': {
          'OutputShape': {
            'type': 'structure',
            'payload': 'Data',
            'members': {
              'Data': {
                'shape': 'SingleStructure'
              }
            }
          },
          'StringType': {
            'type': 'string'
          },
          'SingleStructure': {
            'type': 'structure',
            'members': {
              'Foo': {
                'shape': 'StringType'
              }
            }
          }
        }
      };
      httpResp = {
        'status_code': 200,
        'headers': {
          'X-Foo': 'baz'
        },
        'body': '<OperationNameResponse><Foo>abc</Foo></OperationNameResponse>'
      };
      buildService(api);
      helpers.mockHttpResponse(httpResp.status_code, httpResp.headers, httpResp.body);
      req = service.sample();
      return req.send(function(err, data) {
        hoist(req.response);
        expect(data.Foo).to.eql('abc');
        expect(data.Data.Foo).to.eql('abc');
        return done();
      });
    });
    if (typeof Promise !== 'undefined') {
      it('hoists structure payload members', function() {
        var api, httpResp, req, res;
        AWS.config.setPromisesDependency();
        api = {
          'metadata': {
            'protocol': 'rest-xml'
          },
          'operations': {
            'sample': {
              'output': {
                'shape': 'OutputShape'
              }
            }
          },
          'shapes': {
            'OutputShape': {
              'type': 'structure',
              'payload': 'Data',
              'members': {
                'Data': {
                  'shape': 'SingleStructure'
                }
              }
            },
            'StringType': {
              'type': 'string'
            },
            'SingleStructure': {
              'type': 'structure',
              'members': {
                'Foo': {
                  'shape': 'StringType'
                }
              }
            }
          }
        };
        httpResp = {
          'status_code': 200,
          'headers': {
            'X-Foo': 'baz'
          },
          'body': '<OperationNameResponse><Foo>abc</Foo></OperationNameResponse>'
        };
        buildService(api);
        helpers.mockHttpResponse(httpResp.status_code, httpResp.headers, httpResp.body);
        req = service.sample();
        res = req.promise();
        return res.then(function(data) {
          hoist(req.response);
          expect(data.Foo).to.eql('abc');
          return expect(data.Data.Foo).to.eql('abc');
        });
      });
    }
    return it('does not hoist streaming payload members', function() {
      var api, httpResp, req;
      api = {
        'metadata': {
          'protocol': 'rest-xml'
        },
        'operations': {
          'sample': {
            'output': {
              'shape': 'OutputShape'
            }
          }
        },
        'shapes': {
          'OutputShape': {
            'type': 'structure',
            'payload': 'Stream',
            'members': {
              'Stream': {
                'shape': 'BlobStream'
              }
            }
          },
          'BlobStream': {
            'type': 'binary',
            'streaming': true
          }
        }
      };
      httpResp = {
        'status_code': 200,
        'headers': {},
        'body': 'abc'
      };
      buildService(api);
      helpers.mockHttpResponse(httpResp.status_code, httpResp.headers, httpResp.body);
      req = service.sample();
      req.send();
      hoist(req.response);
      return expect(req.response.data.Stream.toString()).to.eql('abc');
    });
  });

  describe('AWS.util.extractRequestId', function() {
    var api, service;
    api = {
      'metadata': {
        'protocol': 'rest-xml'
      },
      'operations': {
        'sample': {
          'output': {
            'shape': 'OutputShape'
          }
        }
      },
      'shapes': {
        'OutputShape': {
          'type': 'structure',
          'payload': 'Data',
          'members': {
            'Data': {
              'shape': 'SingleStructure'
            }
          }
        },
        'StringType': {
          'type': 'string'
        },
        'SingleStructure': {
          'type': 'structure',
          'members': {
            'Foo': {
              'shape': 'StringType'
            }
          }
        }
      }
    };
    service = new AWS.Service({
      endpoint: 'http://localhost',
      apiConfig: api
    });
    it('sets requestId on the response when requestId is valid', function() {
      var req;
      helpers.mockHttpResponse(200, {
        'x-amz-request-id': 'RequestId1'
      }, {});
      req = service.sample();
      req.send();
      AWS.util.extractRequestId(req.response);
      return expect(req.response.requestId).to.equal('RequestId1');
    });
    it('sets requestId on the response on error status codes', function() {
      var req;
      helpers.mockHttpResponse(403, {
        'x-amz-request-id': 'RequestId1'
      });
      req = service.sample();
      req.send();
      AWS.util.extractRequestId(req.response);
      return expect(req.response.requestId).to.equal('RequestId1');
    });
    return it('sets requestId on the error on error status codes', function() {
      var req;
      helpers.mockHttpResponse(403, {
        'x-amz-request-id': 'RequestId1'
      });
      req = service.sample();
      req.send();
      AWS.util.extractRequestId(req.response);
      return expect(req.response.error.requestId).to.equal('RequestId1');
    });
  });

  describe('AWS.util.addPromises', function() {
    beforeEach(function() {
      return AWS.config.setPromisesDependency();
    });
    afterEach(function() {
      delete AWS.Request.prototype.promise;
      delete AWS.S3.ManagedUpload.prototype.promise;
      delete AWS.Credentials.prototype.getPromise;
      delete AWS.Credentials.prototype.refreshPromise;
      return delete AWS.CredentialProviderChain.prototype.resolvePromise;
    });
    if (typeof Promise !== 'undefined') {
      describe('with native promises', function() {
        it('can use native promises', function() {
          AWS.util.addPromises(AWS.Request);
          return expect(typeof AWS.Request.prototype.promise).to.equal('function');
        });
        return it('will use specified dependency over native promises', function() {
          var P, count, req, reqSpy, service;
          service = new helpers.MockService();
          count = 0;
          P = function() {
            return count++;
          };
          AWS.util.addPromises(AWS.Request, P);
          req = service.makeRequest('mockMethod');
          expect(typeof AWS.Request.prototype.promise).to.equal('function');
          reqSpy = helpers.spyOn(req, 'promise').andCallThrough();
          req.promise();
          return expect(count).to.equal(reqSpy.calls.length);
        });
      });
    } else {
      describe('without native promises', function() {
        it('will not add promise method if no dependency is provided', function() {
          AWS.util.addPromises(AWS.Request);
          return expect(typeof AWS.Request.prototype.promise).to.equal('undefined');
        });
        it('will add promise method if dependency is provided', function() {
          var P;
          P = function() {};
          AWS.util.addPromises(AWS.Request, P);
          return expect(typeof AWS.Request.prototype.promise).to.equal('function');
        });
        return it('will remove promise method if dependency is not a function', function() {
          var P;
          P = function() {};
          AWS.util.addPromises(AWS.Request, P);
          expect(typeof AWS.Request.prototype.promise).to.equal('function');
          AWS.util.addPromises(AWS.Request, null);
          return expect(typeof AWS.Request.prototype.promise).to.equal('undefined');
        });
      });
    }
    it('adds promises to supported constructors', function() {
      var P, constructors;
      constructors = [AWS.Request, AWS.S3.ManagedUpload, AWS.Credentials, AWS.CredentialProviderChain];
      P = function() {};
      AWS.util.addPromises(constructors, P);
      expect(typeof AWS.Request.prototype.promise).to.equal('function');
      expect(typeof AWS.S3.ManagedUpload.prototype.promise).to.equal('function');
      expect(typeof AWS.Credentials.prototype.getPromise).to.equal('function');
      expect(typeof AWS.Credentials.prototype.refreshPromise).to.equal('function');
      return expect(typeof AWS.CredentialProviderChain.prototype.resolvePromise).to.equal('function');
    });
    return it('deletes promises from all supported constructors when promise dependency is not a function', function() {
      var P, constructors;
      constructors = [AWS.Request, AWS.S3.ManagedUpload, AWS.Credentials, AWS.CredentialProviderChain];
      P = function() {};
      AWS.util.addPromises(constructors, P);
      AWS.util.addPromises(constructors, 'not a function');
      expect(AWS.Request.prototype.promise).to.be.undefined;
      expect(AWS.S3.ManagedUpload.prototype.promise).to.be.undefined;
      expect(AWS.Credentials.prototype.getPromise).to.be.undefined;
      expect(AWS.Credentials.prototype.refreshPromise).to.be.undefined;
      return expect(AWS.CredentialProviderChain.prototype.resolvePromise).to.be.undefined;
    });
  });

  describe('AWS.util.isDualstackAvailable', function() {
    var metadata;
    metadata = require('../apis/metadata.json');
    beforeEach(function() {
      return metadata.mock = {
        name: 'MockService'
      };
    });
    afterEach(function() {
      return delete metadata.mock;
    });
    if (AWS.util.isNode()) {
      it('accepts service identifier string as argument', function() {
        expect(AWS.util.isDualstackAvailable('mock')).to.be['false'];
        metadata.mock.dualstackAvailable = true;
        return expect(AWS.util.isDualstackAvailable('mock')).to.be['true'];
      });
      it('accepts service client instance as argument', function() {
        var service;
        service = new helpers.MockService();
        expect(AWS.util.isDualstackAvailable(service)).to.be['false'];
        metadata.mock.dualstackAvailable = true;
        return expect(AWS.util.isDualstackAvailable(service)).to.be['true'];
      });
      it('accepts service constructor as argument', function() {
        expect(AWS.util.isDualstackAvailable(helpers.MockService)).to.be['false'];
        metadata.mock.dualstackAvailable = true;
        return expect(AWS.util.isDualstackAvailable(helpers.MockService)).to.be['true'];
      });
    }
    return it('returns false if invalid service is given as argument', function() {
      expect(AWS.util.isDualstackAvailable(null)).to.be['false'];
      expect(AWS.util.isDualstackAvailable('invalid')).to.be['false'];
      return expect(AWS.util.isDualstackAvailable({})).to.be['false'];
    });
  });

  describe('AWS.util.calculateRetryDelay', function() {
    beforeEach(function() {
      return helpers.spyOn(Math, 'random').andReturn(1);
    });
    it('exponentially increases delay as retryCount increases', function() {
      var delay1, delay2, delay3;
      delay1 = AWS.util.calculateRetryDelay(1);
      delay2 = AWS.util.calculateRetryDelay(2);
      delay3 = AWS.util.calculateRetryDelay(3);
      expect(delay2).to.equal(delay1 * 2);
      return expect(delay3).to.equal(delay1 * 4);
    });
    it('has random jitter', function() {
      var delay1, delay2;
      delay1 = AWS.util.calculateRetryDelay(1);
      helpers.spyOn(Math, 'random').andReturn(0.5);
      delay2 = AWS.util.calculateRetryDelay(1);
      return expect(delay2).to.not.equal(delay1);
    });
    it('allows configuration of base delay', function() {
      var delay;
      delay = AWS.util.calculateRetryDelay(1, {
        base: 1000
      });
      return expect(delay).to.equal(2000);
    });
    return it('allows custom backoff function', function() {
      var customBackoff, delay;
      customBackoff = function(retryCount, err) {
        expect(err).to.exist;
        return 100 * Math.pow(3, retryCount);
      };
      delay = AWS.util.calculateRetryDelay(2, {
        customBackoff: customBackoff
      }, new Error('passed through to customBackoff'));
      return expect(delay).to.equal(900);
    });
  });

  describe('AWS.util.userAgent', function() {
    var environment;
    beforeEach(function() {
      environment = AWS.util.environment;
    });

    afterEach(function() {
      AWS.util.environment = environment;
    });

    it('should include an identifier for the browser SDK', function() {
      AWS.util.environment = 'js';
      return expect(AWS.util.userAgent()).to.match(/^aws-sdk-js/);
    });
    it('should include an identifier for the node SDK', function() {
      AWS.util.environment = 'nodejs';
      return expect(AWS.util.userAgent()).to.match(/^aws-sdk-nodejs/);
    });
    it('should include an identifier for the react-native SDK', function() {
      AWS.util.environment = 'js-react-native';
      return expect(AWS.util.userAgent()).to.match(/^aws-sdk-js-react-native/);
    });
    it('should include the current SDK version number', function() {
      return expect(AWS.util.userAgent()).to.have.string(AWS.VERSION);
    });
    return it('should include the engine when not running in a browser', function() {
      AWS.util.environment = 'nodejs';
      helpers.spyOn(AWS.util, 'engine').andReturn('ENGINE');
      return expect(AWS.util.userAgent()).to.match(/ENGINE$/);
    });
  });

  if (AWS.util.isNode()) {
    // These tests cannot run in the SDK's browser test runner due to the way in
    // which browserify exposes the `process` object. The AWS.util module gets
    // its own `process` object, which means the `process.nextTick` accessible
    // in this test's scope will not be called by `AWS.util.defer`.
    describe('AWS.util.defer', function() {
      var processNextTickDupe = typeof process === 'object' && typeof process.nextTick === 'function' ?
        process.nextTick : void 0;
      var setImmediateDupe = typeof setImmediate === 'function' ? setImmediate : void 0;

      afterEach(function() {
        if (typeof process === 'object') {
          process.nextTick = processNextTickDupe;
        }

        setImmediate = setImmediateDupe;
      });

      it('should use process.nextTick if available', function() {
        if (!processNextTickDupe) {
          this.skip();
        }

        var spy = helpers.spyOn(process, 'nextTick').andCallThrough();

        AWS.util.defer(function() {});

        expect(spy.calls.length).to.equal(1);
      });

      it('should fall back to setImmediate', function() {
        if (typeof process === 'object') {
          delete process.nextTick;
          process.nextTick = void 0;
        }
        var called = false;
        setImmediate = function() { called = true; };

        AWS.util.defer(function() {});
        if (typeof process === 'object') {
          process.nextTick = processNextTickDupe;
        }

        expect(called).to.be.true;
      });

      it('should prefer process.nextTick to setImmediate', function() {
        var spy = helpers.spyOn(process, 'nextTick').andCallThrough();
        var setImmediateCalled = false;
        setImmediate = function() { setImmediateCalled = true; };

        AWS.util.defer(function() {});

        expect(spy.calls.length).to.equal(1);
        expect(setImmediateCalled).to.be.false;
      });

      it('should fall back to setTimeout', function() {
        if (typeof process === 'object') {
          delete process.nextTick;
        }
        setImmediate = void 0;

        var topLevelScope = null;
        if (typeof global === 'object') {
          topLevelScope = global;
        } else if (typeof self === 'object') {
          topLevelScope = self;
        } else {
          topLevelScope = window;
        }
        var spy = helpers.spyOn(topLevelScope, 'setTimeout').andCallThrough();

        AWS.util.defer(function() {});
        if (typeof process === 'object') {
          process.nextTick = processNextTickDupe;
        }

        expect(spy.calls.length).to.equal(1);
      });

      it('should prefer setImmediate to setTimeout', function() {
        if (typeof process === 'object') {
          delete process.nextTick;
        }

        var setImmediateCalled = false;
        setImmediate = function() { setImmediateCalled = true; };
        var topLevelScope = null;
        if (typeof global === 'object') {
          topLevelScope = global;
        } else if (typeof self === 'object') {
          topLevelScope = self;
        } else {
          topLevelScope = window;
        }
        var spy = helpers.spyOn(topLevelScope, 'setTimeout').andCallThrough();

        AWS.util.defer(function() {});
        if (typeof process === 'object') {
          process.nextTick = processNextTickDupe;
        }

        expect(setImmediateCalled).to.be.true;
        expect(spy.calls.length).to.equal(0);
      });
    });
  }

  if (AWS.util.isNode()) {
    describe('AWS.util.engine', function() {
      it('should include the platform and version supplied by the global process variable', function() {
        var engine;
        engine = AWS.util.engine();
        expect(engine).to.match(new RegExp(process.platform));
        return expect(engine).to.match(new RegExp(process.version));
      });
      return it('should include the execution environment if supplied as an environment variable', function() {
        var previousValue;
        previousValue = process.env.AWS_EXECUTION_ENV;
        process.env.AWS_EXECUTION_ENV = 'Lambda';
        try {
          return expect(AWS.util.engine()).to.match(/exec-env\/Lambda$/);
        } finally {
          process.env.AWS_EXECUTION_ENV = previousValue;
        }
      });
    });

    describe('AWS.util.handleRequestWithRetries', function() {
      var app, getport, http, httpClient, httpRequest, options, sendRequest, server, spy;
      http = require('http');
      app = null;
      httpRequest = null;
      spy = null;
      options = null;
      httpClient = AWS.HttpClient.getInstance();
      sendRequest = function(cb) {
        return AWS.util.handleRequestWithRetries(httpRequest, options, cb);
      };
      getport = function(cb, startport) {
        var port, srv;
        port = startport || 45678;
        srv = require('net').createServer();
        srv.on('error', function() {
          return getport(cb, port + 1);
        });
        return srv.listen(port, function() {
          srv.once('close', function() {
            return cb(port);
          });
          return srv.close();
        });
      };
      server = http.createServer(function(req, resp) {
        return app(req, resp);
      });
      beforeEach(function(done) {
        httpRequest = new AWS.HttpRequest('http://127.0.0.1');
        options = {
          maxRetries: 2
        };
        spy = helpers.spyOn(httpClient, 'handleRequest').andCallThrough();
        return getport(function(port) {
          httpRequest.endpoint.port = port;
          server.listen(port);
          return done();
        });
      });
      afterEach(function() {
        return server.close();
      });
      it('does not retry if request is successful', function(done) {
        app = function(req, resp) {
          resp.write('FOOBAR');
          return resp.end();
        };
        return sendRequest(function(err, data) {
          expect(err).to.be['null'];
          expect(data).to.equal('FOOBAR');
          expect(spy.calls.length).to.equal(1);
          return done();
        });
      });
      it('retries for TimeoutError', function(done) {
        var forceTimeout;
        forceTimeout = true;
        helpers.spyOn(http.ClientRequest.prototype, 'setTimeout').andCallFake(function(timeout, cb) {
          if (forceTimeout) {
            process.nextTick(cb);
            return forceTimeout = false;
          }
        });
        app = function(req, resp) {
          resp.write('FOOBAR');
          return resp.end();
        };
        return sendRequest(function(err, data) {
          expect(err).to.be['null'];
          expect(data).to.equal('FOOBAR');
          expect(spy.calls.length).to.equal(2);
          return done();
        });
      });
      it('retries up to the maxRetries specified', function(done) {
        helpers.spyOn(http.ClientRequest.prototype, 'setTimeout').andCallFake(function(timeout, cb) {
          return process.nextTick(cb);
        });
        app = function(req, resp) {
          resp.write('FOOBAR');
          return resp.end();
        };
        return sendRequest(function(err, data) {
          expect(data).to.be.undefined;
          expect(err).to.not.be['null'];
          expect(err.code).to.equal('TimeoutError');
          expect(err.retryable).to.be['true'];
          expect(spy.calls.length).to.equal(options.maxRetries + 1);
          return done();
        });
      });
      it('retries errors with status code 5xx', function(done) {
        app = function(req, resp) {
          resp.writeHead(500, {});
          resp.write('FOOBAR');
          return resp.end();
        };
        return sendRequest(function(err, data) {
          expect(data).to.be.undefined;
          expect(err).to.not.be['null'];
          expect(err.retryable).to.be['true'];
          expect(spy.calls.length).to.equal(options.maxRetries + 1);
          return done();
        });
      });
      it('retries errors with status code 429', function(done) {
        app = function(req, resp) {
          resp.writeHead(429, {});
          resp.write('FOOBAR');
          return resp.end();
        };
        return sendRequest(function(err, data) {
          expect(data).to.be.undefined;
          expect(err).to.not.be['null'];
          expect(err.retryable).to.be['true'];
          expect(spy.calls.length).to.equal(options.maxRetries + 1);
          return done();
        });
      });
      it('does not retry non-retryable errors', function(done) {
        app = function(req, resp) {
          resp.writeHead(400, {});
          resp.write('FOOBAR');
          return resp.end();
        };
        return sendRequest(function(err, data) {
          expect(data).to.be.undefined;
          expect(err).to.not.be['null'];
          expect(err.retryable).to.be['false'];
          expect(spy.calls.length).to.equal(1);
          return done();
        });
      });
      it('retries errors with retryable set to true', function(done) {
        helpers.spyOn(AWS.util, 'error').andReturn({
          retryable: true
        });
        app = function(req, resp) {
          resp.writeHead(400, {});
          resp.write('FOOBAR');
          return resp.end();
        };
        return sendRequest(function(err, data) {
          expect(data).to.be.undefined;
          expect(err).to.not.be['null'];
          expect(err.retryable).to.be['true'];
          expect(spy.calls.length).to.equal(options.maxRetries + 1);
          return done();
        });
      });

      it('defaults to not retrying if maxRetries not specified', function(done) {
        helpers.spyOn(AWS.util, 'error').andReturn({
          retryable: true
        });
        app = function(req, resp) {
          resp.writeHead(400, {});
          resp.write('FOOBAR');
          return resp.end();
        };
        options = {};
        return sendRequest(function(err, data) {
          expect(data).to.be.undefined;
          expect(err).to.not.be['null'];
          expect(spy.calls.length).to.equal(1);
          return done();
        });
      });
      it('does not retry if customBackoff returns negative value', function(done) {
        helpers.spyOn(AWS.util, 'error').andReturn({
          retryable: true
        });
        options = {
          maxRetries: 2,
          retryDelayOptions: {
            customBackoff: function(retryCount, err) {
              return -1;
            },
          },
        };
        app = function(req, resp) {
          resp.writeHead(400, {});
          resp.write('FOOBAR');
          return resp.end();
        };
        return sendRequest(function(err, data) {
          expect(data).to.be.undefined;
          expect(err).to.not.be['null'];
          expect(err.retryable).to.be['true'];
          expect(spy.calls.length).to.not.equal(options.maxRetries + 1);
          expect(spy.calls.length).to.equal(1);
          return done();
        });
      });
      it('retries with custom backoff', function(done) {
        helpers.spyOn(AWS.util, 'error').andReturn({
          retryable: true
        });
        var topLevelScope = null;
        if (typeof global === 'object') {
          topLevelScope = global;
        } else if (typeof self === 'object') {
          topLevelScope = self;
        } else {
          topLevelScope = window;
        }
        var setTimeoutSpy = helpers.spyOn(topLevelScope, 'setTimeout').andCallFake(function (cb) {
          process.nextTick(cb);
        });
        options = {
          maxRetries: 2,
          retryDelayOptions: {
            customBackoff: function(retryCount, err) {
              return 2 * retryCount;
            },
          },
        };
        app = function(req, resp) {
          resp.writeHead(400, {});
          resp.write('FOOBAR');
          return resp.end();
        };
        return sendRequest(function(err, data) {
          expect(data).to.be.undefined;
          expect(err).to.not.be['null'];
          expect(err.retryable).to.be['true'];
          expect(setTimeoutSpy.calls.length).to.equal(options.maxRetries);
          expect(setTimeoutSpy.calls[0].arguments[1]).to.equal(0);
          expect(setTimeoutSpy.calls[1].arguments[1]).to.equal(2);
          return done();
        });
      });
    });
  }

  describe('AWS.utils.ARN', function() {
    describe('validate', function() {
      it('should validate whether input is a qualified resource ARN', function() {
        expect(AWS.util.ARN.validate('arn:aws:s3:us-west-2:123456789012:accesspoint:myendpoint')).to.equal(true);
        expect(AWS.util.ARN.validate('arn:aws:s3:us-east-1:123456789012:accesspoint:myendpoint')).to.equal(true);
        expect(AWS.util.ARN.validate('arn:aws-cn:s3:cn-north-1:123456789012:accesspoint:myendpoint')).to.equal(true);
        expect(AWS.util.ARN.validate('arn:aws:sns:us-west-2:123456789012:myTopic')).to.equal(true);
      });
    });

    describe('parser', function() {
      it('should parse valid resource ARNs', function() {
        expect(AWS.util.ARN.parse('arn:aws:s3:us-west-2:123456789012:accesspoint:myendpoint')).to.contain({
          partition: 'aws',
          service: 's3',
          region: 'us-west-2',
          accountId: '123456789012',
          resource: 'accesspoint:myendpoint'
        });
        expect(AWS.util.ARN.parse('arn:aws:s3:us-east-1:123456789012:accesspoint:myendpoint')).to.contain({
          partition: 'aws',
          service: 's3',
          region: 'us-east-1',
          accountId: '123456789012',
          resource: 'accesspoint:myendpoint'
        });
        expect(AWS.util.ARN.parse('arn:aws-cn:s3:cn-north-1:123456789012:accesspoint:myendpoint')).to.contain({
          partition: 'aws-cn',
          service: 's3',
          region: 'cn-north-1',
          accountId: '123456789012',
          resource: 'accesspoint:myendpoint'
        });
        expect(AWS.util.ARN.parse('arn:aws:sns:us-west-2:123456789012:myTopic')).to.contain({
          partition: 'aws',
          service: 'sns',
          region: 'us-west-2',
          accountId: '123456789012',
          resource: 'myTopic'
        });
      });
    });

    describe('builder', function() {
      it('should build valid ARN object to string', function() {
        expect(AWS.util.ARN.build({
          service: 's3',
          region: 'us-east-1',
          accountId: '123456789012',
          resource: 'accesspoint:myendpoint'
        })).to.equal('arn:aws:s3:us-east-1:123456789012:accesspoint:myendpoint');
      });

      it('should throw if required ARN component is missing', function(done) {
        try {
          AWS.util.ARN.build({
            service: 's3',
            region: 'us-east-1',
            resource: 'accesspoint:myendpoint'
          });
        } catch (e) {
          expect(e.message).to.equal('Input ARN object is invalid');
          done();
        }
      });
    });
  });

}).call(this);

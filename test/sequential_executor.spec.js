(function() {
  var AWS, helpers;

  helpers = require('./helpers');

  AWS = helpers.AWS;

  describe('AWS.SequentialExecutor', function() {

    beforeEach(function() {
      return this.emitter = new AWS.SequentialExecutor();
    });

    describe('on', function() {
      it('can add callback in designated order', function() {
        var list = [];
        var addToHead = true;
        this.emitter.on('event1', function() {
          list.push(1);
        });
        this.emitter.on('event1', function() {
          return list.push(2);
        }, addToHead);
        this.emitter.on('event1', function() {
          return list.push(3);
        }, addToHead);
        this.emitter.on('event1', function() {
          return list.push(4);
        });
        this.emitter.emit('event1');
        return expect(list).to.eql([3, 2, 1, 4]);
      });
    });

    describe('addListeners', function() {

      it('accepts a hash of events and functions', function() {
        var listeners, triggers;
        triggers = [0, 0, 0];
        listeners = {
          eventName: {
            ConstantName1: function() {
              return triggers[0] = 1;
            },
            ConstantName2: function() {
              return triggers[1] = 1;
            }
          },
          otherEventName: {
            ConstantName3: function() {
              return triggers[2] = 1;
            }
          }
        };
        this.emitter.addListeners(listeners);
        expect(triggers).to.eql([0, 0, 0]);
        this.emitter.emit('eventName');
        expect(triggers).to.eql([1, 1, 0]);
        this.emitter.emit('otherEventName');
        return expect(triggers).to.eql([1, 1, 1]);
      });

      it('accepts a SequentialExecutor object', function() {
        var listeners, triggers;
        triggers = [0, 0, 0];
        listeners = new AWS.SequentialExecutor();
        listeners.on('eventName', function() {
          return triggers[0] = 1;
        });
        listeners.on('eventName', function() {
          return triggers[1] = 1;
        });
        listeners.on('otherEventName', function() {
          return triggers[2] = 1;
        });
        this.emitter.addListeners(listeners);
        expect(triggers).to.eql([0, 0, 0]);
        this.emitter.emit('eventName');
        expect(triggers).to.eql([1, 1, 0]);
        this.emitter.emit('otherEventName');
        return expect(triggers).to.eql([1, 1, 1]);
      });
    });

    describe('addNamedListener', function() {

      it('defines a constant with the callback', function() {
        var spy;
        spy = helpers.createSpy();
        this.emitter.addNamedListener('CONSTNAME', 'eventName', spy);
        expect(this.emitter.CONSTNAME).to.equal(spy);
        this.emitter.emit('eventName', ['argument']);
        return expect(spy.calls[0]['arguments']).to.eql(['argument']);
      });

      it('is chainable', function() {
        var r;
        r = this.emitter.addNamedListener('CONSTNAME', 'eventName', function() {});
        return expect(r).to.equal(this.emitter);
      });

      it('can attach callbacks to head of callback array', function() {
        var list = [];
        var addToHead = true;
        this.emitter.addNamedListener('FUNCTION_1', 'event', function() {
          list.push(1);
        });
        this.emitter.addNamedListener('FUNCTION_2', 'event', function() {
          list.push(2);
        }, addToHead);
        this.emitter.addNamedListener('FUNCTION_3', 'event', function() {
          list.push(3);
        }, addToHead);
        this.emitter.addNamedListener('FUNCTION_4', 'event', function() {
          list.push(4);
        });
        this.emitter.addNamedAsyncListener('FUNCTION_5', 'event', function(done) {
          list.push(5);
          done();
        }, addToHead);
        this.emitter.emit('event', []);
        return expect(list).to.eql([5, 3, 2, 1, 4]);
      });
    });

    describe('addNamedListeners', function() {

      it('is chainable', function() {
        var r;
        r = this.emitter.addNamedListeners(function() {});
        return expect(r).to.equal(this.emitter);
      });

      it('provides an add function in callback to call addNamedListener', function() {
        var spy1, spy2;
        spy1 = helpers.createSpy();
        spy2 = helpers.createSpy();
        this.emitter.addNamedListeners(function(add) {
          add('CONST1', 'event1', spy1);
          return add('CONST2', 'event2', spy2);
        });
        expect(this.emitter.CONST1).to.equal(spy1);
        expect(this.emitter.CONST2).to.equal(spy2);
        this.emitter.emit('event1', ['arg1']);
        this.emitter.emit('event2', ['arg2']);
        expect(spy1.calls[0]['arguments']).to.eql(['arg1']);
        return expect(spy2.calls[0]['arguments']).to.eql(['arg2']);
      });
    });

    describe('emit', function() {

      it('emits to all listeners', function() {
        var list;
        list = [];
        this.emitter.on('event1', function() {
          return list.push(1);
        });
        this.emitter.on('event1', function() {
          return list.push(2);
        });
        this.emitter.on('event1', function() {
          return list.push(3);
        });
        this.emitter.emit('event1');
        return expect(list).to.eql([1, 2, 3]);
      });

      it('does not stop emitting when error is returned', function(done) {
        var list;
        list = [];
        this.emitter.on('event1', function() {
          return list.push(1);
        });
        this.emitter.on('event1', function() {
          list.push(2);
          throw 'error';
        });
        this.emitter.on('event1', function() {
          return list.push(3);
        });
        return this.emitter.emit('event1', [null], function(err) {
          expect(err.message).to.eql('error');
          expect(list).to.eql([1, 2, 3]);
          return done();
        });
      });

      it('does not stop emitting when error is returned (async)', function(done) {
        var list;
        list = [];
        this.emitter.on('event1', function() {
          return list.push(1);
        });
        this.emitter.onAsync('event1', function(err, done) {
          list.push(2);
          return done('ERROR');
        });
        this.emitter.on('event1', function() {
          return list.push(3);
        });
        return this.emitter.emit('event1', [null], function(err) {
          expect(err.message).to.equal('ERROR');
          expect(list).to.eql([1, 2, 3]);
          return done();
        });
      });
    });
  });

}).call(this);

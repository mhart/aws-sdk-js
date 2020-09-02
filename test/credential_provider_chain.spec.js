(function() {
  var AWS, helpers;

  helpers = require('./helpers');

  AWS = helpers.AWS;

  if (AWS.util.isNode()) {
    describe('AWS.CredentialProviderChain', function() {
      describe('resolve', function() {
        var chain = null;
        var defaultProviders = AWS.CredentialProviderChain.defaultProviders;
        var env;
        beforeEach(function(done) {
          env = process.env;
          process.env = {};
          chain = new AWS.CredentialProviderChain([
            function() {
              return new AWS.EnvironmentCredentials('AWS');
            }, function() {
              return new AWS.EnvironmentCredentials('AMAZON');
            }
          ]);
          return done();
        });
        afterEach(function() {
          AWS.CredentialProviderChain.defaultProviders = defaultProviders;
          process.env = env;
        });
        it('returns an error by default', function() {
          return chain.resolve(function(err) {
            return expect(err.message).to.equal('Variable AMAZON_ACCESS_KEY_ID not set.');
          });
        });
        it('returns AWS-prefixed credentials found in ENV', function() {
          process.env['AWS_ACCESS_KEY_ID'] = 'akid';
          process.env['AWS_SECRET_ACCESS_KEY'] = 'secret';
          process.env['AWS_SESSION_TOKEN'] = 'session';
          return chain.resolve(function(err, creds) {
            expect(creds.accessKeyId).to.equal('akid');
            expect(creds.secretAccessKey).to.equal('secret');
            return expect(creds.sessionToken).to.equal('session');
          });
        });
        it('returns AMAZON-prefixed credentials found in ENV', function() {
          process.env['AMAZON_ACCESS_KEY_ID'] = 'akid';
          process.env['AMAZON_SECRET_ACCESS_KEY'] = 'secret';
          process.env['AMAZON_SESSION_TOKEN'] = 'session';
          return chain.resolve(function(err, creds) {
            expect(creds.accessKeyId).to.equal('akid');
            expect(creds.secretAccessKey).to.equal('secret');
            return expect(creds.sessionToken).to.equal('session');
          });
        });
        it('should be able to resolve credentials synchronously', function() {
          process.env['AMAZON_ACCESS_KEY_ID'] = 'akid';
          process.env['AMAZON_SECRET_ACCESS_KEY'] = 'secret';
          process.env['AMAZON_SESSION_TOKEN'] = 'session';
          var credentials = null;
          chain.resolve(function(err, creds) {
            credentials = creds;
          });
          expect(credentials.accessKeyId).to.equal('akid');
          expect(credentials.secretAccessKey).to.equal('secret');
          expect(credentials.sessionToken).to.equal('session');
        });
        it('prefers AWS credentials to AMAZON credentials', function() {
          process.env['AWS_ACCESS_KEY_ID'] = 'akid';
          process.env['AWS_SECRET_ACCESS_KEY'] = 'secret';
          process.env['AWS_SESSION_TOKEN'] = 'session';
          process.env['AMAZON_ACCESS_KEY_ID'] = 'akid2';
          process.env['AMAZON_SECRET_ACCESS_KEY'] = 'secret2';
          process.env['AMAZON_SESSION_TOKEN'] = 'session2';
          return chain.resolve(function(err, creds) {
            expect(creds.accessKeyId).to.equal('akid');
            expect(creds.secretAccessKey).to.equal('secret');
            return expect(creds.sessionToken).to.equal('session');
          });
        });
        it('uses the defaultProviders property on the constructor', function() {
          AWS.CredentialProviderChain.defaultProviders = [];
          process.env['AWS_ACCESS_KEY_ID'] = 'akid';
          process.env['AWS_SECRET_ACCESS_KEY'] = 'secret';
          process.env['AWS_SESSION_TOKEN'] = 'session';
          chain = new AWS.CredentialProviderChain();
          return chain.resolve(function(err) {
            return expect(err.message).to.equal('No providers');
          });
        });
        it('calls resolve on each provider in the chain, stopping for akid', function() {
          var staticCreds;
          staticCreds = {
            accessKeyId: 'abc',
            secretAccessKey: 'xyz'
          };
          chain = new AWS.CredentialProviderChain([staticCreds]);
          return chain.resolve(function(err, creds) {
            expect(creds.accessKeyId).to.equal('abc');
            expect(creds.secretAccessKey).to.equal('xyz');
            return expect(creds.sessionToken).to.equal(void 0);
          });
        });
        it('accepts providers as functions, evaluating them during resolution', function() {
          var provider;
          provider = function() {
            return {
              accessKeyId: 'abc',
              secretAccessKey: 'xyz'
            };
          };
          chain = new AWS.CredentialProviderChain([provider]);
          return chain.resolve(function(err, creds) {
            expect(creds.accessKeyId).to.equal('abc');
            expect(creds.secretAccessKey).to.equal('xyz');
            return expect(creds.sessionToken).to.equal(void 0);
          });
        });
        it('coalesces concurrent calls', function (done) {
          var provderCalls = 0;
          var getCalls = 0;
          var credsInstance = {
            get: function get(callback) {
              getCalls++;
              setImmediate(function () {
                this.accessKeyId = 'abc';
                this.secretAccessKey = 'xyz';
                callback();
              });
            }
          };
          var provider = function () {
            provderCalls++;
            return credsInstance;
          };
          var count = 10;
          var callbackCount = 0;
          var chain = new AWS.CredentialProviderChain([provider]);
          for (var i = 0; i < count; i++) {
            chain.resolve(function (err, creds) {
              if (++callbackCount === count) {
                expect(provderCalls).to.equal(1);
                expect(getCalls).to.equal(1);
                expect(creds).to.equal(credsInstance);
                done();
              }
            });
          }
        });
      });
      if (typeof Promise === 'function') {
        return describe('resolvePromise', function() {
          var catchFunction, chain, creds, err, forceError, mockProvider, ref, thenFunction;
          ref = [], err = ref[0], creds = ref[1], chain = ref[2], forceError = ref[3];
          thenFunction = function(c) {
            return creds = c;
          };
          catchFunction = function(e) {
            return err = e;
          };
          mockProvider = function() {
            var provider;
            provider = new helpers.MockCredentialsProvider();
            if (forceError) {
              provider.forceRefreshError = true;
            }
            return provider;
          };
          beforeEach(function() {
            return AWS.config.setPromisesDependency();
          });
          beforeEach(function() {
            err = null;
            creds = null;
            return chain = new AWS.CredentialProviderChain([mockProvider]);
          });
          it('resolves when creds successfully retrieved from a provider in the chain', function() {
            forceError = false;
            return chain.resolvePromise().then(thenFunction)['catch'](catchFunction).then(function() {
              expect(err).to.be['null'];
              expect(creds).to.not.be['null'];
              expect(creds.accessKeyId).to.equal('akid');
              return expect(creds.secretAccessKey).to.equal('secret');
            });
          });
          return it('rejects when all providers in chain return an error', function() {
            forceError = true;
            return chain.resolvePromise().then(thenFunction)['catch'](catchFunction).then(function() {
              expect(err).to.not.be['null'];
              expect(err.code).to.equal('MockCredentialsProviderFailure');
              return expect(creds).to.be['null'];
            });
          });
        });
      }
    });
  }

}).call(this);

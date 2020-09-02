(function() {
  var AWS, STS, helpers, validateCredentials;

  helpers = require('./helpers');

  AWS = helpers.AWS;

  STS = require('../clients/sts');

  var iniLoader = AWS.util.iniLoader;

  validateCredentials = function(creds, key, secret, session) {
    expect(creds.accessKeyId).to.equal(key || 'akid');
    expect(creds.secretAccessKey).to.equal(secret || 'secret');
    return expect(creds.sessionToken).to.equal(session || 'session');
  };

  describe('AWS.Credentials', function() {
    describe('constructor', function() {
      it('should allow setting of credentials with keys', function() {
        var config;
        config = new AWS.Config({
          accessKeyId: 'akid',
          secretAccessKey: 'secret',
          sessionToken: 'session'
        });
        return validateCredentials(config.credentials);
      });
      it('should allow setting of credentials as object', function() {
        var creds;
        creds = {
          accessKeyId: 'akid',
          secretAccessKey: 'secret',
          sessionToken: 'session'
        };
        return validateCredentials(new AWS.Credentials(creds));
      });
      return it('defaults credentials to undefined when not passed', function() {
        var creds;
        creds = new AWS.Credentials();
        expect(creds.accessKeyId).to.equal(void 0);
        expect(creds.secretAccessKey).to.equal(void 0);
        return expect(creds.sessionToken).to.equal(void 0);
      });
    });
    describe('needsRefresh', function() {
      it('needs refresh if credentials are not set', function() {
        var creds;
        creds = new AWS.Credentials();
        expect(creds.needsRefresh()).to.equal(true);
        creds = new AWS.Credentials('akid');
        return expect(creds.needsRefresh()).to.equal(true);
      });
      it('does not need refresh if credentials are set', function() {
        var creds;
        creds = new AWS.Credentials('akid', 'secret');
        return expect(creds.needsRefresh()).to.equal(false);
      });
      it('needs refresh if creds are expired', function() {
        var creds;
        creds = new AWS.Credentials('akid', 'secret');
        creds.expired = true;
        return expect(creds.needsRefresh()).to.equal(true);
      });
      it('can be expired based on expireTime', function() {
        var creds;
        creds = new AWS.Credentials('akid', 'secret');
        creds.expired = false;
        creds.expireTime = new Date(0);
        return expect(creds.needsRefresh()).to.equal(true);
      });
      it('needs refresh if expireTime is within expiryWindow secs from now', function() {
        var creds;
        creds = new AWS.Credentials('akid', 'secret');
        creds.expired = false;
        creds.expireTime = new Date(AWS.util.date.getDate().getTime() + 1000);
        return expect(creds.needsRefresh()).to.equal(true);
      });
      return it('does not need refresh if expireTime outside expiryWindow', function() {
        var creds, ms;
        creds = new AWS.Credentials('akid', 'secret');
        creds.expired = false;
        ms = AWS.util.date.getDate().getTime() + (creds.expiryWindow + 5) * 1000;
        creds.expireTime = new Date(ms);
        return expect(creds.needsRefresh()).to.equal(false);
      });
    });
    return describe('get', function() {
      it('does not call refresh if not needsRefresh', function() {
        var creds, refresh, spy;
        spy = helpers.createSpy('done callback');
        creds = new AWS.Credentials('akid', 'secret');
        refresh = helpers.spyOn(creds, 'refresh');
        creds.get(spy);
        expect(refresh.calls.length).to.equal(0);
        expect(spy.calls.length).not.to.equal(0);
        expect(spy.calls[0]['arguments'][0]).not.to.exist;
        return expect(creds.expired).to.equal(false);
      });
      return it('calls refresh only if needsRefresh', function() {
        var creds, refresh, spy;
        spy = helpers.createSpy('done callback');
        creds = new AWS.Credentials('akid', 'secret');
        creds.expired = true;
        refresh = helpers.spyOn(creds, 'refresh').andCallThrough();
        creds.get(spy);
        expect(refresh.calls.length).not.to.equal(0);
        expect(spy.calls.length).not.to.equal(0);
        expect(spy.calls[0]['arguments'][0]).not.to.exist;
        return expect(creds.expired).to.equal(false);
      });
    });
  });

  describe('refreshable credentials', function() {
    AWS.util.arrayEach(
      [
        'CognitoIdentityCredentials',
        'ChainableTemporaryCredentials',
        'TemporaryCredentials',
        'EC2MetadataCredentials',
        'ECSCredentials',
        'RemoteCredentials',
        'SAMLCredentials',
        'SharedIniFileCredentials',
        'ProcessCredentials',
        'WebIdentityCredentials'
      ],
      function(credClass) {
        if (credClass in AWS) {
          it(credClass + ' coalesces concurrent calls',
            function (done) {
              var callCount = 10;
              var callbackCount = 0;
              var creds = new AWS[credClass]({});
              var loadSpy = helpers.spyOn(creds, 'load').andCallFake(
                function(callback) {
                  setImmediate(function () { callback(null); });
                }
              );
              expect(creds.refreshCallbacks.length).to.equal(0);
              for (var i = 0; i < callCount; i++) {
                creds.refresh(function () {
                  expect(creds.refreshCallbacks.length).to.equal(0);
                  if (++callbackCount === callCount) {
                    expect(loadSpy.calls.length).to.equal(1);
                    done();
                  }
                });
              }
            }
          );
        }
      }
    );
  });

  if (AWS.util.isNode()) {
    describe('AWS.EnvironmentCredentials', function() {
      var env;
      afterEach(function() {
        process.env = env;
      });
      beforeEach(function(done) {
        env = process.env;
        process.env = {};
        return done();
      });
      describe('constructor', function() {
        it('should be able to read credentials from env with a prefix', function() {
          var creds;
          process.env.AWS_ACCESS_KEY_ID = 'akid';
          process.env.AWS_SECRET_ACCESS_KEY = 'secret';
          process.env.AWS_SESSION_TOKEN = 'session';
          creds = new AWS.EnvironmentCredentials('AWS');
          return validateCredentials(creds);
        });
        return it('should be able to read credentials from env without a prefix', function() {
          var creds;
          process.env.ACCESS_KEY_ID = 'akid';
          process.env.SECRET_ACCESS_KEY = 'secret';
          process.env.SESSION_TOKEN = 'session';
          creds = new AWS.EnvironmentCredentials();
          return validateCredentials(creds);
        });
      });
      return describe('refresh', function() {
        return it('can refresh credentials', function() {
          var creds;
          process.env.AWS_ACCESS_KEY_ID = 'akid';
          process.env.AWS_SECRET_ACCESS_KEY = 'secret';
          creds = new AWS.EnvironmentCredentials('AWS');
          expect(creds.accessKeyId).to.equal('akid');
          creds.accessKeyId = 'not_akid';
          expect(creds.accessKeyId).not.to.equal('akid');
          creds.refresh();
          return expect(creds.accessKeyId).to.equal('akid');
        });
      });
    });
    describe('AWS.FileSystemCredentials', function() {
      describe('constructor', function() {
        it('should accept filename and load credentials from root doc', function() {
          var creds, mock;
          mock = '{"accessKeyId":"akid", "secretAccessKey":"secret","sessionToken":"session"}';
          helpers.spyOn(AWS.util, 'readFileSync').andReturn(mock);
          creds = new AWS.FileSystemCredentials('foo');
          return validateCredentials(creds);
        });
        return it('should accept filename and load credentials from credentials block', function() {
          var creds, mock, spy;
          mock = '{"credentials":{"accessKeyId":"akid", "secretAccessKey":"secret","sessionToken":"session"}}';
          spy = helpers.spyOn(AWS.util, 'readFileSync').andReturn(mock);
          creds = new AWS.FileSystemCredentials('foo');
          return validateCredentials(creds);
        });
      });
      return describe('refresh', function() {
        it('should refresh from given filename', function() {
          var creds, mock;
          mock = '{"credentials":{"accessKeyId":"RELOADED", "secretAccessKey":"RELOADED","sessionToken":"RELOADED"}}';
          helpers.spyOn(AWS.util, 'readFileSync').andReturn(mock);
          creds = new AWS.FileSystemCredentials('foo');
          return validateCredentials(creds, 'RELOADED', 'RELOADED', 'RELOADED');
        });
        return it('fails if credentials are not in the file', function() {
          var mock;
          mock = '{"credentials":{}}';
          helpers.spyOn(AWS.util, 'readFileSync').andReturn(mock);
          new AWS.FileSystemCredentials('foo').refresh(function(err) {
            return expect(err.message).to.equal('Credentials not set in foo');
          });
          return expect(function() {
            return new AWS.FileSystemCredentials('foo').refresh();
          }).to['throw']('Credentials not set in foo');
        });
      });
    });
    describe('AWS.SharedIniFileCredentials', function() {
      var os = require('os');
      var homedir = os.homedir;
      var env;
      afterEach(function() {
        process.env = env;
      });
      beforeEach(function() {
        env = process.env;
        process.env = {};
        delete os.homedir;
      });
      afterEach(function() {
        iniLoader.clearCachedFiles();
        os.homedir = homedir;
      });
      describe('constructor', function() {
        beforeEach(function() {
          var mock;
          mock = '[default]\naws_access_key_id = akid\naws_secret_access_key = secret\naws_session_token = session';
          return helpers.spyOn(AWS.util, 'readFileSync').andReturn(mock);
        });
        it('should use os.homedir if available', function() {
          helpers.spyOn(os, 'homedir').andReturn('/foo/bar/baz');
          new AWS.SharedIniFileCredentials();
          expect(os.homedir.calls.length).to.equal(1);
          expect(AWS.util.readFileSync.calls.length).to.equal(1);
          return expect(AWS.util.readFileSync.calls[0]['arguments'][0]).to.match(/[\/\\]foo[\/\\]bar[\/\\]baz[\/\\].aws[\/\\]credentials/);
        });
        it('should prefer $HOME to os.homedir', function() {
          process.env.HOME = '/home/user';
          helpers.spyOn(os, 'homedir').andReturn(process.env.HOME + '/foo/bar');

          new AWS.SharedIniFileCredentials();
          expect(os.homedir.calls.length).to.equal(0);
          expect(AWS.util.readFileSync.calls.length).to.equal(1);
          return expect(AWS.util.readFileSync.calls[0].arguments[0]).to
            .match(/[\/\\]home[\/\\]user[\/\\].aws[\/\\]credentials/);
        });
        it('passes an error to callback if HOME/HOMEPATH/USERPROFILE are not set', function(done) {
          new AWS.SharedIniFileCredentials({
            callback: function (err) {
              expect(err).to.be.instanceof(Error);
              expect(err.message).to.equal('Cannot load credentials, HOME path not set');
              done();
            }
          });
        });
        it('uses HOMEDRIVE\\HOMEPATH if HOME and USERPROFILE are not set', function() {
          var creds;
          process.env.HOMEDRIVE = 'd:/';
          process.env.HOMEPATH = 'homepath';
          creds = new AWS.SharedIniFileCredentials();
          creds.get();
          expect(AWS.util.readFileSync.calls.length).to.equal(1);
          return expect(AWS.util.readFileSync.calls[0]['arguments'][0]).to.match(/d:[\/\\]homepath[\/\\].aws[\/\\]credentials/);
        });
        it('uses default HOMEDRIVE of C:/', function() {
          var creds;
          process.env.HOMEPATH = 'homepath';
          creds = new AWS.SharedIniFileCredentials();
          creds.get();
          expect(AWS.util.readFileSync.calls.length).to.equal(1);
          return expect(AWS.util.readFileSync.calls[0]['arguments'][0]).to.match(/C:[\/\\]homepath[\/\\].aws[\/\\]credentials/);
        });
        it('uses USERPROFILE if HOME is not set', function() {
          var creds;
          process.env.USERPROFILE = '/userprofile';
          creds = new AWS.SharedIniFileCredentials();
          creds.get();
          expect(AWS.util.readFileSync.calls.length).to.equal(1);
          return expect(AWS.util.readFileSync.calls[0]['arguments'][0]).to.match(/[\/\\]userprofile[\/\\].aws[\/\\]credentials/);
        });
        return it('can override filename as a constructor argument', function() {
          var creds;
          creds = new AWS.SharedIniFileCredentials({
            filename: '/etc/creds'
          });
          creds.get();
          expect(AWS.util.readFileSync.calls.length).to.equal(1);
          return expect(AWS.util.readFileSync.calls[0]['arguments'][0]).to.equal('/etc/creds');
        });
      });
      describe('loading', function() {
        beforeEach(function() {
          process.env.HOME = '/home/user';
        });
        afterEach(function() {
          iniLoader.clearCachedFiles();
        });
        it('loads credentials from ~/.aws/credentials using default profile', function() {
          var creds, mock;
          mock = '[default]\naws_access_key_id = akid\naws_secret_access_key = secret\naws_session_token = session';
          helpers.spyOn(AWS.util, 'readFileSync').andReturn(mock);
          creds = new AWS.SharedIniFileCredentials();
          creds.get();
          validateCredentials(creds);
          return expect(AWS.util.readFileSync.calls[0]['arguments'][0]).to.match(/[\/\\]home[\/\\]user[\/\\].aws[\/\\]credentials/);
        });
        it('loads credentials from path defined in AWS_SHARED_CREDENTIALS_FILE if AWS_SDK_LOAD_CONFIG is set', function() {
          var creds, mock;
          process.env.AWS_SDK_LOAD_CONFIG = '1';
          process.env.AWS_SHARED_CREDENTIALS_FILE = '/path/to/aws/credentials';
          mock = '[default]\naws_access_key_id = akid\naws_secret_access_key = secret\naws_session_token = session';
          helpers.spyOn(AWS.util, 'readFileSync').andReturn(mock);
          creds = new AWS.SharedIniFileCredentials();
          creds.get();
          validateCredentials(creds);
          expect(AWS.util.readFileSync.calls[0]['arguments'][0]).to.match(/[\/\\]home[\/\\]user[\/\\].aws[\/\\]config/);
          return expect(AWS.util.readFileSync.calls[1]['arguments'][0]).to.equal(process.env.AWS_SHARED_CREDENTIALS_FILE);
        });
        it('loads credentials from ~/.aws/config if AWS_SDK_LOAD_CONFIG is set', function() {
          var creds, mock;
          process.env.AWS_SDK_LOAD_CONFIG = '1';
          mock = '[default]\naws_access_key_id = akid\naws_secret_access_key = secret\naws_session_token = session';
          helpers.spyOn(AWS.util, 'readFileSync').andReturn(mock);
          creds = new AWS.SharedIniFileCredentials();
          creds.get();
          validateCredentials(creds);
          return expect(AWS.util.readFileSync.calls[0]['arguments'][0]).to.match(/[\/\\]home[\/\\]user[\/\\].aws[\/\\]config/);
        });
        it('prefers credentials from ~/.aws/credentials if AWS_SDK_LOAD_CONFIG is set', function() {
          var creds;
          process.env.AWS_SDK_LOAD_CONFIG = '1';
          helpers.spyOn(AWS.util, 'readFileSync').andCallFake(function(path) {
            if (path.match(/[\/\\]home[\/\\]user[\/\\].aws[\/\\]credentials/)) {
              return '[default]\naws_access_key_id = akid\naws_secret_access_key = secret\naws_session_token = session';
            } else {
              return '[default]\naws_access_key_id = AKIAIOSFODNN7EXAMPLE\naws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
            }
          });
          creds = new AWS.SharedIniFileCredentials();
          creds.get();
          validateCredentials(creds);
          expect(creds.accessKeyId).to.equal('akid');
          expect(creds.secretAccessKey).to.equal('secret');
          return expect(creds.sessionToken).to.equal('session');
        });
        it('will not merge profiles across the config and credentials file', function() {
          var creds;
          process.env.AWS_SDK_LOAD_CONFIG = '1';
          helpers.spyOn(AWS.util, 'readFileSync').andCallFake(function(path) {
            if (path.match(/[\/\\]home[\/\\]user[\/\\].aws[\/\\]credentials/)) {
              return '[default]\naws_access_key_id = AKIAIOSFODNN7EXAMPLE';
            } else {
              return '[default]\naws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
            }
          });
          creds = new AWS.SharedIniFileCredentials();
          return creds.get(function(err, data) {
            return expect(err).to.be.defined;
          });
        });
        it('loads credentials from ~/.aws/credentials if AWS_SDK_LOAD_CONFIG is not set', function() {
          var creds, mock;
          process.env.AWS_SHARED_CREDENTIALS_FILE = '/path/to/aws/credentials';
          mock = '[default]\naws_access_key_id = akid\naws_secret_access_key = secret\naws_session_token = session';
          helpers.spyOn(AWS.util, 'readFileSync').andReturn(mock);
          creds = new AWS.SharedIniFileCredentials();
          creds.get();
          validateCredentials(creds);
          return expect(AWS.util.readFileSync.calls[0]['arguments'][0]).to.match(/[\/\\]home[\/\\]user[\/\\].aws[\/\\]credentials/);
        });
        it('loads the default profile if AWS_PROFILE is empty', function() {
          var creds, mock;
          process.env.AWS_PROFILE = '';
          mock = '[default]\naws_access_key_id = akid\naws_secret_access_key = secret\naws_session_token = session';
          helpers.spyOn(AWS.util, 'readFileSync').andReturn(mock);
          creds = new AWS.SharedIniFileCredentials();
          creds.get();
          return validateCredentials(creds);
        });
        it('accepts a profile name parameter', function() {
          var creds, mock, spy;
          mock = '[foo]\naws_access_key_id = akid\naws_secret_access_key = secret\naws_session_token = session';
          spy = helpers.spyOn(AWS.util, 'readFileSync').andReturn(mock);
          creds = new AWS.SharedIniFileCredentials({
            profile: 'foo'
          });
          creds.get();
          return validateCredentials(creds);
        });
        it('sets profile based on ENV', function() {
          var creds, mock;
          process.env.AWS_PROFILE = 'foo';
          mock = '[foo]\naws_access_key_id = akid\naws_secret_access_key = secret\naws_session_token = session';
          helpers.spyOn(AWS.util, 'readFileSync').andReturn(mock);
          creds = new AWS.SharedIniFileCredentials();
          creds.get();
          return validateCredentials(creds);
        });
        return it('accepts a loads config profiles from name parameter', function() {
          var creds, mock;
          process.env.AWS_SDK_LOAD_CONFIG = '1';
          mock = '[profile foo]\naws_access_key_id = akid\naws_secret_access_key = secret\naws_session_token = session';
          helpers.spyOn(AWS.util, 'readFileSync').andReturn(mock);
          creds = new AWS.SharedIniFileCredentials({
            profile: 'foo'
          });
          creds.get();
          return validateCredentials(creds);
        });
      });
      describe('refresh', function() {
        var origEnv = process.env;
        beforeEach(function() {
          process.env = {};
        });
        afterEach(function() {
          process.env = origEnv;
          iniLoader.clearCachedFiles();
        });
        it('should refresh from disk', function() {
          var creds, mock;
          process.env.HOME = '/home/user';
          mock = '[default]\naws_access_key_id = RELOADED\naws_secret_access_key = RELOADED\naws_session_token = RELOADED';
          helpers.spyOn(AWS.util, 'readFileSync').andReturn(mock);
          creds = new AWS.SharedIniFileCredentials();
          creds.get();
          return validateCredentials(creds, 'RELOADED', 'RELOADED', 'RELOADED');
        });
        return it('fails if credentials are not in the file', function(done) {
          var mock = '';
          process.env.HOME = '/home/user';
          helpers.spyOn(AWS.util, 'readFileSync').andReturn(mock);
          new AWS.SharedIniFileCredentials().refresh(function(err) {
            expect(err.message).to.match(/^Profile default not found/);
            done();
          });
        });
      });
    });
    describe('AWS.ProcessCredentials', function() {
      var os = require('os');
      var homedir = os.homedir;
      var env;
      afterEach(function() {
        process.env = env;
      });
      beforeEach(function() {
        env = process.env;
        process.env = {};
        delete os.homedir;
      });
      afterEach(function() {
        iniLoader.clearCachedFiles();
        os.homedir = homedir;
      });
      describe('constructor', function() {
        beforeEach(function() {
          var mock;
          mock = '[default]\naws_access_key_id = akid\naws_secret_access_key = secret\naws_session_token = session';
          return helpers.spyOn(AWS.util, 'readFileSync').andReturn(mock);
        });
        it('should use os.homedir if available', function() {
          helpers.spyOn(os, 'homedir').andReturn('/foo/bar/baz');
          new AWS.ProcessCredentials();
          expect(os.homedir.calls.length).to.equal(1);
          expect(AWS.util.readFileSync.calls.length).to.equal(1);
          return expect(AWS.util.readFileSync.calls[0]['arguments'][0]).to.match(/[\/\\]foo[\/\\]bar[\/\\]baz[\/\\].aws[\/\\]credentials/);
        });
        it('should prefer $HOME to os.homedir', function() {
          process.env.HOME = '/home/user';
          helpers.spyOn(os, 'homedir').andReturn(process.env.HOME + '/foo/bar');

          new AWS.ProcessCredentials();
          expect(os.homedir.calls.length).to.equal(0);
          expect(AWS.util.readFileSync.calls.length).to.equal(1);
          return expect(AWS.util.readFileSync.calls[0].arguments[0]).to
            .match(/[\/\\]home[\/\\]user[\/\\].aws[\/\\]credentials/);
        });
        it('passes an error to callback if HOME/HOMEPATH/USERPROFILE are not set', function(done) {
          new AWS.ProcessCredentials({
            callback: function (err) {
              expect(err).to.be.instanceof(Error);
              expect(err.message).to.equal('Cannot load credentials, HOME path not set');
              done();
            }
          });
        });
        it('uses HOMEDRIVE\\HOMEPATH if HOME and USERPROFILE are not set', function() {
          var creds;
          process.env.HOMEDRIVE = 'd:/';
          process.env.HOMEPATH = 'homepath';
          creds = new AWS.ProcessCredentials();
          creds.get();
          expect(AWS.util.readFileSync.calls.length).to.equal(2);
          return expect(AWS.util.readFileSync.calls[0]['arguments'][0]).to.match(/d:[\/\\]homepath[\/\\].aws[\/\\]credentials/);
        });
        it('uses default HOMEDRIVE of C:/', function() {
          var creds;
          process.env.HOMEPATH = 'homepath';
          creds = new AWS.ProcessCredentials();
          creds.get();
          expect(AWS.util.readFileSync.calls.length).to.equal(2);
          return expect(AWS.util.readFileSync.calls[0]['arguments'][0]).to.match(/C:[\/\\]homepath[\/\\].aws[\/\\]credentials/);
        });
        it('uses USERPROFILE if HOME is not set', function() {
          var creds;
          process.env.USERPROFILE = '/userprofile';
          creds = new AWS.ProcessCredentials();
          creds.get();
          expect(AWS.util.readFileSync.calls.length).to.equal(2);
          return expect(AWS.util.readFileSync.calls[0]['arguments'][0]).to.match(/[\/\\]userprofile[\/\\].aws[\/\\]credentials/);
        });
        return it('can override filename as a constructor argument', function() {
          var creds;
          creds = new AWS.ProcessCredentials({
            filename: '/etc/creds'
          });
          creds.get();
          expect(AWS.util.readFileSync.calls.length).to.equal(2);
          return expect(AWS.util.readFileSync.calls[0]['arguments'][0]).to.equal('/etc/creds');
        });
      });
      describe('loading', function() {
        beforeEach(function() {
          process.env.HOME = '/home/user';
          var child_process = require('child_process');
          var mockConfig, mockProcess, creds;
          mockConfig = '[default]\ncredential_process=federated_cli_mock';
          helpers.spyOn(AWS.util, 'readFileSync').andReturn(mockConfig);
          mockProcess = '{"Version": 1,"AccessKeyId": "akid","SecretAccessKey": "secret","SessionToken": "session","Expiration": ""}';
          helpers.spyOn(child_process, 'exec').andCallFake(function (_, cb) {
            cb(undefined, mockProcess, undefined);
          });
        });
        afterEach(function() {
          iniLoader.clearCachedFiles();
        });
        it('loads successfully using default profile', function(done) {
          creds = new AWS.ProcessCredentials();
          creds.refresh(function(err) {
            expect(creds.accessKeyId).to.equal('akid');
            expect(creds.secretAccessKey).to.equal('secret');
            expect(creds.sessionToken).to.equal('session');
            expect(creds.expireTime).to.be.null;
            done();
          });
        });
        it('loads successfully using named profile', function(done) {
          mockConfig = '[foo]\ncredential_process=federated_cli_mock';
          helpers.spyOn(AWS.util, 'readFileSync').andReturn(mockConfig);
          creds = new AWS.ProcessCredentials({profile: 'foo'});
          creds.refresh(function(err) {
            expect(creds.accessKeyId).to.equal('akid');
            expect(creds.secretAccessKey).to.equal('secret');
            expect(creds.sessionToken).to.equal('session');
            expect(creds.expireTime).to.be.null;
            done();
          });
        });
        it('throws error if version is not 1', function(done) {
          var child_process = require('child_process');
          mockProcess = '{"Version": 2,"AccessKeyId": "xxx","SecretAccessKey": "yyy","SessionToken": "zzz","Expiration": ""}';
          helpers.spyOn(child_process, 'exec').andCallFake(function (_, cb) {
            cb(undefined, mockProcess, undefined);
          });
          var creds = new AWS.ProcessCredentials();
          creds.refresh(function(err) {
            expect(err).to.exist;
            expect(err.message).to.match(/^credential_process does not return Version == 1/);
            done();
          });
        });
        it('throws error if credentials are expired', function(done) {
          var child_process = require('child_process');
          var expired;
          expired = AWS.util.date.iso8601(new Date(0));
          mockProcess = '{"Version": 1,"AccessKeyId": "xxx","SecretAccessKey": "yyy","SessionToken": "zzz","Expiration": "' + expired +'"}';
          helpers.spyOn(child_process, 'exec').andCallFake(function (_, cb) {
            cb(undefined, mockProcess, undefined);
          });
          var creds = new AWS.ProcessCredentials();
          creds.refresh(function(err) {
            expect(err.message).to.eql('credential_process returned expired credentials');
            expect(err).to.not.be.null;
            done();
          });
        });
        it('thorws error if an error is returned', function(done) {
          var child_process = require('child_process');
          var mockErr;
          mockErr = 'foo Error';
          helpers.spyOn(child_process, 'exec').andCallFake(function (_, cb) {
            cb(mockErr, undefined, undefined);
          });
          var creds = new AWS.ProcessCredentials();
          creds.refresh(function(err) {
            expect(err.message).to.eql('credential_process returned error');
            expect(creds.accessKeyId).to.be.undefined;
            done();
          });
        });
        it('sets expireTime if an expiration is included', function(done) {
          var child_process = require('child_process');
          var futureExpiration;
          futureExpiration = AWS.util.date.unixTimestamp() + 900;
          futureExpiration = AWS.util.date.iso8601(new Date(futureExpiration * 1000));
          mockProcess = '{"Version": 1,"AccessKeyId": "akid","SecretAccessKey": "secret","SessionToken": "session","Expiration": "' + futureExpiration + '"}';
          helpers.spyOn(child_process, 'exec').andCallFake(function (_, cb) {
            cb(undefined, mockProcess, undefined);
          });
          creds = new AWS.ProcessCredentials();
          creds.refresh(function(err) {
            expect(creds.expireTime).to.eql(AWS.util.date.from(futureExpiration));
            done();
          });
        });
        return it('does not set expireTime if expiration is empty', function(done) {
          var child_process = require('child_process');
          creds = new AWS.ProcessCredentials({ profile: 'foo' });
          creds.get();
          creds.refresh(function(err) {
            expect(creds.expireTime).to.be.null;
            done();
          });
        });
      });
      describe('refresh', function() {
        var origEnv = process.env;
        beforeEach(function() {
          process.env = {};
        });
        afterEach(function() {
          process.env = origEnv;
          iniLoader.clearCachedFiles();
        });
        return it('fails if credentials are not in the file', function(done) {
          var mock = '';
          process.env.HOME = '/home/user';
          helpers.spyOn(AWS.util, 'readFileSync').andReturn(mock);
          new AWS.ProcessCredentials().refresh(function(err) {
            expect(err.message).to.match(/^Profile default not found/);
            done();
          });
        });
      });
    });
    describe('loadRoleProfile', function() {
      var env;
      beforeEach(function() {
        env = process.env;
        process.env = {};
        var os;
        os = require('os');
        helpers.spyOn(os, 'homedir').andReturn('/home/user');
      });
      afterEach(function() {
        iniLoader.clearCachedFiles();
        process.env = env;
      });
      it('will fail if assume role is disabled', function(done) {
        var creds, mock;
        mock = '[default]\naws_access_key_id = akid\naws_secret_access_key = secret\nrole_arn = arn';
        helpers.spyOn(AWS.util, 'readFileSync').andReturn(mock);
        creds = new AWS.SharedIniFileCredentials({
          disableAssumeRole: true
        });
        creds.refresh(function(err) {
          expect(err.message).to.match(/^Role assumption profiles are disabled. Failed to load profile default/);
          done();
        });
      });
      it('will fail if no source profile is specified', function(done) {
        var creds, mock;
        mock = '[default]\naws_access_key_id = akid\naws_secret_access_key = secret\nrole_arn = arn';
        helpers.spyOn(AWS.util, 'readFileSync').andReturn(mock);
        creds = new AWS.SharedIniFileCredentials();
        creds.refresh(function(err) {
          expect(err.message).to.equal('source_profile is not set using profile default');
          done();
        });
      });
      it('will fail if source profile config is not defined', function(done) {
        var creds, mock;
        mock = '[default]\naws_access_key_id = akid\naws_secret_access_key = secret\nrole_arn = arn\nsource_profile = fake';
        helpers.spyOn(AWS.util, 'readFileSync').andReturn(mock);
        creds = new AWS.SharedIniFileCredentials();
        creds.refresh(function(err) {
          expect(err.message).to.match(/source_profile fake using profile default does not exist/);
          done();
        });
      });
      it('will fail if source profile config lacks credentials', function(done) {
        var creds, mock;
        mock = '[default]\naws_access_key_id = akid\naws_secret_access_key = secret\nrole_arn = arn\nsource_profile = foo\n[foo]\naws_access_key_id = akid2';
        helpers.spyOn(AWS.util, 'readFileSync').andReturn(mock);
        creds = new AWS.SharedIniFileCredentials();
        return creds.refresh(function(err) {
          expect(err.message).to.match(/Missing credentials in config/);
          done();
        });
      });
      it('will return credentials for assumed role', function(done) {
        var creds, mock;
        mock = '[default]\naws_access_key_id = akid\naws_secret_access_key = secret\nrole_arn = arn\nexternal\nasda\nsource_profile = foo\n[foo]\naws_access_key_id = akid2\naws_secret_access_key = secret2';
        helpers.spyOn(AWS.util, 'readFileSync').andReturn(mock);
        helpers.mockHttpResponse(200, {}, '<AssumeRoleResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/">\n  <AssumeRoleResult>\n    <Credentials>\n      <AccessKeyId>KEY</AccessKeyId>\n      <SecretAccessKey>SECRET</SecretAccessKey>\n      <SessionToken>TOKEN</SessionToken>\n      <Expiration>1970-01-01T00:00:00.000Z</Expiration>\n    </Credentials>\n  </AssumeRoleResult>\n</AssumeRoleResponse>');
        creds = new AWS.SharedIniFileCredentials();
        expect(creds.roleArn).to.equal('arn');
        creds.refresh(function(err) {
          expect(creds.accessKeyId).to.equal('KEY');
          expect(creds.secretAccessKey).to.equal('SECRET');
          expect(creds.sessionToken).to.equal('TOKEN');
          expect(creds.expireTime).to.eql(new Date(0));
          done();
        });
      });
      it('will assume a role from chained source_profile profiles', function(done) {
        var creds, mock;
        mock = '[default]\nrole_arn = arn\nsource_profile = foo_first\n[foo_first]\nrole_arn = arn_foo_first\nsource_profile = foo_base\n[foo_base]\naws_access_key_id = baseKey\naws_secret_access_key = baseSecret\n';
        helpers.spyOn(AWS.util, 'readFileSync').andReturn(mock);
        var STSPrototype = (new STS()).constructor.prototype;
        var expiration = new Date(Date.now() + 1000);
        assumeRoleSpy = helpers.spyOn(STSPrototype, 'assumeRole').andCallFake(
          function(roleParams, callback) {
            AWS.util.defer(function () {
              callback(null, {
                Credentials: {
                  AccessKeyId: 'KEY',
                  SecretAccessKey: 'SECRET',
                  SessionToken: 'TOKEN',
                  Expiration: expiration
                }
              });
            });
          }
        );
        creds = new AWS.SharedIniFileCredentials({
          callback: function (err) {
            expect(err).to.be.null;
            expect(assumeRoleSpy.calls.length).to.equal(2);
            expect(creds.roleArn).to.equal('arn');
            firstAssumeRoleArg = assumeRoleSpy.calls[0]['arguments'][0];
            expect(firstAssumeRoleArg.RoleArn).to.equal('arn_foo_first');
            secondAssumeRoleArg = assumeRoleSpy.calls[1]['arguments'][0];
            expect(secondAssumeRoleArg.RoleArn).to.equal('arn');
            expect(creds.accessKeyId).to.equal('KEY');
            expect(creds.secretAccessKey).to.equal('SECRET');
            expect(creds.sessionToken).to.equal('TOKEN');
            expect(creds.expireTime).to.eql(expiration);
            return done();
          }
        });
      });
      it('will assume a role from the credentials file whose source profile is defined in the config file', function(done) {
        var creds, credsCtorSpy;
        process.env.AWS_SDK_LOAD_CONFIG = '1';
        helpers.spyOn(AWS.util, 'readFileSync').andCallFake(function(path) {
          if (path.match(/[\/\\]home[\/\\]user[\/\\].aws[\/\\]credentials/)) {
            return '[default]\nrole_arn = arn\nsource_profile = foo';
          } else {
            return '[profile foo]\naws_access_key_id = akid\naws_secret_access_key = secret';
          }
        });
        helpers.mockHttpResponse(200, {}, '<AssumeRoleResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/">\n  <AssumeRoleResult>\n    <Credentials>\n      <AccessKeyId>KEY</AccessKeyId>\n      <SecretAccessKey>SECRET</SecretAccessKey>\n      <SessionToken>TOKEN</SessionToken>\n      <Expiration>1970-01-01T00:00:00.000Z</Expiration>\n    </Credentials>\n  </AssumeRoleResult>\n</AssumeRoleResponse>');
        creds = new AWS.SharedIniFileCredentials();
        credsCtorSpy = helpers.spyOn(AWS, 'SharedIniFileCredentials').andCallThrough();
        expect(creds.roleArn).to.equal('arn');
        return creds.refresh(function(err) {
          var sourceCreds;
          expect(credsCtorSpy.calls.length).to.equal(1);
          parentCredsArg = credsCtorSpy.calls[0]['arguments'][0];
          expect(parentCredsArg.profile).to.equal('foo');
          expect(creds.accessKeyId).to.equal('KEY');
          expect(creds.secretAccessKey).to.equal('SECRET');
          expect(creds.sessionToken).to.equal('TOKEN');
          expect(creds.expireTime).to.eql(new Date(0));
          delete process.env.AWS_SDK_LOAD_CONFIG;
          return done();
        });
      });
      it('will assume a role from the config file whose source profile is defined in the credentials file', function(done) {
        var creds, credsCtorSpy;
        process.env.AWS_SDK_LOAD_CONFIG = '1';
        helpers.spyOn(AWS.util, 'readFileSync').andCallFake(function(path) {
          if (path.match(/[\/\\]home[\/\\]user[\/\\].aws[\/\\]config/)) {
            return '[default]\nrole_arn = arn\nsource_profile = foo';
          } else {
            return '[foo]\naws_access_key_id = akid\naws_secret_access_key = secret';
          }
        });
        helpers.mockHttpResponse(200, {}, '<AssumeRoleResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/">\n  <AssumeRoleResult>\n    <Credentials>\n      <AccessKeyId>KEY</AccessKeyId>\n      <SecretAccessKey>SECRET</SecretAccessKey>\n      <SessionToken>TOKEN</SessionToken>\n      <Expiration>1970-01-01T00:00:00.000Z</Expiration>\n    </Credentials>\n  </AssumeRoleResult>\n</AssumeRoleResponse>');
        creds = new AWS.SharedIniFileCredentials();
        credsCtorSpy = helpers.spyOn(AWS, 'SharedIniFileCredentials').andCallThrough();
        expect(creds.roleArn).to.equal('arn');
        return creds.refresh(function(err) {
          var sourceCreds;
          expect(credsCtorSpy.calls.length).to.equal(1);
          parentCredsArg = credsCtorSpy.calls[0]['arguments'][0];
          expect(parentCredsArg.profile).to.equal('foo');
          expect(creds.accessKeyId).to.equal('KEY');
          expect(creds.secretAccessKey).to.equal('SECRET');
          expect(creds.sessionToken).to.equal('TOKEN');
          expect(creds.expireTime).to.eql(new Date(0));
          delete process.env.AWS_SDK_LOAD_CONFIG;
          return done();
        });
      });
      it('should prefer static credentials to role_arn in source profiles', function(done) {
        var creds, mock;
        mock = '[default]\nrole_arn = arn\nsource_profile = foo_first\n[foo_first]\naws_access_key_id=first_key\naws_secret_access_key=first_secret\nrole_arn = arn_foo_first\nsource_profile = foo_base\n[foo_base]\naws_access_key_id = baseKey\naws_secret_access_key = baseSecret\n';
        helpers.spyOn(AWS.util, 'readFileSync').andReturn(mock);
        helpers.mockHttpResponse(200, {}, '<AssumeRoleResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/">\n  <AssumeRoleResult>\n    <Credentials>\n      <AccessKeyId>KEY</AccessKeyId>\n      <SecretAccessKey>SECRET</SecretAccessKey>\n      <SessionToken>TOKEN</SessionToken>\n      <Expiration>1970-01-01T00:00:00.000Z</Expiration>\n    </Credentials>\n  </AssumeRoleResult>\n</AssumeRoleResponse>');
        var STSPrototype = (new STS()).constructor.prototype;
        creds = new AWS.SharedIniFileCredentials();
        assumeRoleSpy = helpers.spyOn(STSPrototype, 'assumeRole').andCallThrough();
        expect(creds.roleArn).to.equal('arn');
        return creds.refresh(function(err) {
          expect(assumeRoleSpy.calls.length).to.equal(1);
          firstAssumeRoleArg = assumeRoleSpy.calls[0]['arguments'][0];
          expect(firstAssumeRoleArg.RoleArn).to.equal('arn');
          return done();
        });
      });
      it('should prefer role_arn to static credentials in the base profile', function(done) {
        var creds, mock;
        mock = '[default]\nrole_arn = arn\naws_access_key_id=base_key\naws_secret_access_key=base_secret\nsource_profile = foo_first\n[foo_first]\nrole_arn = arn_foo_first\nsource_profile = foo_base\n[foo_base]\naws_access_key_id = baseKey\naws_secret_access_key = baseSecret\n';
        helpers.spyOn(AWS.util, 'readFileSync').andReturn(mock);

        var STSPrototype = (new STS()).constructor.prototype;
        var expiration = new Date(Date.now() + 1000);
        assumeRoleSpy = helpers.spyOn(STSPrototype, 'assumeRole').andCallFake(
          function(roleParams, callback) {
            setImmediate(function () {
              callback(null, {
                Credentials: {
                  AccessKeyId: 'KEY',
                  SecretAccessKey: 'SECRET',
                  SessionToken: 'TOKEN',
                  Expiration: expiration
                }
              });
            });
          }
        );
        creds = new AWS.SharedIniFileCredentials({
          callback: function (err) {
            expect(err).to.be.null;
            expect(creds.roleArn).to.equal('arn');
            expect(assumeRoleSpy.calls.length).to.equal(2);
            firstAssumeRoleArg = assumeRoleSpy.calls[0]['arguments'][0];
            expect(firstAssumeRoleArg.RoleArn).to.equal('arn_foo_first');
            secondAssumeRoleArg = assumeRoleSpy.calls[1]['arguments'][0];
            expect(secondAssumeRoleArg.RoleArn).to.equal('arn');
            done();
          }
        });
      });
      it('will use httpOptions for assume role when provided', function(done) {
        var creds, mock;
        var httpClient, spy;
        mock = '[default]\nrole_arn = arn\nsource_profile = foo_base\n[foo_base]\naws_access_key_id = baseKey\naws_secret_access_key = baseSecret\n';
        helpers.spyOn(AWS.util, 'readFileSync').andReturn(mock);
        helpers.mockHttpResponse(200, {}, '<AssumeRoleResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/">\n  <AssumeRoleResult>\n    <Credentials>\n      <AccessKeyId>KEY</AccessKeyId>\n      <SecretAccessKey>SECRET</SecretAccessKey>\n      <SessionToken>TOKEN</SessionToken>\n      <Expiration>1970-01-01T00:00:00.000Z</Expiration>\n    </Credentials>\n  </AssumeRoleResult>\n</AssumeRoleResponse>');
        creds = new AWS.SharedIniFileCredentials({
          httpOptions: {
            connectTimeout: 2000,
            proxy: 'https://foo.bar',
            timeout: 2000,
          }
        });
        httpClient = AWS.HttpClient.getInstance();
        spy = helpers.spyOn(httpClient, 'handleRequest').andCallThrough();
        return creds.refresh(function(err) {
          expect(spy.calls.length).to.equal(1);
          expect(spy.calls[0].arguments[1].connectTimeout).to.equal(2000);
          expect(spy.calls[0].arguments[1].proxy).to.equal('https://foo.bar');
          expect(spy.calls[0].arguments[1].timeout).to.equal(2000);
          return done();
        });
      });

      describe('mfa serial callback', function() {

        beforeEach(function() {
          process.env.AWS_SDK_LOAD_CONFIG = '1';
        });
        afterEach(function() {
          delete process.env.AWS_SDK_LOAD_CONFIG;
        });

        it('calls tokenCodeFn if mfa_serial is provided', function(done) {
          var tokenCodeFn, mock;
          mock = '[default]\naws_access_key_id = key\naws_secret_access_key = secret\n'
            + '[profile withmfa]\nrole_arn = arn\nmfa_serial = serial\nsource_profile = default';
          helpers.spyOn(AWS.util, 'readFileSync').andReturn(mock);
          helpers.mockHttpResponse(200, {}, '<AssumeRoleResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/">\n  <AssumeRoleResult>\n    <Credentials>\n      <AccessKeyId>KEY</AccessKeyId>\n      <SecretAccessKey>SECRET</SecretAccessKey>\n      <SessionToken>TOKEN</SessionToken>\n      <Expiration>1970-01-01T00:00:00.000Z</Expiration>\n    </Credentials>\n  </AssumeRoleResult>\n</AssumeRoleResponse>');
          tokenCodeFn = function(serial, callback) {
            expect(serial).to.equal('serial');
            callback(null, '123456');
            done();
          };
          new AWS.SharedIniFileCredentials({
            profile: 'withmfa',
            tokenCodeFn: tokenCodeFn
          });
        });

        it('does not call tokenCodeFn more than once concurrently', function() {
          var creds, tokenCodeFnSpy, mock;
          mock = '[default]\naws_access_key_id = key\naws_secret_access_key = secret\n'
            + '[profile withmfa]\nrole_arn = arn\nmfa_serial = serial\nsource_profile = default';
          helpers.spyOn(AWS.util, 'readFileSync').andReturn(mock);
          helpers.mockHttpResponse(200, {}, '<AssumeRoleResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/">\n  <AssumeRoleResult>\n    <Credentials>\n      <AccessKeyId>KEY</AccessKeyId>\n      <SecretAccessKey>SECRET</SecretAccessKey>\n      <SessionToken>TOKEN</SessionToken>\n      <Expiration>1970-01-01T00:00:00.000Z</Expiration>\n    </Credentials>\n  </AssumeRoleResult>\n</AssumeRoleResponse>');
          tokenCodeFnSpy = helpers.createSpy('tokenCodeFn');
          creds = new AWS.SharedIniFileCredentials({
            profile: 'withmfa',
            tokenCodeFn: tokenCodeFnSpy
          });
          creds.refresh();
          creds.refresh();
          expect(tokenCodeFnSpy.calls.length).to.equal(1);
        });

        it('callback receives tokenCodeFns error', function(done) {
          var creds, tokenCodeFn, mock;
          helpers.mockHttpResponse(200, {}, '<AssumeRoleResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/">\n  <AssumeRoleResult>\n    <Credentials>\n      <AccessKeyId>KEY</AccessKeyId>\n      <SecretAccessKey>SECRET</SecretAccessKey>\n      <SessionToken>TOKEN</SessionToken>\n      <Expiration>1970-01-01T00:00:00.000Z</Expiration>\n    </Credentials>\n  </AssumeRoleResult>\n</AssumeRoleResponse>');
          mock = '[default]\naws_access_key_id = key\naws_secret_access_key = secret\n'
            + '[profile withmfa]\nrole_arn = arn\nmfa_serial = serial\nsource_profile = default';
          helpers.spyOn(AWS.util, 'readFileSync').andReturn(mock);
          tokenCodeFn = function(serial, callback) {
            callback(new Error('tokenCodeFn error'));
          };
          creds = new AWS.SharedIniFileCredentials({
            profile: 'withmfa',
            tokenCodeFn: tokenCodeFn
          });
          creds.refresh(function(err) {
            expect(err.message).to.equal('Error fetching MFA token: tokenCodeFn error');
            done();
          });
        });
      });
    });
    describe('AWS.EC2MetadataCredentials', function() {
      var creds, mockMetadataService;
      creds = null;
      beforeEach(function() {
        return creds = new AWS.EC2MetadataCredentials({
          host: 'host'
        });
      });
      mockMetadataService = function(expireTime) {
        return helpers.spyOn(creds.metadataService, 'loadCredentials').andCallFake(function(cb) {
          return cb(null, {
            Code: 'Success',
            AccessKeyId: 'KEY',
            SecretAccessKey: 'SECRET',
            Token: 'TOKEN',
            Expiration: expireTime.toISOString()
          });
        });
      };
      describe('constructor', function() {
        it('allows passing of AWS.MetadataService options', function() {
          return expect(creds.metadataService.host).to.equal('host');
        });
        it('does not modify options object', function() {
          var opts;
          opts = {};
          creds = new AWS.EC2MetadataCredentials(opts);
          return expect(opts).to.eql({});
        });
        return it('allows setting timeout', function() {
          var opts;
          opts = {
            httpOptions: {
              timeout: 5000
            }
          };
          creds = new AWS.EC2MetadataCredentials(opts);
          return expect(creds.metadataService.httpOptions.timeout).to.equal(5000);
        });
      });
      describe('needsRefresh', function() {
        return it('can be expired based on expire time from EC2 Metadata service', function(done) {
          mockMetadataService(new Date(0));
          creds.refresh(function () {
            expect(creds.needsRefresh()).to.equal(true);
            done();
          });
        });
      });
      describe('refresh', function() {
        it('loads credentials from EC2 Metadata service', function(done) {
          mockMetadataService(new Date(AWS.util.date.getDate().getTime() + 100000));
          creds.refresh(function () {
            expect(creds.metadata.Code).to.equal('Success');
            expect(creds.accessKeyId).to.equal('KEY');
            expect(creds.secretAccessKey).to.equal('SECRET');
            expect(creds.sessionToken).to.equal('TOKEN');
            expect(creds.needsRefresh()).to.equal(false);
            done();
          });
        });
        it('does try to load creds second time if Metadata service failed', function() {
          var spy;
          spy = helpers.spyOn(creds.metadataService, 'loadCredentials').andCallFake(function(cb) {
            return cb(new Error('INVALID SERVICE'));
          });
          creds.refresh(function(err) {
            return expect(err.message).to.equal('INVALID SERVICE');
          });
          return creds.refresh(function() {
            return creds.refresh(function() {
              return creds.refresh(function() {
                return expect(spy.calls.length).to.equal(4);
              });
            });
          });
        });
        it('fails if the loaded credentials are expired', function (done) {
          mockMetadataService(new Date(Date.now() - 1));
          creds.refresh(function (err) {
            expect(err).to.be.not.null;
            expect(err.message).to.equal('EC2 Instance Metadata Serivce provided expired credentials');
            expect(err.code).to.equal('EC2MetadataCredentialsProviderFailure');
            done();
          });
        });
      });
    });
    describe('AWS.RemoteCredentials', function() {
      var origEnv, creds, mockEndpoint, responseData, responseDataNew;
      creds = null;
      responseData = {
        AccessKeyId: 'KEY',
        SecretAccessKey: 'SECRET',
        Token: 'TOKEN',
        Expiration: (new Date(0)).toISOString()
      };
      responseDataNew = {
        credentials: {
          accessKeyId: 'KEY',
          secretAccessKey: 'SECRET',
          sessionToken: 'TOKEN',
          expiration: (new Date(0)).toISOString()
        }
      };
      beforeEach(function() {
        origEnv = process.env;
        creds = new AWS.RemoteCredentials({
          host: 'host'
        });
        process.env = {};
      });
      afterEach(function() {
        process.env = origEnv;
      });
      mockEndpoint = function(expireTime) {
        return helpers.spyOn(creds, 'request').andCallFake(function(path, cb) {
          var expiration;
          expiration = expireTime.toISOString();
          return cb(null, JSON.stringify(AWS.util.merge(responseData, {
            Expiration: expiration
          })));
        });
      };

      describe('constructor', function() {
        it('allows passing of options', function() {
          return expect(creds.host).to.equal('host');
        });
        it('does not modify options object', function() {
          var opts;
          opts = {};
          creds = new AWS.RemoteCredentials(opts);
          return expect(opts).to.eql({});
        });
        return it('allows setting timeout', function() {
          var opts;
          opts = {
            httpOptions: {
              timeout: 5000
            }
          };
          creds = new AWS.RemoteCredentials(opts);
          return expect(creds.httpOptions.timeout).to.equal(5000);
        });
      });

      describe('isConfiguredForRemoteCredentials', function () {
        it('returns false when process is not available', function() {
          var process_copy = process;
          process = void 0;
          expect(creds.isConfiguredForEcsCredentials()).to.equal(false);
          process = process_copy;
        });

        it(
          'returns false when relative URI environment variable not set',
          function() {
            expect(creds.isConfiguredForEcsCredentials()).to.equal(false);
          }
        );

        it(
          'returns true when the relative URI environment variable is set',
          function() {
            process.env['AWS_CONTAINER_CREDENTIALS_RELATIVE_URI'] = '/path';
            expect(creds.isConfiguredForEcsCredentials()).to.equal(true);
          }
        );

        it(
          'returns true when the full URI environment variable is set',
          function() {
            process.env['AWS_CONTAINER_CREDENTIALS_FULL_URI'] = 'http://localhost/get-credentials';
            expect(creds.isConfiguredForEcsCredentials()).to.equal(true);
          }
        );

        it(
          'returns true from the object prototype when the relative URI environment variable is set',
          function() {
            process.env['AWS_CONTAINER_CREDENTIALS_RELATIVE_URI'] = '/path';
            expect(AWS.RemoteCredentials.prototype.isConfiguredForEcsCredentials())
              .to.equal(true);
          }
        );

        it(
          'returns true from the object prototype when the full URI environment variable is set',
          function() {
            process.env['AWS_CONTAINER_CREDENTIALS_FULL_URI'] = 'http://localhost/get-credentials';
            expect(AWS.RemoteCredentials.prototype.isConfiguredForEcsCredentials())
              .to.equal(true);
          }
        );
      });

      describe('getECSFullUri', function() {
        it('throws when process.env is not available', function() {
          process.env = void 0;
          expect(creds.getECSFullUri).to.throw('No process info available');
        });

        it(
          'throws when neither the relative URI environment variable nor the full URI environment variable is set',
          function() {
            expect(creds.getECSFullUri).to.throw(/Variable \w+ or \w+ must be set to use AWS.RemoteCredentials/);
          }
        );

        it(
          'returns a full URI when the relative URI environment variable is set',
          function() {
            process.env['AWS_CONTAINER_CREDENTIALS_RELATIVE_URI'] = '/path';
            expect(creds.getECSFullUri()).to.equal('http://169.254.170.2/path');
          }
        );

        it(
          'returns a full URI when the full URI environment variable is set',
          function() {
            process.env['AWS_CONTAINER_CREDENTIALS_FULL_URI'] = 'http://localhost/get-credentials';
            expect(creds.getECSFullUri())
                .to.equal('http://localhost/get-credentials');
          }
        );

        it(
          'throws an error when the full URI environment variable contains a URI with an unsupported protocol',
          function () {
            process.env['AWS_CONTAINER_CREDENTIALS_FULL_URI'] = 'wss://localhost/get-credentials';
            expect(creds.getECSFullUri.bind(creds))
                .to.throw(/Unsupported protocol/);
          }
        );

        it(
          'throws an error when the full URI environment variable contains a URI with an unsupported protocol',
          function () {
            process.env['AWS_CONTAINER_CREDENTIALS_FULL_URI'] = 'http://s3-us-west-2.amazonaws.com/bucket/credentials';
            expect(creds.getECSFullUri.bind(creds))
              .to.throw(/Unsupported hostname/);
          }
        );

        it(
          'returns a full URI when the full URI environment variable is set to a non-localhost https URI',
          function () {
            process.env['AWS_CONTAINER_CREDENTIALS_FULL_URI'] = 'https://s3-us-west-2.amazonaws.com/bucket/credentials';
            expect(creds.getECSFullUri())
              .to.equal('https://s3-us-west-2.amazonaws.com/bucket/credentials');
          }
        );
      });

      describe('formatCreds', function() {
        var formattedCreds;

        it('removes invalid keys', function() {
          var invalidData;
          invalidData = {
            accessKeyId: 'KEY',
            InvalidKey: 'someValue'
          };
          formattedCreds = creds.formatCreds(invalidData);
          expect(formattedCreds.InvalidKey).to.be.undefined;
          expect(formattedCreds.accessKeyId).to.be['KEY'];
        });
        it('renames valid keys', function() {
          formattedCreds = creds.formatCreds(responseData);
          expect(formattedCreds.accessKeyId).to.be['KEY'];
          expect(formattedCreds.secretAccessKey).to.be['SECRET'];
          expect(formattedCreds.sessionToken).to.be['TOKEN'];
        });
        it('restructures valid creds', function() {
          var validData;
          validData = {
            credentials: {
              accessKeyId: 'KEY',
              secretAccessKey: 'SECRET',
              sessionToken: 'TOKEN',
              expiration: (new Date(0)).toISOString()
            }
          };
          formattedCreds = creds.formatCreds(validData);
          expect(formattedCreds.accessKeyId).to.be['KEY'];
          expect(formattedCreds.secretAccessKey).to.be['SECRET'];
          expect(formattedCreds.sessionToken).to.be['TOKEN'];
          expect(formattedCreds.expireTime).to.eql(new Date(0));
        });
      });

      describe('credsFormatIsValid', function() {
        it('returns false when data is missing required property', function() {
          var incompleteData;
          incompleteData = {
            AccessKeyId: 'KEY',
            SecretAccessKey: 'SECRET',
            Token: 'TOKEN'
          };
          expect(creds.credsFormatIsValid(incompleteData)).to.be['false'];
        });
        it('returns true when formatted data has all required properties', function() {
          expect(creds.credsFormatIsValid(responseData)).to.be['false'];
          expect(creds.credsFormatIsValid(creds.formatCreds(responseData))).to.be['true'];
        });
      });

      describe('needsRefresh', function() {
        return it('can be expired based on expire time from URI endpoint', function() {
          var spy;
          process.env['AWS_CONTAINER_CREDENTIALS_RELATIVE_URI'] = '/path';
          spy = mockEndpoint(new Date(0));
          creds.refresh(function() {});
          expect(spy.calls.length).to.equal(1);
          expect(creds.needsRefresh()).to.equal(true);
        });
      });

      describe('refresh', function() {
        it('loads credentials from specified relative URI', function() {
          var callbackErr = null;
          process.env['AWS_CONTAINER_CREDENTIALS_RELATIVE_URI'] = '/path';
          var spy = mockEndpoint(new Date(AWS.util.date.getDate().getTime() + 100000));
          creds.refresh(function(err) {
            callbackErr = err;
          });
          expect(spy.calls.length).to.equal(1);
          expect(spy.calls[0].arguments[0])
            .to.equal('http://169.254.170.2/path');
          expect(callbackErr).to.be['null'];
          expect(creds.accessKeyId).to.equal('KEY');
          expect(creds.secretAccessKey).to.equal('SECRET');
          expect(creds.sessionToken).to.equal('TOKEN');
          expect(creds.needsRefresh()).to.equal(false);
        });

        it('loads credentials from specified full URI', function() {
          var callbackErr = null;
          process.env['AWS_CONTAINER_CREDENTIALS_FULL_URI'] = 'http://localhost/get-credentials';
          var spy = mockEndpoint(new Date(AWS.util.date.getDate().getTime() + 100000));
          creds.refresh(function(err) {
            callbackErr = err;
          });
          expect(spy.calls.length).to.equal(1);
          expect(spy.calls[0].arguments[0])
            .to.equal('http://localhost/get-credentials');
          expect(callbackErr).to.be['null'];
          expect(creds.accessKeyId).to.equal('KEY');
          expect(creds.secretAccessKey).to.equal('SECRET');
          expect(creds.sessionToken).to.equal('TOKEN');
          expect(creds.needsRefresh()).to.equal(false);
        });

        it('passes an error to the callback when environment variable not set', function(done) {
          var callbackErr, spy;
          callbackErr = null;
          spy = mockEndpoint(new Date(AWS.util.date.getDate().getTime() + 100000));
          creds.refresh(function(err) {
            expect(spy.calls.length).to.equal(0);
            expect(err).to.be.instanceof(Error);
            done();
          });
        });

        it('retries up to specified maxRetries for timeout errors', function(done) {
          var httpClient, options, spy;
          process.env['AWS_CONTAINER_CREDENTIALS_RELATIVE_URI'] = '/path';
          options = {
            maxRetries: 3
          };
          creds = new AWS.RemoteCredentials(options);
          httpClient = AWS.HttpClient.getInstance();
          spy = helpers.spyOn(httpClient, 'handleRequest').andCallFake(function(httpReq, httpOp, cb, errCb) {
            return errCb({
              code: 'TimeoutError'
            });
          });
          creds.refresh(function(err) {
            expect(err).to.not.be['null'];
            expect(err.code).to.equal('TimeoutError');
            expect(spy.calls.length).to.equal(4);
            done();
          });
        });

        it('passes the environmental auth token to the request', function(done) {
          process.env['AWS_CONTAINER_CREDENTIALS_FULL_URI'] = 'http://localhost/get-credentials';
          process.env['AWS_CONTAINER_AUTHORIZATION_TOKEN'] = 'Basic abcd';
          creds = new AWS.RemoteCredentials();
          var httpClient = AWS.HttpClient.getInstance();
          helpers.spyOn(httpClient, 'handleRequest').andCallFake(function(httpReq, httpOp, cb, errCb) {
            expect(httpReq.headers.Authorization).to.equal('Basic abcd');
            helpers.mockHttpSuccessfulResponse(200, {}, JSON.stringify(responseData), cb);
          });
          creds.refresh(function(err) {
            expect(err).to.be['null'];
            done();
          });
        });
      });
    });
    describe('AWS.ECSCredentials', function() {
      it('is alias of AWS.RemoteCredentials', function () {
        expect(AWS.ECSCredentials).to.equal(AWS.RemoteCredentials);
      });
    });
    describe('AWS.TokenFileWebIdentityCredentials', function() {
      var origEnv;
      var fs = require('fs');
      const defaultCredentials = {
        AccessKeyId: 'AccessKeyIdDefault',
        SecretAccessKey: 'SecretAccessKeyDefault'
      };
      beforeEach(function() {
        origEnv = process.env;
        process.env = {
          AWS_WEB_IDENTITY_TOKEN_FILE: 'envTokenFile',
          AWS_ROLE_ARN: 'envRoleArn',
          AWS_ROLE_SESSION_NAME: 'envSessionName'
        };
        helpers.spyOn(AWS.util, 'getProfilesFromSharedConfig').andReturn(
          {
            'default': {
              'web_identity_token_file': 'cfgTokenFile',
              'role_arn': 'cfgRoleArn',
              'role_session_name': 'cfgSessionName'
            }
          }
        );
        helpers.spyOn(fs, 'readFileSync').andReturn('oidcToken');
      });
      afterEach(function() {
        iniLoader.clearCachedFiles();
        process.env = origEnv;
      });

      it('creates client only when refresh is called', function(done) {
        var credentials = new AWS.TokenFileWebIdentityCredentials();
        expect(credentials.service).not.to.exist;
        credentials.refresh(function() {
          expect(credentials.service).to.exist;
          helpers.spyOn(credentials.service, 'assumeRoleWithWebIdentity').andCallFake(function(params, cb) {
            return cb(null, {
              Credentials: defaultCredentials
            });
          });
          credentials.refresh(function() {
            expect(credentials.accessKeyId).to.equal(defaultCredentials.AccessKeyId);
            expect(credentials.secretAccessKey).to.equal(defaultCredentials.SecretAccessKey);
            done();
          });
        });
      });

      it('reads params from environment variables when available', function(done) {
        new AWS.TokenFileWebIdentityCredentials().refresh(function() {
          expect(fs.readFileSync.calls[0]['arguments'][0]).to.equal('envTokenFile');
          done();
        });
      });

      describe('reads params from shared config when ones not available from environment variable', function() {
        it('when AWS_WEB_IDENTITY_TOKEN_FILE is not available', function(done) {
          delete process.env.AWS_WEB_IDENTITY_TOKEN_FILE;
          new AWS.TokenFileWebIdentityCredentials().refresh(function() {
            expect(fs.readFileSync.calls[0]['arguments'][0]).to.equal('cfgTokenFile');
            done();
          });
        });

        it('when AWS_IAM_ROLE_ARN is not available', function(done) {
          delete process.env.AWS_ROLE_ARN;
          new AWS.TokenFileWebIdentityCredentials().refresh(function() {
            expect(fs.readFileSync.calls[0]['arguments'][0]).to.equal('cfgTokenFile');
            done();
          });
        });

        return it('when process.env is empty', function(done) {
          process.env = {};
          new AWS.TokenFileWebIdentityCredentials().refresh(function() {
            expect(fs.readFileSync.calls[0]['arguments'][0]).to.equal('cfgTokenFile');
            done();
          });
        });
      });

      it('updates OIDCToken in webIdentityCredentials when new one is returned by token file', function(done) {
        var credentials = new AWS.TokenFileWebIdentityCredentials();
        credentials.refresh(function() {
          var assumeRoleWithWebIdentitySpy = helpers.spyOn(credentials.service, 'assumeRoleWithWebIdentity').andCallThrough();
          credentials.refresh(function() {
            expect(assumeRoleWithWebIdentitySpy.calls[0]['arguments'][0].WebIdentityToken).to.equal('oidcToken');
            var updatedOidcToken = 'updatedOidcToken';
            helpers.spyOn(fs, 'readFileSync').andReturn(updatedOidcToken);
            credentials.refresh(function() {
              expect(assumeRoleWithWebIdentitySpy.calls[1]['arguments'][0].WebIdentityToken).to.equal(updatedOidcToken);
              done();
            });
          });
        });
      });

      it ('retries in case of IDPCommunicationErrorException or InvalidIdentityToken', function(done) {
        var credentials = new AWS.TokenFileWebIdentityCredentials();
        credentials.refresh(function() {
          var error = {
            code: 'IDPCommunicationErrorException'
          };
          expect(credentials.service.retryableError(error)).to.equal(true);
          error.code = 'InvalidIdentityToken';
          expect(credentials.service.retryableError(error)).to.equal(true);
          done();
        });
      });

      it('supports chaining in absense of web_identity_token_file and has source_profile', function(done) {
        delete process.env.AWS_WEB_IDENTITY_TOKEN_FILE;
        helpers.spyOn(AWS.util, 'getProfilesFromSharedConfig').andReturn(
          {
            'source': {
              'web_identity_token_file': 'cfgTokenFileSource',
              'role_arn': 'cfgRoleArnSource'
            },
            'default': {
              'source_profile': 'source',
              'role_arn': 'cfgRoleArnDefault'
            }
          }
        );
        var credentials = new AWS.TokenFileWebIdentityCredentials();
        credentials.refresh(function() {
          expect(fs.readFileSync.calls[0]['arguments'][0]).to.equal('cfgTokenFileSource');
          const sourceCredentials = {
            AccessKeyId: 'AccessKeyIdSource',
            SecretAccessKey: 'SecretAccessKeySource'
          };
          var assumeRoleWithWebIdentitySpy = helpers.spyOn(credentials.service, 'assumeRoleWithWebIdentity').andCallFake(function(params, cb) {
            return cb(null, {
              Credentials: sourceCredentials
            });
          });
          var assumeRoleSpy = helpers.spyOn(credentials.service, 'assumeRole').andCallFake(function(params, cb) {
            expect(credentials.service.config.credentials, sourceCredentials);
            return cb(null, {
              Credentials: defaultCredentials
            });
          });
          credentials.refresh(function() {
            expect(assumeRoleWithWebIdentitySpy.calls[0]['arguments'][0].RoleArn).to.equal('cfgRoleArnSource');
            expect(assumeRoleSpy.calls[0]['arguments'][0].RoleArn).to.equal('cfgRoleArnDefault');
            expect(credentials.accessKeyId).to.equal(defaultCredentials.AccessKeyId);
            expect(credentials.secretAccessKey).to.equal(defaultCredentials.SecretAccessKey);
            done();
          });
        });
      });

      it('ignores chaining in presence of web_identity_token_file', function(done) {
        delete process.env.AWS_WEB_IDENTITY_TOKEN_FILE;
        helpers.spyOn(AWS.util, 'getProfilesFromSharedConfig').andReturn(
          {
            'source': {
              'web_identity_token_file': 'cfgTokenFileSource',
              'role_arn': 'cfgRoleArnSource'
            },
            'default': {
              'source_profile': 'source',
              'web_identity_token_file': 'cfgTokenFileDefault',
              'role_arn': 'cfgRoleArnDefault'
            }
          }
        );
        var credentials = new AWS.TokenFileWebIdentityCredentials();
        credentials.refresh(function() {
          expect(fs.readFileSync.calls[0]['arguments'][0]).to.equal('cfgTokenFileDefault');
          var assumeRoleWithWebIdentitySpy = helpers.spyOn(credentials.service, 'assumeRoleWithWebIdentity').andCallFake(function(params, cb) {
            return cb(null, {
              Credentials: defaultCredentials
            });
          });
          var assumeRoleSpy = helpers.spyOn(credentials.service, 'assumeRole').andCallThrough();
          credentials.refresh(function() {
            expect(assumeRoleWithWebIdentitySpy.calls[0]['arguments'][0].RoleArn).to.equal('cfgRoleArnDefault');
            expect(assumeRoleSpy.calls.length).to.equal(0);
            expect(credentials.accessKeyId).to.equal(defaultCredentials.AccessKeyId);
            expect(credentials.secretAccessKey).to.equal(defaultCredentials.SecretAccessKey);
            done();
          });
        });
      });

      return it('fails if params are not available in both environment variables or shared config', function(done) {
        delete process.env.AWS_WEB_IDENTITY_TOKEN_FILE;
        helpers.spyOn(AWS.util, 'getProfilesFromSharedConfig').andReturn({});
        new AWS.TokenFileWebIdentityCredentials().refresh(function(err) {
          expect(err.message).to.match(/^Profile default not found/);
          done();
        });
      });
    });
  }

  describe('AWS.TemporaryCredentials', function() {
    var creds, mockSTS, setupClients, setupCreds;
    creds = null;
    setupCreds = function() {
      return creds = new AWS.TemporaryCredentials({
        DurationSeconds: 1200
      });
    };
    setupClients = function() {
      setupCreds();
      return creds.createClients();
    };
    mockSTS = function(expireTime, inParams) {
      var operation;
      if (!inParams) {
        inParams = {
          DurationSeconds: 1200
        };
      }
      if (inParams.RoleArn) {
        operation = 'assumeRole';
      } else {
        operation = 'getSessionToken';
      }
      return helpers.spyOn(creds.service, operation).andCallFake(function(cb) {
        expect(creds.service.config.params).to.eql(inParams);
        setImmediate(cb, null, {
          Credentials: {
            AccessKeyId: 'KEY',
            SecretAccessKey: 'SECRET',
            SessionToken: 'TOKEN',
            Expiration: expireTime
          }
        });
      });
    };
    describe('constructor', function() {
      setupCreds();
      return it('constructs service clients lazily', function() {
        return expect(creds.service).not.to.exist;
      });
    });
    describe('createClients', function() {
      beforeEach(function() {
        return setupCreds();
      });
      it('constructs clients if not present', function() {
        expect(creds.service).not.to.exist;
        creds.createClients();
        return expect(creds.service).to.exist;
      });
      return it('does not construct clients if already present', function() {
        var service;
        creds.createClients();
        service = creds.service;
        creds.createClients();
        return expect(service).to.eql(creds.service);
      });
    });
    describe('masterCredentials', function() {
      var origCreds;
      beforeEach(function () {
        origCreds = AWS.config.credentials;
      });
      afterEach(function() {
        AWS.config.credentials = origCreds;
      });
      it('seeds masterCredentials from global credentials', function() {
        var origCreds;
        origCreds = AWS.config.credentials;
        AWS.config.credentials = new AWS.Credentials('AKID', 'SECRET');
        creds = new AWS.TemporaryCredentials();
        expect(creds.masterCredentials.accessKeyId).to.equal('AKID');
        expect(creds.masterCredentials.secretAccessKey).to.equal('SECRET');
        return AWS.config.credentials = origCreds;
      });
      it('seeds masterCredentials from temporary credentials', function() {
        var i, j, origCreds;
        origCreds = AWS.config.credentials;
        AWS.config.credentials = new AWS.Credentials('AKID', 'SECRET');
        for (i = j = 0; j <= 3; i = ++j) {
          creds = new AWS.TemporaryCredentials();
          expect(creds.masterCredentials.accessKeyId).to.equal('AKID');
          expect(creds.masterCredentials.secretAccessKey).to.equal('SECRET');
        }
        return AWS.config.credentials = origCreds;
      });
      return it('seeds masterCredentials from passed in credentials', function() {
        var masterCreds;
        AWS.config.credentials = new AWS.Credentials('AKID', 'SECRET');
        masterCreds = new AWS.Credentials('TEMPID', 'TEMPSECRET');
        creds = new AWS.TemporaryCredentials(null, masterCreds);
        expect(creds.masterCredentials.accessKeyId).to.equal('TEMPID');
        expect(creds.masterCredentials.secretAccessKey).to.equal('TEMPSECRET');
        expect(AWS.config.credentials.accessKeyId).to.equal('AKID');
        expect(AWS.config.credentials.secretAccessKey).to.equal('SECRET');
      });
    });
    describe('needsRefresh', function() {
      return it('can be expired based on expire time from STS response', function() {
        setupClients();
        mockSTS(new Date(0));
        creds.refresh(function() {});
        return expect(creds.needsRefresh()).to.equal(true);
      });
    });
    return describe('refresh', function() {
      beforeEach(function() {
        return setupClients();
      });
      it('loads temporary credentials from STS using getSessionToken', function(done) {
        mockSTS(new Date(AWS.util.date.getDate().getTime() + 100000));
        creds.refresh(function() {
          expect(creds.accessKeyId).to.equal('KEY');
          expect(creds.secretAccessKey).to.equal('SECRET');
          expect(creds.sessionToken).to.equal('TOKEN');
          expect(creds.needsRefresh()).to.equal(false);
          done();
        });
      });
      it('loads temporary credentials from STS using assumeRole if RoleArn is provided', function(done) {
        creds = new AWS.TemporaryCredentials({
          RoleArn: 'ARN'
        });
        creds.createClients();
        mockSTS(new Date(AWS.util.date.getDate().getTime() + 100000), {
          RoleArn: 'ARN',
          RoleSessionName: 'temporary-credentials'
        });
        creds.refresh(function() {
          expect(creds.accessKeyId).to.equal('KEY');
          expect(creds.secretAccessKey).to.equal('SECRET');
          expect(creds.sessionToken).to.equal('TOKEN');
          expect(creds.needsRefresh()).to.equal(false);
          done();
        });
      });
      it('does try to load creds second time if service request failed', function() {
        var spy;
        spy = helpers.spyOn(creds.service, 'getSessionToken').andCallFake(function(cb) {
          return cb(new Error('INVALID SERVICE'));
        });
        creds.refresh(function(err) {
          return expect(err.message).to.equal('INVALID SERVICE');
        });
        return creds.refresh(function() {
          return creds.refresh(function() {
            return creds.refresh(function() {
              return expect(spy.calls.length).to.equal(4);
            });
          });
        });
      });
      return it('should refresh expired master credentials when refreshing self', function() {
        var masterCreds, refreshSpy;
        masterCreds = new AWS.Credentials('akid', 'secret');
        masterCreds.expired = true;
        refreshSpy = helpers.spyOn(masterCreds, 'refresh');
        creds = new AWS.TemporaryCredentials({
          RoleArn: 'ARN'
        }, masterCreds);
        mockSTS(new Date(AWS.util.date.getDate().getTime() + 100000), {
          RoleArn: 'ARN',
          RoleSessionName: 'temporary-credentials'
        });
        creds.refresh(function() {});
        return expect(refreshSpy.calls.length).to.equal(1);
      });
    });
  });

  describe('AWS.ChainableTemporaryCredentials', function() {
    var mockSTS;
    function setupCredsAndSTSMock(options) {
      options = options || {};
      if (!options.params) {
        options.params = {
          DurationSeconds: 1200
        };
      }
      var creds = new AWS.ChainableTemporaryCredentials(options);
      mockSTS = function(expireTime, tokenCode) {
        var operation;
        if (options.params.RoleArn) {
          operation = 'assumeRole';
        } else {
          operation = 'getSessionToken';
        }
        return helpers.spyOn(creds.service, operation).andCallFake(function(params, cb) {
          if (options.params.SerialNumber) {
            expect(params.TokenCode).to.equal(tokenCode);
          }
          expect(creds.service.config.params).to.include(options.params);
          creds.service.config.getCredentials(function (err, credentials) {
            if (err) {
              cb(err);
            } else {
              setImmediate(cb, null, {
                Credentials: {
                  AccessKeyId: 'KEY',
                  SecretAccessKey: 'SECRET',
                  SessionToken: 'TOKEN',
                  Expiration: expireTime
                }
              });
            }
          });
        });
      };
      return creds;
    }
    describe('constructor', function() {
      var creds = new AWS.ChainableTemporaryCredentials();
      it('constructs service client', function() {
        expect(creds.service).to.exist;
      });
      it('should throw if params.SerialNumber given without tokenCodeFn', function() {
        expect(function () {
          new AWS.ChainableTemporaryCredentials({params: {SerialNumber: '123'}});
        }).to.throw('tokenCodeFn must be a function when params.SerialNumber is given');
      });
      it('should ignore tokenCodeFn if params.SerialNumber not given', function() {
        var creds = new AWS.ChainableTemporaryCredentials({
          tokenCodeFn: function () {}
        });
        expect(creds).to.have.property('tokenCodeFn', null);
      });
      it('should forward enpoint param to sts client', function() {
        var creds = new AWS.ChainableTemporaryCredentials({
          stsConfig: { endpoint: 'https://testendpoint' }
        });
        expect(creds.service.endpoint.hostname).to.equal('testendpoint');
      });
    });
    describe('masterCredentials', function() {
      var origCreds, origProvider;
      beforeEach(function () {
        origCreds = AWS.config.credentials;
        origProvider = AWS.config.credentialProvider;
      });
      afterEach(function() {
        AWS.config.credentials = origCreds;
        AWS.config.credentialProvider = origProvider;
      });
      it('uses initialized global credentials', function(done) {
        var masterCredentials = new AWS.Credentials('AKID', 'SECRET');
        AWS.config.credentials = masterCredentials;
        AWS.config.credentials = new AWS.ChainableTemporaryCredentials();
        AWS.config.credentials.service.config.getCredentials(function (err, credentials) {
          expect(err).to.not.exist;
          expect(credentials).to.equal(masterCredentials);
          done();
        });
      });
      it('uses global credential provider when AWS.config.credentials is null', function(done) {
        var masterCredentials = new AWS.Credentials('AKID', 'SECRET');
        AWS.config.credentials = null;
        AWS.config.credentialProvider = new AWS.CredentialProviderChain([
          masterCredentials
        ]);
        AWS.config.credentials = new AWS.ChainableTemporaryCredentials();
        AWS.config.credentials.service.config.getCredentials(function (err, credentials) {
          expect(err).to.not.exist;
          expect(credentials).to.equal(masterCredentials);
          done();
        });
      });
      it('seeds masterCredentials from passed in credentials', function(done) {
        var masterCreds = new AWS.Credentials('TEMPID', 'TEMPSECRET');
        var globalCreds = new AWS.Credentials('AKID', 'SECRET');
        AWS.config.credentials = globalCreds;
        var creds = new AWS.ChainableTemporaryCredentials({masterCredentials: masterCreds});
        creds.service.config.getCredentials(function (err, credentials) {
          expect(err).to.not.exist;
          expect(credentials).to.equal(masterCreds);
          expect(AWS.config.credentials).to.equal(globalCreds);
          done();
        });
      });
    });
    describe('needsRefresh', function() {
      return it('can be expired based on expire time from STS response', function(done) {
        var creds = setupCredsAndSTSMock();
        mockSTS(new Date(0));
        creds.refresh(function() {
          expect(creds.needsRefresh()).to.equal(true);
          done();
        });
      });
    });
    return describe('refresh', function() {
      it('loads temporary credentials from STS using getSessionToken', function(done) {
        var creds = setupCredsAndSTSMock();
        mockSTS(new Date(AWS.util.date.getDate().getTime() + 100000));
        creds.refresh(function() {
          expect(creds.accessKeyId).to.equal('KEY');
          expect(creds.secretAccessKey).to.equal('SECRET');
          expect(creds.sessionToken).to.equal('TOKEN');
          expect(creds.needsRefresh()).to.equal(false);
          done();
        });
      });
      it('loads temporary credentials from STS using assumeRole if RoleArn is provided', function(done) {
        var creds = setupCredsAndSTSMock({
          params: {
            RoleArn: 'ARN'
          }
        });
        mockSTS(new Date(AWS.util.date.getDate().getTime() + 100000));
        creds.refresh(function() {
          expect(creds.accessKeyId).to.equal('KEY');
          expect(creds.secretAccessKey).to.equal('SECRET');
          expect(creds.sessionToken).to.equal('TOKEN');
          expect(creds.needsRefresh()).to.equal(false);
          done();
        });
      });
      it('does try to load creds second time if service request failed', function(done) {
        var creds = setupCredsAndSTSMock();
        var spy;
        spy = helpers.spyOn(creds.service, 'getSessionToken').andCallFake(function(params, cb) {
          return cb(new Error('INVALID SERVICE'));
        });
        creds.refresh(function(err) {
          expect(err.message).to.equal('INVALID SERVICE');
          creds.refresh(function () {
            creds.refresh(function () {
              creds.refresh(function() {
                expect(spy.calls.length).to.equal(4);
                done();
              });
            });
          });
        });
      });
      it('should refresh expired master credentials when refreshing self', function(done) {
        var masterCreds, refreshSpy;
        masterCreds = new AWS.Credentials('akid', 'secret');
        masterCreds.expired = true;
        refreshSpy = helpers.spyOn(masterCreds, 'refresh').andCallThrough();
        var creds = setupCredsAndSTSMock({
          params: {
            RoleArn: 'ARN',
            RoleSessionName: 'chainable-temporary-creds'
          },
          masterCredentials: masterCreds
        });
        mockSTS(new Date(AWS.util.date.getDate().getTime() + 100000));
        creds.refresh(function() {
          expect(refreshSpy.calls.length).to.equal(1);
          done();
        });
      });
      it('should recursively refresh expired master credentials when refreshing self', function(done) {
        var masterCreds, intermediateCreds, masterRefreshSpy, intermediateRefreshSpy;
        masterCreds = new AWS.Credentials('akid', 'secret');
        masterCreds.expired = true;
        masterRefreshSpy = helpers.spyOn(masterCreds, 'refresh').andCallThrough();
        intermediateCreds = new AWS.ChainableTemporaryCredentials({masterCredentials: masterCreds});
        intermediateRefreshSpy = helpers.spyOn(intermediateCreds, 'refresh').andCallThrough();
        var creds = setupCredsAndSTSMock({
          params: {
            RoleArn: 'ARN'
          },
          masterCredentials: intermediateCreds
        });
        mockSTS(new Date(AWS.util.date.getDate().getTime() + 100000));
        creds.refresh(function() {
          expect(intermediateRefreshSpy.calls.length).to.equal(1);
          expect(masterRefreshSpy.calls.length).to.equal(1);
          done();
        });
      });
      it('should call tokenCodeFn when params.SerialNumber given', function(done) {
        var serialNumber = '123';
        var token = '456789';
        var tokenCodeFn = helpers.createSpy('tokenCodeFn').andCallFake(
          function (serialNumber, callback) {
            expect(serialNumber).to.equal(serialNumber);
            callback(null, token);
          }
        );
        var creds = setupCredsAndSTSMock({
          params: {
            SerialNumber: serialNumber
          },
          tokenCodeFn: tokenCodeFn
        });
        mockSTS(new Date(AWS.util.date.getDate().getTime() + 100000), token);
        creds.refresh(function (err) {
          expect(tokenCodeFn.calls.length).to.equal(1);
          expect(err).to.not.exist;
          done();
        });
      });
      it('should wrap tokenCodeFn error', function(done) {
        var tokenCodeFn = helpers.createSpy('tokenCodeFn').andCallFake(
          function (serialNumber, callback) {
            callback(new Error('boom'));
          }
        );
        var creds = setupCredsAndSTSMock({
          params: {
            SerialNumber: '123'
          },
          tokenCodeFn: tokenCodeFn
        });
        mockSTS(new Date(AWS.util.date.getDate().getTime() + 100000));
        creds.refresh(function (err) {
          expect(tokenCodeFn.calls.length).to.equal(1);
          expect(err).to.be.instanceof(Error);
          expect(err.message).to.equal('Error fetching MFA token: boom');
          done();
        });
      });
    });
  });

  describe('AWS.WebIdentityCredentials', function() {
    var creds, mockSTS, setupClients, setupCreds;
    creds = null;
    setupCreds = function() {
      return creds = new AWS.WebIdentityCredentials({
        WebIdentityToken: 'token',
        RoleArn: 'arn'
      });
    };
    setupClients = function() {
      setupCreds();
      return creds.createClients();
    };
    mockSTS = function(expireTime) {
      return helpers.spyOn(creds.service, 'assumeRoleWithWebIdentity').andCallFake(function(cb) {
        expect(creds.service.config.params).to.eql({
          RoleArn: 'arn',
          WebIdentityToken: 'token',
          RoleSessionName: 'web-identity'
        });
        return cb(null, {
          Credentials: {
            AccessKeyId: 'KEY',
            SecretAccessKey: 'SECRET',
            SessionToken: 'TOKEN',
            Expiration: expireTime
          },
          OtherProperty: true
        });
      });
    };
    describe('constructor', function() {
      return it('lazily constructs service clients', function() {
        setupCreds();
        return expect(creds.service).not.to.exist;
      });
    });
    describe('createClients', function() {
      beforeEach(function() {
        return setupCreds();
      });
      it('constructs service clients if not present', function() {
        expect(creds.service).not.to.exist;
        creds.createClients();
        return expect(creds.service).to.exist;
      });
      it('does not construct service clients if present', function() {
        var service;
        creds.createClients();
        service = creds.service;
        creds.createClients();
        return expect(service).to.eql(creds.service);
      });
      it('uses global config for service clients if client config ommitted', function() {
        creds.createClients();
        return expect(creds.service.config.httpOptions.timeout).to.equal(AWS.config.httpOptions.timeout);
      });
      return it('passes clientConfig to service clients', function() {
        creds = new AWS.WebIdentityCredentials({
          WebIdentityToken: 'token',
          RoleArn: 'arn'
        }, {
          httpOptions: {
            timeout: 50
          }
        });
        creds.createClients();
        return expect(creds.service.config.httpOptions.timeout).to.equal(50);
      });
    });
    return describe('refresh', function() {
      beforeEach(function() {
        return setupClients();
      });
      it('loads federated credentials from STS', function(done) {
        mockSTS(new Date(AWS.util.date.getDate().getTime() + 100000));
        creds.refresh(function() {
          expect(creds.accessKeyId).to.equal('KEY');
          expect(creds.secretAccessKey).to.equal('SECRET');
          expect(creds.sessionToken).to.equal('TOKEN');
          expect(creds.needsRefresh()).to.equal(false);
          expect(creds.data.OtherProperty).to.equal(true);
          done();
        });
      });
      return it('does try to load creds second time if service request failed', function(done) {
        var spy;
        spy = helpers.spyOn(creds.service, 'assumeRoleWithWebIdentity').andCallFake(function(cb) {
          return cb(new Error('INVALID SERVICE'));
        });
        creds.refresh(function(err) {
          expect(err.message).to.equal('INVALID SERVICE');
          creds.refresh(function() {
            creds.refresh(function() {
              creds.refresh(function() {
                expect(spy.calls.length).to.equal(4);
                done();
              });
            });
          });
        });
      });
    });
  });

  describe('AWS.SAMLCredentials', function() {
    var creds, mockSTS, setupClients, setupCreds;
    creds = null;
    setupCreds = function() {
      return creds = new AWS.SAMLCredentials({
        SAMLAssertion: 'token',
        RoleArn: 'arn',
        PrincipalArn: 'arn'
      });
    };
    setupClients = function() {
      setupCreds();
      return creds.createClients();
    };
    mockSTS = function(expireTime) {
      return helpers.spyOn(creds.service, 'assumeRoleWithSAML').andCallFake(function(cb) {
        expect(creds.service.config.params).to.eql({
          SAMLAssertion: 'token',
          RoleArn: 'arn',
          PrincipalArn: 'arn'
        });
        return cb(null, {
          Credentials: {
            AccessKeyId: 'KEY',
            SecretAccessKey: 'SECRET',
            SessionToken: 'TOKEN',
            Expiration: expireTime
          }
        });
      });
    };
    describe('constructor', function() {
      setupCreds();
      return it('constructs service clients lazily', function() {
        return expect(creds.service).not.to.exist;
      });
    });
    describe('createClients', function() {
      setupCreds();
      it('constructs clients if not present', function() {
        expect(creds.service).not.to.exist;
        creds.createClients();
        return expect(creds.service).to.exist;
      });
      return it('does not construct clients if already present', function() {
        var service;
        creds.createClients();
        service = creds.service;
        creds.createClients();
        return expect(service).to.eql(creds.service);
      });
    });
    return describe('refresh', function() {
      beforeEach(function() {
        return setupClients();
      });
      it('loads federated credentials from STS', function(done) {
        mockSTS(new Date(AWS.util.date.getDate().getTime() + 100000));
        creds.refresh(function() {
          expect(creds.accessKeyId).to.equal('KEY');
          expect(creds.secretAccessKey).to.equal('SECRET');
          expect(creds.sessionToken).to.equal('TOKEN');
          expect(creds.needsRefresh()).to.equal(false);
          done();
        });
      });
      return it('does try to load creds second time if service request failed', function(done) {
        var spy;
        spy = helpers.spyOn(creds.service, 'assumeRoleWithSAML').andCallFake(function(cb) {
          return cb(new Error('INVALID SERVICE'));
        });
        creds.refresh(function(err) {
          expect(err.message).to.equal('INVALID SERVICE');
          creds.refresh(function() {
            creds.refresh(function() {
              creds.refresh(function() {
                expect(spy.calls.length).to.equal(4);
                done();
              });
            });
          });
        });
      });
    });
  });

  describe('AWS.CognitoIdentityCredentials', function() {
    var creds, initParams, setupClients, setupCreds;
    if (AWS.util.isNode()) {
      AWS.util.nodeRequire = require;
    }
    initParams = {
      AccountId: '1234567890',
      IdentityPoolId: 'pool:id',
      RoleArn: 'arn'
    };
    creds = new AWS.CognitoIdentityCredentials(initParams);
    afterEach(function() {
      return creds.clearCachedId();
    });
    setupCreds = function(params) {
      params = AWS.util.merge(initParams, params);
      creds = new AWS.CognitoIdentityCredentials(params);
      return helpers.spyOn(creds, 'cacheId').andCallThrough();
    };
    setupClients = function(params) {
      setupCreds(params);
      return creds.createClients();
    };
    describe('constructor (browser)', function() {
      beforeEach(function() {
        return helpers.spyOn(AWS.util, 'isBrowser').andReturn(true);
      });
      it('loads IdentityId from localStorage cache if none provided', function() {
        creds.setStorage('id', 'MYID');
        setupCreds();
        return expect(creds.params.IdentityId).to.equal('MYID');
      });
      it('does not load IdentityId from cache if provided', function() {
        creds.setStorage('id', 'NOTMYID');
        setupCreds({
          IdentityId: 'MYID'
        });
        return expect(creds.params.IdentityId).to.equal('MYID');
      });
      it('uses IdentityId if it is cached against one of Logins', function() {
        creds.setStorage('id', 'MYID');
        creds.setStorage('providers', 'provider1');
        setupCreds({
          Logins: {
            provider1: 'Token'
          }
        });
        expect(creds.params.IdentityId).to.equal('MYID');
        creds.setStorage('providers', 'provider1,provider2,provider3');
        setupCreds({
          Logins: {
            provider1: 'Token'
          }
        });
        expect(creds.params.IdentityId).to.equal('MYID');
        creds.setStorage('providers', 'provider1,provider2,provider3');
        setupCreds({
          Logins: {
            provider1: 'Token1',
            provider3: 'Token3'
          }
        });
        return expect(creds.params.IdentityId).to.equal('MYID');
      });
      it('uses IdentityId if it is cached with the same LoginId', function() {
        setupCreds({
          LoginId: 'LOGINID1'
        });
        creds.setStorage('id', 'MYID1');
        creds.loadCachedId();
        expect(creds.params.IdentityId).to.equal('MYID1');
        setupCreds({
          LoginId: 'LOGINID2'
        });
        return expect(creds.params.IdentityId).not.to.equal('MYID1');
      });
      it('ignores IdentityId if it is not cached against any of Logins', function() {
        creds.setStorage('id', 'MYID');
        creds.setStorage('providers', 'provider4,provider5');
        setupCreds({
          Logins: {
            provider1: 'Token'
          }
        });
        return expect(creds.params.IdentityId).not.to.exist;
      });
      return it('constructs service clients lazily', function() {
        expect(creds.cognito).not.to.exist;
        expect(creds.sts).not.to.exist;
        return expect(creds.webIdentityCredentials).not.to.exist;
      });
    });
    describe('clearCachedId', function() {
      it('should clear cache information', function() {
        creds.setStorage('id', 'MYID');
        creds.setStorage('providers', 'provider1');
        creds.clearCachedId();
        expect(creds.getStorage('id')).not.to.exist;
        return expect(creds.getStorage('providers')).not.to.exist;
      });
      return it('should clear instance information', function() {
        creds.identityId = 'foo';
        creds.params.IdentityId = 'foo';
        creds.clearCachedId();
        expect(creds.identityId).not.to.exist;
        return expect(creds.params.IdentityId).not.to.exist;
      });
    });
    describe('clearIdOnNotAuthorized', function() {
      it('should call clearCachedId if user is not authorized', function() {
        var clearCache, idErr;
        clearCache = helpers.spyOn(creds, 'clearCachedId');
        idErr = {
          code: 'NotAuthorizedException'
        };
        creds.clearIdOnNotAuthorized(idErr);
        return expect(clearCache.calls.length).to.equal(1);
      });
      return it('should not call clearCachedId if user is authorized', function() {
        var clearCache, idErr;
        clearCache = helpers.spyOn(creds, 'clearCachedId');
        idErr = {
          code: 'TEST'
        };
        creds.clearIdOnNotAuthorized(idErr);
        return expect(clearCache.calls.length).to.equal(0);
      });
    });
    describe('createClients', function() {
      beforeEach(function() {
        return setupCreds();
      });
      it('constructs service clients if not present', function() {
        expect(creds.cognito).not.to.exist;
        expect(creds.sts).not.to.exist;
        expect(creds.webIdentityCredentials).not.to.exist;
        creds.createClients();
        expect(creds.cognito).to.exist;
        expect(creds.sts).to.exist;
        return expect(creds.webIdentityCredentials).to.exist;
      });
      it('does not construct clients if already present', function() {
        var cognito, sts, webIdentityCredentials;
        creds.createClients();
        cognito = creds.cognito;
        sts = creds.sts;
        webIdentityCredentials = creds.webIdentityCredentials;
        creds.createClients();
        expect(creds.cognito).to.eql(cognito);
        expect(creds.sts).to.eql(sts);
        return expect(creds.webIdentityCredentials).to.eql(webIdentityCredentials);
      });
      it('uses global config for service clients if client config ommitted', function() {
        creds.createClients();
        expect(creds.cognito.config.region).to.equal(AWS.config.region);
        expect(creds.cognito.config.httpOptions.timeout).to.equal(AWS.config.httpOptions.timeout);
        expect(creds.sts.config.httpOptions.timeout).to.equal(AWS.config.httpOptions.timeout);
        creds.webIdentityCredentials.createClients();
        return expect(creds.webIdentityCredentials.service.config.httpOptions.timeout).to.equal(AWS.config.httpOptions.timeout);
      });
      return it('passes clientConfig to service clients', function() {
        creds = new AWS.CognitoIdentityCredentials(initParams, {
          region: 'us-west-2',
          httpOptions: {
            timeout: 50
          }
        });
        creds.createClients();
        expect(creds.cognito.config.region).to.equal('us-west-2');
        expect(creds.cognito.config.httpOptions.timeout).to.equal(50);
        expect(creds.sts.config.httpOptions.timeout).to.equal(50);
        creds.webIdentityCredentials.createClients();
        return expect(creds.webIdentityCredentials.service.config.httpOptions.timeout).to.equal(50);
      });
    });
    describe('refresh', function() {
      beforeEach(function() {
        return setupClients();
      });
      it('runs getId, getCredentialsForIdentity when no role is passed in', function(done) {
        delete creds.cognito.config.params.RoleArn;
        helpers.mockResponses([
          {
            data: {
              IdentityId: 'IDENTITY-ID1'
            },
            error: null
          }, {
            data: {
              IdentityId: 'IDENTITY-ID2',
              Credentials: {
                AccessKeyId: 'KEY',
                SecretKey: 'SECRET',
                SessionToken: 'TOKEN'
              }
            },
            error: null
          }
        ]);
        helpers.spyOn(creds.cognito, 'getCredentialsForIdentity').andCallThrough();
        creds.refresh(function() {
          expect(creds.cognito.getCredentialsForIdentity.calls.length).to.eql(1);
          expect(creds.identityId).to.equal('IDENTITY-ID2');
          expect(creds.accessKeyId).to.equal('KEY');
          expect(creds.secretAccessKey).to.equal('SECRET');
          expect(creds.sessionToken).to.equal('TOKEN');
          expect(creds.needsRefresh()).to.equal(false);
          expect(creds.cacheId.calls.length).to.equal(1);
          done();
        });
      });
      it('runs getId, getOpenIdToken, assumeRoleWithWebIdentity when a role is passed in', function(done) {
        helpers.mockResponses([
          {
            data: {
              IdentityId: 'IDENTITY-ID'
            },
            error: null
          }, {
            data: {
              Token: 'TOKEN',
              IdentityId: 'IDENTITY-ID2'
            },
            error: null
          }
        ]);
        helpers.spyOn(creds.webIdentityCredentials, 'refresh').andCallFake(function(cb) {
          expect(creds.webIdentityCredentials.params.IdentityId).to.equal('IDENTITY-ID2');
          expect(creds.webIdentityCredentials.params.WebIdentityToken).to.equal('TOKEN');
          creds.webIdentityCredentials.data = {
            Credentials: {
              AccessKeyId: 'KEY',
              SecretAccessKey: 'SECRET',
              SessionToken: 'TOKEN'
            }
          };
          return cb(null);
        });
        creds.refresh(function() {
          expect(creds.identityId).to.equal('IDENTITY-ID2');
          expect(creds.accessKeyId).to.equal('KEY');
          expect(creds.secretAccessKey).to.equal('SECRET');
          expect(creds.sessionToken).to.equal('TOKEN');
          expect(creds.needsRefresh()).to.equal(false);
          expect(creds.cacheId.calls.length).to.equal(1);
          done();
        });
      });
      it('does not call getId if IdentityId is passed in', function() {
        setupClients({
          IdentityId: 'MYID'
        });
        helpers.mockResponses([
          {
            data: {
              Token: 'TOKEN',
              IdentityId: 'MYID2'
            },
            error: null
          }
        ]);
        helpers.spyOn(creds.webIdentityCredentials, 'refresh').andCallFake(function(cb) {
          expect(creds.webIdentityCredentials.params.IdentityId).to.equal('MYID2');
          expect(creds.webIdentityCredentials.params.WebIdentityToken).to.equal('TOKEN');
          creds.webIdentityCredentials.data = {
            Credentials: {
              AccessKeyId: 'KEY',
              SecretAccessKey: 'SECRET',
              SessionToken: 'TOKEN'
            }
          };
          return cb(null);
        });
        creds.refresh(function() {});
        expect(creds.identityId).to.equal('MYID2');
        expect(creds.accessKeyId).to.equal('KEY');
        expect(creds.secretAccessKey).to.equal('SECRET');
        expect(creds.sessionToken).to.equal('TOKEN');
        expect(creds.needsRefresh()).to.equal(false);
        return expect(creds.cacheId.calls.length).to.equal(1);
      });
      it('fails if getId fails', function(done) {
        helpers.mockResponses([
          {
            data: null,
            error: new Error('INVALID SERVICE')
          }
        ]);
        helpers.spyOn(creds.webIdentityCredentials, 'refresh').andCallFake(function(cb) {
          return cb(new Error('INVALID SERVICE'));
        });
        creds.refresh(function(err) {
          expect(err.message).to.equal('INVALID SERVICE');
          expect(creds.cacheId.calls.length).to.equal(0);
          expect(creds.getStorage('id')).not.to.exist;
          done();
        });
      });
      it('fails if getOpenIdToken fails', function(done) {
        helpers.mockResponses([
          {
            data: {
              IdentityId: 'IDENTITY-ID'
            },
            error: null
          }, {
            data: null,
            error: new Error('INVALID SERVICE')
          }
        ]);
        helpers.spyOn(creds.webIdentityCredentials, 'refresh').andCallFake(function() {});
        creds.refresh(function(err) {
          expect(err.message).to.equal('INVALID SERVICE');
          expect(creds.cacheId.calls.length).to.equal(0);
          expect(creds.getStorage('id')).not.to.exist;
          done();
        });
      });
      it('fails if getCredentialsForIdentity fails', function(done) {
        delete creds.cognito.config.params.RoleArn;
        helpers.mockResponses([
          {
            data: {
              IdentityId: 'IDENTITY-ID'
            },
            error: null
          }, {
            data: null,
            error: new Error('INVALID SERVICE')
          }
        ]);
        creds.refresh(function(err) {
          expect(err.message).to.equal('INVALID SERVICE');
          expect(creds.cacheId.calls.length).to.equal(0);
          expect(creds.getStorage('id')).not.to.exist;
          done();
        });
      });
      it('clears cache if getId fails for unauthorized user', function(done) {
        creds.setStorage('id', 'MYID');
        helpers.mockResponses([
          {
            data: {
              IdentityId: 'IDENTITY-ID'
            },
            error: null
          }, {
            data: null,
            error: {
              message: 'INVALID SERVICE',
              code: 'NotAuthorizedException'
            }
          }
        ]);
        helpers.spyOn(creds.webIdentityCredentials, 'refresh').andCallFake(function() {});
        creds.refresh(function(err) {
          expect(err.message).to.equal('INVALID SERVICE');
          expect(creds.cacheId.calls.length).to.equal(0);
          expect(creds.getStorage('id')).not.to.exist;
          done();
        });
      });
      it('does not clear cache if getId fails for authorized user', function(done) {
        creds.setStorage('id', 'MYID');
        helpers.mockResponses([
          {
            data: {
              IdentityId: 'IDENTITY-ID'
            },
            error: null
          }, {
            data: null,
            error: new Error('INVALID SERVICE')
          }
        ]);
        helpers.spyOn(creds.webIdentityCredentials, 'refresh').andCallFake(function() {});
        creds.refresh(function(err) {
          expect(err.message).to.equal('INVALID SERVICE');
          expect(creds.cacheId.calls.length).to.equal(0);
          expect(creds.getStorage('id')).to.exist;
          done();
        });
      });
      it('clears cache if getOpenIdToken fails for unauthorized user', function(done) {
        creds.setStorage('id', 'MYID');
        helpers.mockResponses([
          {
            data: {
              IdentityId: 'IDENTITY-ID'
            },
            error: null
          }, {
            data: null,
            error: {
              message: 'INVALID SERVICE',
              code: 'NotAuthorizedException'
            }
          }
        ]);
        helpers.spyOn(creds.webIdentityCredentials, 'refresh').andCallFake(function() {});
        creds.refresh(function(err) {
          expect(err.message).to.equal('INVALID SERVICE');
          expect(creds.cacheId.calls.length).to.equal(0);
          expect(creds.getStorage('id')).not.to.exist;
          done();
        });
      });
      it('does not clear cache if getOpenIdToken fails for authorized user', function(done) {
        creds.setStorage('id', 'MYID');
        helpers.mockResponses([
          {
            data: {
              IdentityId: 'IDENTITY-ID'
            },
            error: null
          }, {
            data: null,
            error: new Error('INVALID SERVICE')
          }
        ]);
        helpers.spyOn(creds.webIdentityCredentials, 'refresh').andCallFake(function() {});
        creds.refresh(function(err) {
          expect(err.message).to.equal('INVALID SERVICE');
          expect(creds.cacheId.calls.length).to.equal(0);
          expect(creds.getStorage('id')).to.equal('MYID');
          done();
        });
      });
      it('clears cache if getCredentialsForIdentity fails for unauthorized user', function(done) {
        delete creds.cognito.config.params.RoleArn;
        creds.setStorage('id', 'MYID');
        helpers.mockResponses([
          {
            data: {
              IdentityId: 'IDENTITY-ID'
            },
            error: null
          }, {
            data: null,
            error: {
              message: 'INVALID SERVICE',
              code: 'NotAuthorizedException'
            }
          }
        ]);
        creds.refresh(function(err) {
          expect(err.message).to.equal('INVALID SERVICE');expect(creds.cacheId.calls.length).to.equal(0);
          expect(creds.getStorage('id')).not.to.exist;
          done();
        });
      });
      it('does not clear cache if getCredentialsForIdentity fails for authorized user', function(done) {
        delete creds.cognito.config.params.RoleArn;
        creds.setStorage('id', 'MYID');
        helpers.mockResponses([
          {
            data: {
              IdentityId: 'IDENTITY-ID'
            },
            error: null
          }, {
            data: null,
            error: new Error('INVALID SERVICE')
          }
        ]);
        creds.refresh(function(err) {
          expect(err.message).to.equal('INVALID SERVICE');
          expect(creds.cacheId.calls.length).to.equal(0);
          expect(creds.getStorage('id')).to.equal('MYID');
          done();
        });
      });
      it('does try to load creds second time if service request failed', function(done) {
        var reqs;
        reqs = helpers.mockResponses([
          {
            error: {
              code: 'InvalidService'
            },
            data: null
          }, {
            data: {
              IdentityId: 'IDENTITY-ID'
            },
            error: null
          }, {
            data: {
              Token: 'TOKEN'
            },
            error: null
          }, {
            data: {
              Credentials: {
                AccessKeyId: 'akid',
                SecretAccessKey: 'secret'
              }
            },
            error: null
          }
        ]);
        creds.refresh(function(err) {
          expect(err.code).to.equal('InvalidService');
          creds.refresh(function() {
            expect(creds.accessKeyId).to.equal('akid');
            expect(creds.secretAccessKey).to.equal('secret');
            done();
          });
        });
      });
      return describe('browser caching', function() {
        beforeEach(function() {
          return helpers.spyOn(AWS.util, 'isBrowser').andReturn(true);
        });
        it('caches IdentityId into localStorage on successful handshake', function(done) {
          setupClients({
            Logins: {
              provider1: 'TOKEN1',
              provider2: 'TOKEN2'
            }
          });
          helpers.mockResponses([
            {
              data: {
                IdentityId: 'IDENTITY-ID1'
              },
              error: null
            }, {
              data: {
                Token: 'TOKEN',
                IdentityId: 'IDENTITY-ID2'
              },
              error: null
            }
          ]);
          helpers.spyOn(creds.webIdentityCredentials, 'refresh').andCallFake(function(cb) {
            creds.webIdentityCredentials.data = {
              Credentials: {
                AccessKeyId: 'KEY',
                SecretAccessKey: 'SECRET',
                SessionToken: 'TOKEN'
              }
            };
            return cb(null);
          });
          creds.refresh(function() {
            expect(creds.getStorage('id')).to.equal('IDENTITY-ID2');
            expect(creds.getStorage('providers')).to.equal('provider1,provider2');
            done();
          });
        });
        it('returns cached id in getId call', function(done) {
          setupClients({
            Logins: {
              provider1: 'TOKEN1',
              provider2: 'TOKEN2'
            }
          });
          helpers.mockResponses([
            {
              data: {
                IdentityId: 'IDENTITY-ID1'
              },
              error: null
            }, {
              data: {
                Token: 'TOKEN',
                IdentityId: 'IDENTITY-ID2'
              },
              error: null
            }
          ]);
          helpers.spyOn(creds.webIdentityCredentials, 'refresh').andCallFake(function(cb) {
            creds.webIdentityCredentials.data = {
              Credentials: {
                AccessKeyId: 'KEY',
                SecretAccessKey: 'SECRET',
                SessionToken: 'TOKEN'
              }
            };
            return cb(null);
          });
          creds.refresh(function() {
            creds.getId(function(err, id) {
              expect(id).to.equal('IDENTITY-ID2');
              expect(creds.getStorage('id')).to.equal('IDENTITY-ID2');
              done();
            });
          });
        });
        it('returns cached id in getId call with LoginId', function(done) {
          setupClients({
            LoginId: 'LOGINIDA'
          });
          helpers.mockResponses([
            {
              data: {
                IdentityId: 'IDENTITY-ID1'
              },
              error: null
            }, {
              data: {
                TOKEN: 'TOKEN',
                IdentityId: 'IDENTITY-ID2'
              },
              error: null
            }
          ]);
          helpers.spyOn(creds.webIdentityCredentials, 'refresh').andCallFake(function(cb) {
            creds.webIdentityCredentials.data = {
              Credentials: {
                AccessKeyId: 'KEY',
                SecretAccessKey: 'SECRET',
                SessionToken: 'TOKEN'
              }
            };
            return cb(null);
          });
          creds.refresh(function() {
            creds.getId(function(err, id) {
              expect(id).to.equal('IDENTITY-ID2');
              return expect(creds.getStorage('id')).to.equal('IDENTITY-ID2');
            });

            setupCreds({
              LoginId: 'LOGINIDB'
            });
            expect(creds.getStorage('id')).not.to.equal('IDENTITY-ID2');
            creds.params.LoginId = 'LOGINIDA';
            creds.clearCachedId();
            done();
          });
        });
        return it('allows access to cached identityId even after a failed attempt to refresh credentials', function() {
          creds.setStorage('id', 'MYID');
          return expect(creds.identityId).to.equal('MYID');
        });
      });
    });
    if (typeof Promise === 'function') {
      return describe('promises', function() {
        var catchFunction, err, mockCred;
        err = null;
        mockCred = null;
        catchFunction = function(e) {
          return err = e;
        };
        beforeEach(function() {
          return AWS.util.addPromises(AWS.Credentials, Promise);
        });
        beforeEach(function() {
          err = null;
          return mockCred = new helpers.MockCredentialsProvider();
        });
        describe('getPromise', function() {
          var spy;
          spy = null;
          beforeEach(function() {
            return spy = helpers.spyOn(mockCred, 'refresh').andCallThrough();
          });
          it('resolves when get is successful', function() {
            return mockCred.getPromise().then(function() {
              expect(spy.calls.length).to.equal(1);
              expect(err).to.be['null'];
              expect(mockCred.accessKeyId).to.equal('akid');
              return expect(mockCred.secretAccessKey).to.equal('secret');
            });
          });
          return it('rejects when get is unsuccessful', function() {
            mockCred.forceRefreshError = true;
            return mockCred.getPromise()['catch'](catchFunction).then(function() {
              expect(spy.calls.length).to.equal(1);
              expect(err).to.not.be['null'];
              expect(err.code).to.equal('MockCredentialsProviderFailure');
              expect(err.message).to.equal('mock credentials refresh error');
              expect(mockCred.accessKeyId).to.be.undefined;
              return expect(mockCred.secretAccessKey).to.be.undefined;
            });
          });
        });
        return describe('refreshPromise', function() {
          it('resolves when refresh is successful', function() {
            var refreshError;
            refreshError = false;
            return mockCred.refreshPromise().then(function() {
              expect(err).to.be['null'];
              expect(mockCred.accessKeyId).to.equal('akid');
              return expect(mockCred.secretAccessKey).to.equal('secret');
            });
          });
          return it('rejects when refresh is unsuccessful', function() {
            mockCred.forceRefreshError = true;
            return mockCred.refreshPromise()['catch'](catchFunction).then(function() {
              expect(err).to.not.be['null'];
              expect(err.code).to.equal('MockCredentialsProviderFailure');
              expect(err.message).to.equal('mock credentials refresh error');
              expect(mockCred.accessKeyId).to.be.undefined;
              return expect(mockCred.secretAccessKey).to.be.undefined;
            });
          });
        });
      });
    }
  });

}).call(this);

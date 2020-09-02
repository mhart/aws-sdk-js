(function() {
  var AWS, helpers;

  helpers = require('../helpers');

  AWS = helpers.AWS;

  describe('AWS.STS', function() {
    var sts;
    sts = null;
    beforeEach(function() {
      return sts = new AWS.STS();
    });
    describe('credentialsFrom', function() {

      it('returns null if no data is provided', function() {
        return expect(sts.credentialsFrom(null)).to.equal(null);
      });

      it('creates a TemporaryCredentials object with hydrated data', function() {
        var creds;
        creds = sts.credentialsFrom({
          Credentials: {
            AccessKeyId: 'KEY',
            SecretAccessKey: 'SECRET',
            SessionToken: 'TOKEN',
            Expiration: new Date(0)
          }
        });
        expect(creds instanceof AWS.TemporaryCredentials);
        expect(creds.accessKeyId).to.equal('KEY');
        expect(creds.secretAccessKey).to.equal('SECRET');
        expect(creds.sessionToken).to.equal('TOKEN');
        expect(creds.expireTime).to.eql(new Date(0));
        return expect(creds.expired).to.equal(false);
      });

      it('updates an existing Credentials object with hydrated data', function() {
        var creds, data;
        data = {
          Credentials: {
            AccessKeyId: 'KEY',
            SecretAccessKey: 'SECRET',
            SessionToken: 'TOKEN',
            Expiration: new Date(0)
          }
        };
        creds = new AWS.Credentials;
        sts.credentialsFrom(data, creds);
        expect(creds).to.be.instanceOf(AWS.Credentials);
        expect(creds.accessKeyId).to.equal('KEY');
        expect(creds.secretAccessKey).to.equal('SECRET');
        expect(creds.sessionToken).to.equal('TOKEN');
        expect(creds.expireTime).to.eql(new Date(0));
        return expect(creds.expired).to.equal(false);
      });
    });

    describe('assumeRoleWithWebIdentity', function() {
      var service;
      service = new AWS.STS;
      it('sends an unsigned POST request', function() {
        var params;
        helpers.mockHttpResponse(200, {}, '{}');
        params = {
          RoleArn: 'ARN',
          RoleSessionName: 'NAME',
          WebIdentityToken: 'TOK'
        };
        return service.assumeRoleWithWebIdentity(params, function() {
          var hr;
          hr = this.request.httpRequest;
          expect(hr.method).to.equal('POST');
          expect(hr.body).to.equal('Action=AssumeRoleWithWebIdentity&' + 'RoleArn=ARN&RoleSessionName=NAME&Version=' + service.api.apiVersion + '&WebIdentityToken=TOK');
          expect(hr.headers['Authorization']).to.equal(void 0);
          expect(hr.headers['Content-Type']).to.equal('application/x-www-form-urlencoded; charset=utf-8');
          return expect(hr.path).to.equal('/');
        });
      });

      it('can build a post request on a mounted path (custom endpoint)', function() {
        var params;
        helpers.mockHttpResponse(200, {}, '{}');
        service = new AWS.STS({
          endpoint: 'http://localhost/foo/bar'
        });
        params = {
          RoleArn: 'ARN',
          RoleSessionName: 'NAME',
          WebIdentityToken: 'TOK'
        };
        return service.assumeRoleWithWebIdentity(params, function() {
          var hr;
          hr = this.request.httpRequest;
          expect(hr.path).to.equal('/foo/bar');
          return expect(hr.body).to.equal('Action=AssumeRoleWithWebIdentity&' + 'RoleArn=ARN&RoleSessionName=NAME&Version=' + service.api.apiVersion + '&WebIdentityToken=TOK');
        });
      });
    });

    describe('assumeRoleWithSAML', function() {
      var service;
      service = new AWS.STS;
      return it('sends an unsigned POST request', function() {
        var params;
        helpers.mockHttpResponse(200, {}, '{}');
        params = {
          RoleArn: 'ARN',
          PrincipalArn: 'PARN',
          SAMLAssertion: 'OK'
        };
        return service.assumeRoleWithSAML(params, function() {
          var hr;
          hr = this.request.httpRequest;
          expect(hr.method).to.equal('POST');
          expect(hr.body).to.equal('Action=AssumeRoleWithSAML&' + 'PrincipalArn=PARN&RoleArn=ARN&SAMLAssertion=OK&' + 'Version=' + service.api.apiVersion);
          expect(hr.headers['Authorization']).to.equal(void 0);
          expect(hr.headers['Content-Type']).to.equal('application/x-www-form-urlencoded; charset=utf-8');
          return expect(hr.path).to.equal('/');
        });
      });
    });

    describe('regional endpoints', function() {
      describe('stsRegionalConfig client config', function() {
        it ('should set the service client stsRegionalConfig config', function() {
          helpers.mockHttpResponse(200, {}, '{}');
          var values = ['regional', 'RegionaL', 'legacy', 'LegacY'];
          for (var i = 0; i < values.length; i++) {
            var sts = new AWS.STS({stsRegionalEndpoints: values[i]});
            var request = sts.getCallerIdentity().build(function() {});
            expect(['regional', 'legacy'].indexOf(request.service.config.stsRegionalEndpoints) >= 0).to.equal(true);
          }
        });

        it('should throw if the config is set to invalid values', function() {
          helpers.mockHttpResponse(200, {}, '{}');
          var values = ['foo', 'bar', 'region'];
          var errors = [];
          for (var i = 0; i < values.length; i++) {
            var sts = new AWS.STS({stsRegionalEndpoints: values[i]});
            sts.getCallerIdentity().build(function(err) {
              errors.push(err);
            });
          }
          expect(errors.length).to.equal(values.length);
          for (var i = 0; i < errors.length; i++) {
            expect(errors[i].code).to.equal('InvalidConfiguration');
          }
        });
      });

      if (AWS.util.isNode()) {
        describe('AWS_STS_REGIONAL_ENDPOINTS environmental variable', function() {
          var originalEnv;
          beforeEach(function() {
            originalEnv = process.env;
            process.env = {};
          });
          afterEach(function() {
            process.env = originalEnv;
          });
          it('should be used if client config is not set', function() {
            process.env.AWS_STS_REGIONAL_ENDPOINTS = 'Regional';
            var sts = new AWS.STS();
            sts.getCallerIdentity().build(function(err) {});
            expect(sts.config.stsRegionalEndpoints).to.equal('regional');
            process.env.AWS_STS_REGIONAL_ENDPOINTS = 'LegacY';
            sts = new AWS.STS();
            sts.getCallerIdentity().build(function(err) {});
            expect(sts.config.stsRegionalEndpoints).to.equal('legacy');
          });

          it('should throw if the config is set to invalid values', function() {
            var values = ['foo', 'bar', 'region'];
            var errors = [];
            for (var i = 0; i < values.length; i++) {
              process.env.AWS_STS_REGIONAL_ENDPOINTS = values[i];
              sts = new AWS.STS();
              sts.getCallerIdentity().build(function(err) {
                errors.push(err);
              });
            }
            expect(errors.length).to.equal(values.length);
            for (var i = 0; i < errors.length; i++) {
              expect(errors[i].code).to.equal('InvalidEnvironmentalVariable');
            }
          });
        });

        describe('sts_regional_endpoints config file entry', function() {
          it('should be used if environmental variable is not set', function() {
            helpers.spyOn(AWS.util, 'getProfilesFromSharedConfig').andReturn({
              default: {
                sts_regional_endpoints: 'RegionaL'
              }
            });
            var sts = new AWS.STS();
            sts.getCallerIdentity().build(function() {});
            expect(sts.config.stsRegionalEndpoints).to.equal('regional');
            helpers.spyOn(AWS.util, 'getProfilesFromSharedConfig').andReturn({
              default: {
                sts_regional_endpoints: 'LegaCy'
              }
            });
            var sts = new AWS.STS();
            sts.getCallerIdentity().build(function() {});
            expect(sts.config.stsRegionalEndpoints).to.equal('legacy');
          });
          it('should throw if the config is set to invalid values', function() {
            var values = ['foo', 'bar', 'region'];
            var errors = [];
            for (var i = 0; i < values.length; i++) {
              helpers.spyOn(AWS.util, 'getProfilesFromSharedConfig').andReturn({
                default: {
                  sts_regional_endpoints: values[i]
                }
              });
              sts = new AWS.STS();
              sts.getCallerIdentity().build(function(err) {
                errors.push(err);
              });
            }
            expect(errors.length).to.equal(values.length);
            for (var i = 0; i < errors.length; i++) {
              expect(errors[i].code).to.equal('InvalidConfiguration');
            }
          });
        });
      }

      describe('service client stsRegionalConfig config', function() {
        var originalRegion;
        var originalEnv;
        beforeEach(function() {
          originalRegion = AWS.config.region;
          AWS.config.region = undefined;
          //fix CodeBuild test because it comes with AWS_REGION in environment
          if (AWS.util.isNode()) {
            originalEnv = process.env;
            process.env = originalEnv;
          }
        });
        afterEach(function() {
          AWS.config.region = originalRegion;
          if (AWS.util.isNode()) {
            process.env = {};
          }
        });
        it('should use global endpoints for when config is undefined', function() {
          var regions = ['us-west-2', 'ap-east-1'];
          for (var i = 0; i < regions.length; i++) {
            var sts = new AWS.STS({region: regions[i]});
            var request = sts.getCallerIdentity().build(function() {});
            expect(request.httpRequest.endpoint.hostname).to.equal('sts.amazonaws.com');
          }
          var sts = new AWS.STS({region: 'cn-north-1'});
          request = sts.getCallerIdentity().build(function() {});
          expect(request.httpRequest.endpoint.hostname).to.equal('sts.cn-north-1.amazonaws.com.cn');
        });
        it('should use global endpoints for when config is set to legacy', function() {
          var regions = ['us-west-2', 'ap-east-1'];
          for (var i = 0; i < regions.length; i++) {
            var sts = new AWS.STS({region: regions[i], stsRegionalEndpoints: 'legacy'});
            var request = sts.getCallerIdentity().build(function() {});
            expect(request.httpRequest.endpoint.hostname).to.equal('sts.amazonaws.com');
          }
          var sts = new AWS.STS({region: 'cn-north-1', stsRegionalEndpoints: 'legacy'});
          request = sts.getCallerIdentity().build(function() {});
          expect(request.httpRequest.endpoint.hostname).to.equal('sts.cn-north-1.amazonaws.com.cn');
        });
        it('should use regional endpoints for when config is set to regional', function() {
          var regions = ['us-west-2', 'ap-east-1'];
          for (var i = 0; i < regions.length; i++) {
            var sts = new AWS.STS({region: regions[i], stsRegionalEndpoints: 'regional'});
            var request = sts.getCallerIdentity().build(function() {});
            expect(request.httpRequest.endpoint.hostname).to.equal('sts.' + regions[i] + '.amazonaws.com');
          }
          var sts = new AWS.STS({region: 'cn-north-1', stsRegionalEndpoints: 'regional'});
          request = sts.getCallerIdentity().build(function() {});
          expect(request.httpRequest.endpoint.hostname).to.equal('sts.cn-north-1.amazonaws.com.cn');
        });
        it('should ask for region if stsRegionalEndpoints is set', function() {
          var error;
          sts = new AWS.STS({stsRegionalEndpoints: 'regional'});
          sts.getCallerIdentity().build(function(err) {
            error = err;
          });
          expect(error.code).to.equal('ConfigError');
          expect(error.message).to.equal('Missing region in config');
        });
      });
    });
  });

}).call(this);

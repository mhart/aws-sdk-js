(function() {
  var AWS, buildRequest, buildSigner, helpers;

  helpers = require('../helpers');

  AWS = helpers.AWS;

  buildRequest = function() {
    var ddb, req;
    ddb = new AWS.DynamoDB({
      region: 'region',
      endpoint: 'localhost',
      apiVersion: '2011-12-05'
    });
    req = ddb.makeRequest('listTables', {
      ExclusiveStartTableName: 'bår'
    });
    req.build();
    req.httpRequest.headers['X-Amz-User-Agent'] = 'aws-sdk-js/0.1';
    return req.httpRequest;
  };

  buildSigner = function(request, options) {
    return new AWS.Signers.V4(request || buildRequest(), 'dynamodb', options);
  };

  describe('AWS.Signers.V4', function() {
    var authorization, creds, date, datetime, signature, signer;
    date = new Date(1935346573456);
    datetime = AWS.util.date.iso8601(date).replace(/[:\-]|\.\d{3}/g, '');
    creds = null;
    signature = '31fac5ed29db737fbcafac527470ca6d9283283197c5e6e94ea40ddcec14a9c1';
    authorization = 'AWS4-HMAC-SHA256 Credential=akid/20310430/region/dynamodb/aws4_request, ' + 'SignedHeaders=host;x-amz-content-sha256;x-amz-date;x-amz-security-token;x-amz-target;x-amz-user-agent, ' + 'Signature=' + signature;
    signer = null;
    beforeEach(function() {
      helpers.spyOn(AWS.util, 'userAgent').andReturn('aws-sdk-js/0.1');
      creds = {
        accessKeyId: 'akid',
        secretAccessKey: 'secret',
        sessionToken: 'session'
      };
      signer = buildSigner();
      return signer.addAuthorization(creds, date);
    });
    describe('constructor', function() {
      it('can build a signer for a request object', function() {
        var req;
        req = buildRequest();
        signer = buildSigner(req);
        return expect(signer.request).to.equal(req);
      });
      it('can accept an options object', function() {
        var operation, req;
        req = buildRequest();
        operation = {
          fake: 'bag'
        };
        signer = buildSigner(req, {
          signatureCache: true,
          operation: operation
        });
        expect(signer.signatureCache).to.equal(true);
        return expect(signer.operation).to.equal(operation);
      });
      it('can set signatureCache to false', function() {
        var operation, req;
        req = buildRequest();
        operation = {
          fake: 'bag'
        };
        signer = buildSigner(req, {
          signatureCache: false
        });
        return expect(signer.signatureCache).to.equal(false);
      });
      return it('defaults signatureCache to true', function() {
        var operation, req;
        req = buildRequest();
        operation = {
          fake: 'bag'
        };
        signer = buildSigner(req);
        return expect(signer.signatureCache).to.equal(true);
      });
    });
    describe('addAuthorization', function() {
      var func, headers, key, results, value;
      headers = {
        'Content-Type': 'application/x-amz-json-1.0',
        'Content-Length': 34,
        'X-Amz-Target': 'DynamoDB_20111205.ListTables',
        'Host': 'localhost',
        'X-Amz-Date': datetime,
        'x-amz-security-token': 'session',
        'Authorization': authorization
      };
      results = [];
      for (key in headers) {
        value = headers[key];
        func = function(k) {
          return it('should add ' + k + ' header', function() {
            return expect(signer.request.headers[k]).to.equal(headers[k]);
          });
        };
        results.push(func(key));
      }
      return results;
    });
    describe('authorization', function() {
      return it('should return authorization part for signer', function() {
        return expect(signer.authorization(creds, datetime)).to.equal(authorization);
      });
    });
    describe('signature', function() {
      it('should generate proper signature', function() {
        return expect(signer.signature(creds, datetime)).to.equal(signature);
      });
      return it('should not compute SHA 256 checksum more than once', function() {
        var spy;
        spy = helpers.spyOn(AWS.util.crypto, 'sha256').andCallThrough();
        signer.signature(creds, datetime);
        return expect(spy.calls.length).to.eql(1);
      });
    });
    describe('stringToSign', function() {
      return it('should sign correctly generated input string', function() {
        return expect(signer.stringToSign(datetime)).to.equal('AWS4-HMAC-SHA256\n' + datetime + '\n' + '20310430/region/dynamodb/aws4_request\n' + signer.hexEncodedHash(signer.canonicalString()));
      });
    });
    describe('canonicalString', function() {
      it('sorts the search string', function() {
        var req;
        req = new AWS.CloudSearchDomain({
          endpoint: 'host.domain.com'
        }).search({
          query: 'foo',
          cursor: 'initial',
          queryOptions: '{}'
        }).removeListener('build', AWS.CloudSearchDomain.prototype.convertGetToPost).build();
        signer = new AWS.Signers.V4(req.httpRequest, 'cloudsearchdomain');
        return expect(signer.canonicalString().split('\n')[2]).to.equal('cursor=initial&format=sdk&pretty=true&q=foo&q.options=%7B%7D');
      });

      it('double URI encodes paths for non S3 services', function() {
        var req;
        req = new AWS.CognitoSync().listDatasets({
          IdentityPoolId: 'id',
          IdentityId: 'a:b:c'
        }).build();
        signer = new AWS.Signers.V4(req.httpRequest, 'cognito-identity');
        return expect(signer.canonicalString().split('\n')[1]).to.equal('/identitypools/id/identities/a%253Ab%253Ac/datasets');
      });

      it('does not double encode path for S3', function() {
        var req;
        req = new AWS.S3().getObject({
          Bucket: 'bucket',
          Key: 'a:b:c'
        }).build();
        signer = new AWS.Signers.V4(req.httpRequest, 's3');
        return expect(signer.canonicalString().split('\n')[1]).to.equal('/a%3Ab%3Ac');
      });

      it('does not double encode path for signature version s3v4', function() {
        var api = {
          metadata: {
            protocol: 'rest-xml',
            signatureVersion: 's3v4',
          },
          operations: {
            AnOperation: {
              name: 'anOperation',
              http: {
                requestUri: '/fakepath/{Entry}'
              },
              input: {
                type: 'structure',
                members: {
                  Entry: {
                    location: 'uri'
                  }
                }
              }
            }
          }
        };
        var Mockservice = helpers.MockServiceFromApi(api);
        var client = new Mockservice();
        req = client.makeRequest('anOperation', {Entry: 'test:test'}).build();
        signer = new AWS.Signers.V4(req.httpRequest, 'fake-service', {
          signatureVersion: req.service.api.signatureVersion
        });
        expect(signer.canonicalString().split('\n')[1]).to.equal('/fakepath/test%3Atest');
      });
    });

    describe('canonicalHeaders', function() {
      it('should return headers', function() {
        return expect(signer.canonicalHeaders()).to.eql(['host:localhost', 'x-amz-content-sha256:3128b8d4f3108b3e1677a38eb468d1c6dec926a58eaea235d034b9c71c3864d4', 'x-amz-date:' + datetime, 'x-amz-security-token:session', 'x-amz-target:DynamoDB_20111205.ListTables', 'x-amz-user-agent:aws-sdk-js/0.1'].join('\n'));
      });

      it('should ignore Authorization header', function() {
        signer.request.headers = {
          'Authorization': 'foo'
        };
        return expect(signer.canonicalHeaders()).to.equal('');
      });

      it('should ignore X-Amzn-Trace-Id header', function() {
        signer.request.headers = {
          'X-Amzn-Trace-Id': 'foo'
        };
        return expect(signer.canonicalHeaders()).to.equal('');
      });

      it('should lowercase all header names (not values)', function() {
        signer.request.headers = {
          'FOO': 'BAR'
        };
        return expect(signer.canonicalHeaders()).to.equal('foo:BAR');
      });

      it('should sort headers by key', function() {
        signer.request.headers = {
          abc: 'a',
          bca: 'b',
          Qux: 'c',
          bar: 'd'
        };
        return expect(signer.canonicalHeaders()).to.equal('abc:a\nbar:d\nbca:b\nqux:c');
      });

      it('should compact multiple spaces in keys/values to a single space', function() {
        signer.request.headers = {
          'Header': 'Value     with  Multiple   \t spaces'
        };
        return expect(signer.canonicalHeaders()).to.equal('header:Value with Multiple spaces');
      });

      it('should strip starting and end of line spaces', function() {
        signer.request.headers = {
          'Header': ' \t   Value  \t  '
        };
        return expect(signer.canonicalHeaders()).to.equal('header:Value');
      });

      it('should throw an error when header value is null', function() {
        signer.request.headers = {
          foo: null,
          bar: 'd'
        };
        var err;
        try {
          signer.canonicalHeaders();
        } catch (e) {
          err = e;
        }
        expect(typeof err).to.equal('object');
        expect(err.code).to.equal('InvalidHeader');
      });

      it('should throw an error when header value is undefined', function() {
        signer.request.headers = {
          foo: undefined,
          bar: 'd'
        };
        var err;
        try {
          signer.canonicalHeaders();
        } catch (e) {
          err = e;
        }
        expect(typeof err).to.equal('object');
        expect(err.code).to.equal('InvalidHeader');
      });

      it('should throw an error when header value does not have toString', function() {
        signer.request.headers = {
          foo: Object.create(null),
          bar: 'd'
        };
        var err;
        try {
          signer.canonicalHeaders();
        } catch (e) {
          err = e;
        }
        expect(typeof err).to.equal('object');
        expect(err.code).to.equal('InvalidHeader');
      });

    });
    return describe('presigned urls', function() {
      it('hoists content-type to the query string', function() {
        var req;
        req = new AWS.S3().putObject({
          Bucket: 'bucket',
          Key: 'key',
          ContentType: 'text/plain'
        }).build();
        signer = new AWS.Signers.V4(req.httpRequest, 's3');
        signer.updateForPresigned({}, '');
        return expect(signer.canonicalString().split('\n')[2]).to.contain('Content-Type=text%2Fplain');
      });
      return it('hoists content-md5 to the query string', function() {
        var req;
        req = new AWS.S3().putObject({
          Bucket: 'bucket',
          Key: 'key',
          ContentMD5: 'foobar=='
        }).build();
        signer = new AWS.Signers.V4(req.httpRequest, 's3');
        signer.updateForPresigned({}, '');
        return expect(signer.canonicalString().split('\n')[2]).to.contain('Content-MD5=foobar%3D%3D');
      });
    });
  });

}).call(this);

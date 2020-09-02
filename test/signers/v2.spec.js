(function() {
  var AWS;

  AWS = require('../helpers').AWS;

  describe('AWS.Signers.V2', function() {
    var buildRequest, buildSigner, credentials, date, request, signRequest, signer, stringify;
    credentials = null;
    date = null;
    request = null;
    signer = null;
    buildRequest = function() {
      request = new AWS.HttpRequest(new AWS.Endpoint('localhost'));
      request.params = {};
      return request;
    };
    buildSigner = function(request) {
      return new AWS.Signers.V2(request);
    };
    signRequest = function(request) {
      signer = new AWS.Signers.V2(request);
      return signer.addAuthorization(credentials, date);
    };
    beforeEach(function() {
      credentials = {
        accessKeyId: 'akid',
        secretAccessKey: 'secret'
      };
      date = new Date(1935346573456);
      return signRequest(buildRequest());
    });
    stringify = AWS.util.queryParamsToString;
    describe('constructor', function() {
      return it('builds a signer for a request object', function() {
        return expect(signer.request).to.equal(request);
      });
    });
    return describe('addAuthorization', function() {
      it('adds a url encoded iso8601 timestamp param', function() {
        return expect(stringify(request.params)).to.match(/Timestamp=2031-04-30T20%3A16%3A13Z/);
      });
      it('adds a SignatureVersion param', function() {
        return expect(stringify(request.params)).to.match(/SignatureVersion=2/);
      });
      it('adds a SignatureMethod param', function() {
        return expect(stringify(request.params)).to.match(/SignatureMethod=HmacSHA256/);
      });
      it('adds an AWSAccessKeyId param', function() {
        return expect(stringify(request.params)).to.match(/AWSAccessKeyId=akid/);
      });
      it('omits SecurityToken when sessionToken has been omitted', function() {
        return expect(stringify(request.params)).not.to.match(/SecurityToken/);
      });
      it('adds the SecurityToken when sessionToken is provided', function() {
        credentials.sessionToken = 'session';
        signRequest(buildRequest());
        return expect(stringify(request.params)).to.match(/SecurityToken=session/);
      });
      it('populates the body', function() {
        return expect(request.body).to.equal('AWSAccessKeyId=akid&Signature=6g8SME09kuR%2FVYtVhDoXRqXsZDb7%2FPcjEVDKHJB%2BZe8%3D&SignatureMethod=HmacSHA256&SignatureVersion=2&Timestamp=2031-04-30T20%3A16%3A13Z');
      });
      it('populates content-length header', function() {
        return expect(request.headers['Content-Length']).to.equal(163);
      });
      return it('signs additional body params', function() {
        request = buildRequest();
        request.params['Param.1'] = 'abc';
        request.params['Param.2'] = 'xyz';
        signRequest(request);
        return expect(request.body).to.equal('AWSAccessKeyId=akid&Param.1=abc&Param.2=xyz&Signature=hoA%2F%2FTha7KYkewoZbCMC8NQIcixNQd5U6WNLk%2B%2BKl%2FU%3D&SignatureMethod=HmacSHA256&SignatureVersion=2&Timestamp=2031-04-30T20%3A16%3A13Z');
      });
    });
  });

}).call(this);

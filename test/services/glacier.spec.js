(function() {
  var AWS, Buffer, helpers;

  helpers = require('../helpers');

  AWS = helpers.AWS;

  Buffer = AWS.util.Buffer;

  if (AWS.util.isNode()) {
    describe('AWS.Glacier', function() {
      var agentHeader, glacier;
      glacier = null;
      agentHeader = null;
      if (AWS.util.isBrowser()) {
        agentHeader = 'X-Amz-User-Agent';
      } else {
        agentHeader = 'User-Agent';
      }
      beforeEach(function() {
        return glacier = new AWS.Glacier();
      });
      describe('building requests', function() {
        it('sets accountId to "-" if not set', function() {
          var req;
          req = glacier.listVaults();
          req.emit('validate', [req]);
          req.emit('build', [req]);
          return expect(req.httpRequest.path).to.equal('/-/vaults');
        });
        it('will not override accountId if set', function() {
          var req;
          req = glacier.listVaults({
            accountId: 'ABC123'
          });
          req.emit('validate', [req]);
          req.emit('build', [req]);
          return expect(req.httpRequest.path).to.equal('/ABC123/vaults');
        });
        it('computes the SHA 256 checksum header only once', function() {
          var req, spy;
          spy = helpers.spyOn(AWS.util.crypto, 'sha256').andCallThrough();
          req = glacier.uploadArchive({
            vaultName: 'foo',
            body: 'bar'
          });
          req.removeAllListeners('sign');
          req.build();
          return expect(spy.calls.length).to.eql(1);
        });
        return it('adds linear and tree hash headers to payload requests', function() {
          var headers, req;
          headers = {
            'x-amz-glacier-version': '2012-06-01',
            'X-Amz-Content-Sha256': 'fcde2b2edba56bf408601fb721fe9b5c338d10ee429ea04fae5511b68fbf8fb9',
            'x-amz-sha256-tree-hash': 'fcde2b2edba56bf408601fb721fe9b5c338d10ee429ea04fae5511b68fbf8fb9',
            'Content-Length': 3,
            'Content-Type': 'binary/octet-stream',
            Host: 'glacier.mock-region.amazonaws.com'
          };
          headers[agentHeader] = AWS.util.userAgent();
          req = glacier.uploadArchive({
            vaultName: 'foo',
            body: 'bar'
          });
          req.removeAllListeners('sign');
          req.build();
          return expect(req.httpRequest.headers).to.eql(headers);
        });
      });
      describe('computeChecksums', function() {
        return it('returns correct linear and tree hash for buffer data', function() {
          var data, expected;
          data = AWS.util.buffer.alloc(1024 * 1024 * 5.5);
          data.fill('0');
          expected = {
            linearHash: '68aff0c5a91aa0491752bfb96e3fef33eb74953804f6a2f7b708d5bcefa8ff6b',
            treeHash: '154e26c78fd74d0c2c9b3cc4644191619dc4f2cd539ae2a74d5fd07957a3ee6a'
          };
          return expect(glacier.computeChecksums(data)).to.eql(expected);
        });
      });
      describe('initiateJob', function() {
        return it('correctly builds the request', function() {
          var params;
          helpers.mockHttpResponse(200, {}, '');
          params = {
            vaultName: 'vault-name',
            jobParameters: {
              Format: 'foo',
              Type: 'bar'
            }
          };
          return glacier.initiateJob(params, function(err, data) {
            var req;
            req = this.request.httpRequest;
            expect(req.path).to.equal('/-/vaults/vault-name/jobs');
            return expect(req.body).to.equal('{"Format":"foo","Type":"bar"}');
          });
        });
      });
      return describe('uploadArchive', function() {
        return it('passes the body along', function() {
          var params;
          helpers.mockHttpResponse(200, {}, '');
          params = {
            vaultName: 'vault-name',
            body: 'abc'
          };
          return glacier.uploadArchive(params, function(err, data) {
            var req;
            req = this.request.httpRequest;
            expect(req.method).to.equal('POST');
            expect(req.path).to.equal('/-/vaults/vault-name/archives');
            return expect(req.body).to.equal('abc');
          });
        });
      });
    });
  }

}).call(this);

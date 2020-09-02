(function() {
  var AWS, helpers;

  helpers = require('../helpers');

  AWS = helpers.AWS;

  describe('AWS.EC2', function() {
    var ec2;
    ec2 = new AWS.EC2();
    describe('proxy support', function() {
      return it('always sets Host header to correct endpoint', function() {
        helpers.mockHttpResponse(200, {}, '');
        ec2 = new AWS.EC2({
          httpOptions: {
            proxy: 'http://__INVALID_HOSTNAME__:9999'
          }
        });
        return ec2.makeRequest('describeInstances', function() {
          return expect(this.request.httpRequest.headers.Host).to.equal('ec2.mock-region.amazonaws.com');
        });
      });
    });
    describe('copySnapshot', function() {
      return it('generates PresignedUrl and DestinationRegion parameters', function() {
        var params;
        helpers.spyOn(AWS.EC2.prototype, 'getSkewCorrectedDate').andReturn(new Date(0));
        helpers.mockHttpResponse(200, {}, '');
        params = {
          SourceRegion: 'src-region',
          SourceSnapshotId: 'snap-123456789'
        };
        return ec2.copySnapshot(params, function() {
          var parts;
          parts = this.request.httpRequest.body.split('&').sort();
          return [
            'Action=CopySnapshot',
            'DestinationRegion=mock-region',
            'PresignedUrl=https%3A%2F%2Fec2.src-region.amazonaws.com%2F%3F' +
            'Action%3DCopySnapshot%26DestinationRegion%3Dmock-region%26SourceRegion%3Dsrc-region' +
            '%26SourceSnapshotId%3Dsnap-123456789%26Version%3D2016-11-15' +
            '%26X-Amz-Algorithm%3DAWS4-HMAC-SHA256%26X-Amz-Credential%3Dakid%252F19700101' +
            '%252Fsrc-region%252Fec2%252Faws4_request%26X-Amz-Date%3D19700101T000000Z' +
            '%26X-Amz-Expires%3D3600%26X-Amz-Security-Token%3Dsession' +
            '%26X-Amz-Signature%3De322173cd374af0ef234e8661f4d4a0420d12286cdc0745d75b8b405caefd6a9' +
            '%26X-Amz-SignedHeaders%3Dhost',
            'SourceRegion=src-region',
            'SourceSnapshotId=snap-123456789'
          ].forEach(function(i) {
            return expect(parts).to.contain(i);
          });
        });
      });
    });
    describe('describeTags', function() {
      return it('generates correct request parameters', function() {
        var req;
        req = ec2.describeTags({
          Filters: [
            {
              Name: 'filter',
              Values: ['v1', 'v2']
            }
          ]
        });
        req.build();
        return expect(req.httpRequest.params).to.eql({
          Action: 'DescribeTags',
          Version: ec2.api.apiVersion,
          'Filter.1.Name': 'filter',
          'Filter.1.Value.1': 'v1',
          'Filter.1.Value.2': 'v2'
        });
      });
    });
    return describe('parseResponse', function() {
      var body, parse;
      body = '';
      parse = function(callback) {
        helpers.mockHttpResponse(400, {}, body);
        return ec2.makeRequest('describeInstances', function(error, data) {
          return callback.call(this, error, data);
        });
      };
      return describe('with error', function() {
        beforeEach(function() {
          return body = '<Response>\n  <Errors>\n    <Error>\n      <Code>InvalidInstanceID.Malformed</Code>\n      <Message>Invalid id: "i-12345678"</Message>\n    </Error>\n  </Errors>\n  <RequestID>ab123mno-6432-dceb-asdf-123mno543123</RequestID>\n</Response>';
        });
        it('extracts the error code', function() {
          return parse(function(error, data) {
            expect(error.code).to.equal('InvalidInstanceID.Malformed');
            return expect(data).to.equal(null);
          });
        });
        it('extracts the error message', function() {
          return parse(function(error, data) {
            expect(error.message).to.equal('Invalid id: "i-12345678"');
            return expect(data).to.equal(null);
          });
        });
        it('returns an empty error when the body is blank', function() {
          body = '';
          return parse(function(error, data) {
            expect(error.code).to.equal(400);
            expect(error.message).to.equal(null);
            return expect(data).to.equal(null);
          });
        });
        return it('extracts the request id', function() {
          return parse(function(error, data) {
            expect(error.requestId).to.equal('ab123mno-6432-dceb-asdf-123mno543123');
            return expect(data).to.equal(null);
          });
        });
      });
    });
  });

}).call(this);

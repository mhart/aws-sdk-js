(function() {
  var AWS, helpers;

  helpers = require('../helpers');

  AWS = helpers.AWS;

  describe('AWS.Route53', function() {
    var api, service;
    service = null;
    api = null;
    beforeEach(function() {
      service = new AWS.Route53();
      return api = service.api.apiVersion;
    });
    describe('setEndpoint', function() {
      it('always enables SSL if no endpoint is set', function() {
        service = new AWS.Route53({
          sslEnabled: false
        });
        return expect(service.endpoint.protocol).to.equal('https:');
      });
      return it('allows overriding SSL if custom endpoint is set', function() {
        service = new AWS.Route53({
          endpoint: 'http://example.com'
        });
        return expect(service.endpoint.protocol).to.equal('http:');
      });
    });
    describe('building requests', function() {
      service = new AWS.Route53;
      it('should fix hosted zone ID on input', function() {
        var req;
        req = service.getHostedZone({
          Id: '/hostedzone/ABCDEFG'
        });
        req.emit('build', [req]);
        return expect(req.httpRequest.path).to.match(new RegExp('/hostedzone/ABCDEFG$'));
      });
      return it('should fix health check ID on input', function() {
        var req;
        req = service.getHealthCheck({
          HealthCheckId: '/healthcheck/ABCDEFG'
        });
        req.emit('build', [req]);
        return expect(req.httpRequest.path).to.match(new RegExp('/healthcheck/ABCDEFG$'));
      });
    });
    describe('changeResourceRecordSets', function() {
      return it('correctly builds the XML document', function() {
        var params, xml;
        xml = '<ChangeResourceRecordSetsRequest xmlns="https://route53.amazonaws.com/doc/' + api + '/">\n  <ChangeBatch>\n    <Comment>comment</Comment>\n    <Changes>\n      <Change>\n        <Action>CREATE</Action>\n        <ResourceRecordSet>\n          <Name>name</Name>\n          <Type>type</Type>\n          <ResourceRecords>\n            <ResourceRecord>\n              <Value>foo.com</Value>\n            </ResourceRecord>\n          </ResourceRecords>\n        </ResourceRecordSet>\n      </Change>\n    </Changes>\n  </ChangeBatch>\n</ChangeResourceRecordSetsRequest>';
        helpers.mockHttpResponse(200, {}, '');
        params = {
          HostedZoneId: 'zone-id',
          ChangeBatch: {
            Changes: [
              {
                ResourceRecordSet: {
                  Name: 'name',
                  Type: 'type',
                  ResourceRecords: [
                    {
                      Value: 'foo.com'
                    }
                  ]
                },
                Action: 'CREATE'
              }
            ],
            Comment: 'comment'
          }
        };
        return service.changeResourceRecordSets(params, function(err, data) {
          return helpers.matchXML(this.request.httpRequest.body, xml);
        });
      });
    });
    return describe('retryableError', function() {
      it('retryableError returns true for PriorRequestNotComplete errors', function() {
        var err;
        err = {
          code: 'PriorRequestNotComplete',
          statusCode: 400
        };
        return expect(service.retryableError(err)).to.be['true'];
      });
      return it('retryableError returns false for other 400 errors', function() {
        var err;
        err = {
          code: 'SomeErrorCode',
          statusCode: 400
        };
        return expect(service.retryableError(err)).to.be['false'];
      });
    });
  });

}).call(this);

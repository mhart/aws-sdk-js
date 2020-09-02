(function() {
  var AWS, helpers;

  helpers = require('../helpers');

  AWS = helpers.AWS;

  describe('AWS.CloudFront', function() {
    var cf;
    cf = null;
    beforeEach(function() {
      return cf = new AWS.CloudFront();
    });
    describe('signing', function() {
      return it('signs with us-east-1 region', function() {
        helpers.mockHttpResponse(200, {}, '');
        return cf.listDistributions(function() {
          var auth;
          auth = this.request.httpRequest.headers['Authorization'];
          return expect(auth).to.match(/\/us-east-1\/cloudfront\/aws4_request/);
        });
      });
    });
    return describe('createInvalidation', function() {
      return it('correctly builds the request', function() {
        var api, params, xml;
        helpers.mockHttpResponse(200, {}, '');
        api = cf.api.apiVersion;
        xml = '<InvalidationBatch xmlns="http://cloudfront.amazonaws.com/doc/' + api + '/">\n  <Paths>\n    <Quantity>2</Quantity>\n    <Items>\n      <Path>path1</Path>\n      <Path>path2</Path>\n    </Items>\n  </Paths>\n  <CallerReference>abc</CallerReference>\n</InvalidationBatch>';
        params = {
          DistributionId: 'ID',
          InvalidationBatch: {
            Paths: {
              Quantity: 2,
              Items: ['path1', 'path2']
            },
            CallerReference: 'abc'
          }
        };
        return cf.createInvalidation(params, function(err, data) {
          var req;
          req = this.request.httpRequest;
          expect(req.path).to.equal('/' + api + '/distribution/ID/invalidation');
          return helpers.matchXML(req.body, xml);
        });
      });
    });
  });

}).call(this);

(function() {
  var AWS, Buffer, helpers;

  helpers = require('../helpers');

  AWS = helpers.AWS;

  Buffer = AWS.util.Buffer;

  describe('AWS.APIGateway', function() {
    var apigateway, request;
    apigateway = null;
    request = function(operation, params) {
      return apigateway.makeRequest(operation, params);
    };
    beforeEach(function() {
      return apigateway = new AWS.APIGateway();
    });
    describe('building a request', function() {
      var build;
      build = function(operation, params) {
        return request(operation, params).build().httpRequest;
      };
      describe('sets Accept: application/json', function() {
        it('always sets accept header', function() {
          var req;
          req = build('getApiKey', {
            apiKey: 'apiKey'
          });
          expect(req.headers['Accept']).to.equal('application/json');
          req = build('createApiKey', {});
          expect(req.headers['Accept']).to.equal('application/json');
          req = build('updateApiKey', {
            apiKey: 'apiKey'
          });
          expect(req.headers['Accept']).to.equal('application/json');
        });

        it('will not override user-specified accepts', function() {
          var req;
          req = build('getExport', {
            restApiId: 'id',
            stageName: 'name',
            exportType: 'swagger',
            accepts: 'application/yaml'
          });
          expect(req.headers['Accept']).to.equal('application/yaml');
        });

      });
    });
    return describe('response parsing', function() {
      describe('getSdk', function() {
        return it('returns the raw payload as the body', function(done) {
          var body;
          body = AWS.util.buffer.toBuffer('∂ƒ©∆');
          helpers.mockHttpResponse(200, {}, body);
          return apigateway.getSdk(function(err, data) {
            expect(data.body).to.eql(body);
            return done();
          });
        });
      });
      return describe('getExport', function() {
        it('converts the body to a string when the exportType is "swagger"', function(done) {
          var body, swaggerDoc;
          swaggerDoc = JSON.stringify({
            swagger: '2.0',
            host: 'foo.amazonaws.com'
          });
          body = AWS.util.buffer.toBuffer(swaggerDoc);
          helpers.mockHttpResponse(200, {}, body);
          return apigateway.getExport({
            exportType: 'swagger'
          }, function(err, data) {
            expect(Buffer.isBuffer(data.body)).to.be['false'];
            expect(data.body).to.eql(swaggerDoc);
            return done();
          });
        });
        return it('returns the raw payload when the exportType is not "swagger"', function(done) {
          var body, swaggerDoc;
          swaggerDoc = JSON.stringify({
            notSwagger: '2.0',
            host: 'foo.amazonaws.com'
          });
          body = AWS.util.buffer.toBuffer(swaggerDoc);
          helpers.mockHttpResponse(200, {}, body);
          return apigateway.getExport({
            exportType: 'notSwagger'
          }, function(err, data) {
            expect(Buffer.isBuffer(data.body)).to.be['true'];
            if (typeof body.equals === 'function') {
              expect(body.equals(data.body)).to.be['true'];
            } else {
              expect(body.toString()).to.equal(data.body.toString());
            }
            expect(data.body.toString()).to.eql(swaggerDoc);
            return done();
          });
        });
      });
    });
  });

}).call(this);

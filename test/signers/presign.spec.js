(function() {
  var AWS, cw, helpers;

  helpers = require('../helpers');

  AWS = helpers.AWS;

  cw = new AWS.CloudWatch({
    paramValidation: true
  });

  describe('AWS.Signers.Presign', function() {
    var resultUrl;
    resultUrl = 'https://monitoring.mock-region.amazonaws.com/?' + ('Action=ListMetrics&Version=' + cw.api.apiVersion + '&') + 'X-Amz-Algorithm=AWS4-HMAC-SHA256&' + 'X-Amz-Credential=akid%2F19700101%2Fmock-region%2Fmonitoring%2Faws4_request&' + 'X-Amz-Date=19700101T000000Z&X-Amz-Expires=3600&X-Amz-Security-Token=session&' + 'X-Amz-Signature=953bd6d74e86c12adc305f656473d614269d2f20a0c18c5edbb3d7f57ca2b439&' + 'X-Amz-SignedHeaders=host';
    beforeEach(function() {
      helpers.spyOn(cw, 'getSkewCorrectedDate').andReturn(new Date(0));
      return helpers.spyOn(AWS.util.date, 'getDate').andReturn(new Date(0));
    });
    it('presigns requests', function() {
      return cw.listMetrics().presign(function(err, url) {
        return expect(url).to.equal(resultUrl);
      });
    });
    it('presigns synchronously', function() {
      return expect(cw.listMetrics().presign()).to.equal(resultUrl);
    });
    it('throws errors on synchronous presign failures', function() {
      return expect(function() {
        return cw.listMetrics({
          InvalidParameter: true
        }).presign();
      }).to['throw'](/Unexpected key/);
    });
    it('allows specifying different expiry time', function() {
      return expect(cw.listMetrics().presign(900)).to.contain('X-Amz-Expires=900&');
    });
    it('limits expiry time to a week in SigV4', function() {
      return cw.listMetrics().presign(9999999, function(err) {
        expect(err.code).to.equal('InvalidExpiryTime');
        return expect(err.message).to.equal('Presigning does not support expiry time greater than a week with SigV4 signing.');
      });
    });
    return it('only supports s3 or v4 signers', function() {
      return new AWS.SimpleDB().listDomains().presign(function(err) {
        expect(err.code).to.equal('UnsupportedSigner');
        return expect(err.message).to.equal('Presigning only supports S3 or SigV4 signing.');
      });
    });
  });

}).call(this);

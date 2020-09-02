(function() {
  var AWS, helpers;

  helpers = require('../helpers');

  AWS = helpers.AWS;

  describe('AWS.ElasticTranscoder', function() {
    var et;
    et = null;
    beforeEach(function() {
      return et = new AWS.ElasticTranscoder();
    });
    describe('error handling', function() {
      it('should generate the correct error name', function() {
        helpers.mockHttpResponse(400, {
          'x-amzn-errortype': 'ErrorName:http://'
        }, '');
        return et.listPipelines(function(err, data) {
          return expect(err.code).to.equal('ErrorName');
        });
      });
      return it('generates generic error name if header is not present', function() {
        helpers.mockHttpResponse(400, {}, '');
        return et.listPipelines(function(err, data) {
          return expect(err.code).to.equal('UnknownError');
        });
      });
    });
    describe('cancelJob', function() {
      return it('omits the body', function() {
        var params;
        helpers.mockHttpResponse(200, {}, '');
        params = {
          Id: 'job-id'
        };
        return et.cancelJob({
          Id: 'job-id'
        }, function(err, data) {
          var req;
          req = this.request.httpRequest;
          expect(req.path).to.equal('/2012-09-25/jobs/job-id');
          return expect(req.body).to.equal('');
        });
      });
    });
    return describe('updatePipelineNotifications', function() {
      return it('only populates the body with non-uri and non-header params', function() {
        var params;
        helpers.mockHttpResponse(200, {}, '');
        params = {
          Id: 'pipeline-id',
          Notifications: {
            Progressing: 'arn1',
            Completed: 'arn2',
            Warning: 'arn3',
            Error: 'arn4'
          }
        };
        return et.updatePipelineNotifications(params, function(err, data) {
          var req;
          req = this.request.httpRequest;
          expect(req.path).to.equal('/2012-09-25/pipelines/pipeline-id/notifications');
          return expect(req.body).to.equal('{"Notifications":{"Progressing":"arn1","Completed":"arn2","Warning":"arn3","Error":"arn4"}}');
        });
      });
    });
  });

}).call(this);

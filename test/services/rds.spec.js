(function() {
  var AWS, helpers;

  helpers = require('../helpers');

  AWS = helpers.AWS;

  describe('AWS.RDS', function() {
    describe('createDBSecurityGroup', function() {
      return it('properly parses XML response', function() {
        var body, params, rds;
        rds = new AWS.RDS();
        body = '<CreateDBSecurityGroupResponse xmlns="http://rds.amazonaws.com/doc/2013-09-09/">\n  <CreateDBSecurityGroupResult>\n    <DBSecurityGroup>\n      <EC2SecurityGroups/>\n      <DBSecurityGroupDescription>foo</DBSecurityGroupDescription>\n      <IPRanges/>\n      <OwnerId>1234567890</OwnerId>\n      <DBSecurityGroupName>foo</DBSecurityGroupName>\n    </DBSecurityGroup>\n  </CreateDBSecurityGroupResult>\n  <ResponseMetadata>\n    <RequestId>1234567890</RequestId>\n  </ResponseMetadata>\n</CreateDBSecurityGroupResponse>';
        helpers.mockHttpResponse(200, {}, body);
        params = {
          DBSecurityGroupName: 'foo',
          DBSecurityGroupDescription: 'foo'
        };
        return rds.createDBSecurityGroup(params, function(error, data) {
          expect(error).to.equal(null);
          expect(this.requestId).to.equal('1234567890');
          return expect(data).to.eql({
            DBSecurityGroup: {
              DBSecurityGroupDescription: 'foo',
              DBSecurityGroupName: 'foo',
              EC2SecurityGroups: [],
              IPRanges: [],
              OwnerId: '1234567890'
            },
            ResponseMetadata: {
              RequestId: '1234567890'
            }
          });
        });
      });
    });
    return describe('copyDBSnapshot cross-region copying', function() {
      var cb, err, rds, ref, spy;
      ref = [], rds = ref[0], spy = ref[1], err = ref[2];
      cb = function(e) {
        return err = e;
      };
      beforeEach(function() {
        err = null;
        rds = new AWS.RDS({
          region: 'us-west-2',
          params: {
            SourceRegion: 'eu-central-1'
          },
          paramValidation: true
        });
        spy = helpers.spyOn(rds, 'buildCrossRegionPresignedUrl').andCallThrough();
        helpers.spyOn(AWS.RDS.prototype, 'getSkewCorrectedDate').andReturn(new Date(0));
        return helpers.spyOn(rds, 'getSkewCorrectedDate').andReturn(new Date(0));
      });
      it('builds presigned url for copyDBSnapshot', function() {
        var req;
        req = rds.copyDBSnapshot({
          SourceDBSnapshotIdentifier: 'source_id',
          TargetDBSnapshotIdentifier: 'target_id'
        });
        req.build();
        expect(req.response.error).to.equal(null);
        expect(spy.calls.length).to.equal(1);
        expect(req.params).to.eql({
          SourceDBSnapshotIdentifier: 'source_id',
          TargetDBSnapshotIdentifier: 'target_id',
          PreSignedUrl: 'https://rds.eu-central-1.amazonaws.com/?Action=CopyDBSnapshot&DestinationRegion=us-west-2&SourceDBSnapshotIdentifier=source_id&TargetDBSnapshotIdentifier=target_id&Version=2014-10-31&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=akid%2F19700101%2Feu-central-1%2Frds%2Faws4_request&X-Amz-Date=19700101T000000Z&X-Amz-Expires=3600&X-Amz-Security-Token=session&X-Amz-Signature=d3b9491de565d0ff1bf94d518060ec4796dc1006e7413754c7e25e3539eccf09&X-Amz-SignedHeaders=host'
        });
        return expect(req.httpRequest.endpoint.href).to.equal('https://rds.us-west-2.amazonaws.com/');
      });
      it('builds v4 presigned url even when request is signed with v2', function() {
        var req;
        rds.config.signatureVersion = 'v2';
        req = rds.copyDBSnapshot({
          SourceDBSnapshotIdentifier: 'source_id',
          TargetDBSnapshotIdentifier: 'target_id'
        });
        req.build();
        expect(req.response.error).to.equal(null);
        expect(spy.calls.length).to.equal(1);
        expect(req.params).to.eql({
          SourceDBSnapshotIdentifier: 'source_id',
          TargetDBSnapshotIdentifier: 'target_id',
          PreSignedUrl: 'https://rds.eu-central-1.amazonaws.com/?Action=CopyDBSnapshot&DestinationRegion=us-west-2&SourceDBSnapshotIdentifier=source_id&TargetDBSnapshotIdentifier=target_id&Version=2014-10-31&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=akid%2F19700101%2Feu-central-1%2Frds%2Faws4_request&X-Amz-Date=19700101T000000Z&X-Amz-Expires=3600&X-Amz-Security-Token=session&X-Amz-Signature=d3b9491de565d0ff1bf94d518060ec4796dc1006e7413754c7e25e3539eccf09&X-Amz-SignedHeaders=host'
        });
        return expect(req.httpRequest.endpoint.href).to.equal('https://rds.us-west-2.amazonaws.com/');
      });
      it('does not build presigned url for a non-supported operation', function() {
        var req;
        req = rds.describeDBSnapshots();
        req.build();
        expect(req.response.error).to.equal(null);
        expect(spy.calls.length).to.equal(0);
        return expect(req.params).to.eql({});
      });
      it('does not build presigned url when SourceRegion is not passed as an input', function() {
        var req;
        delete rds.config.params;
        req = rds.copyDBSnapshot({
          SourceDBSnapshotIdentifier: 'source_id',
          TargetDBSnapshotIdentifier: 'target_id'
        });
        req.build();
        expect(req.response.error).to.equal(null);
        expect(spy.calls.length).to.equal(0);
        return expect(req.params).to.eql({
          SourceDBSnapshotIdentifier: 'source_id',
          TargetDBSnapshotIdentifier: 'target_id'
        });
      });
      it('does not build presigned url when PresignedUrl is passed as an input', function() {
        var req;
        req = rds.copyDBSnapshot({
          SourceDBSnapshotIdentifier: 'source_id',
          TargetDBSnapshotIdentifier: 'target_id',
          PreSignedUrl: 'presigned_url',
          SourceRegion: 'eu-central-1'
        });
        req.build();
        expect(req.response.error).to.equal(null);
        expect(spy.calls.length).to.equal(0);
        return expect(req.params).to.eql({
          SourceDBSnapshotIdentifier: 'source_id',
          TargetDBSnapshotIdentifier: 'target_id',
          PreSignedUrl: 'presigned_url'
        });
      });
      it('does not build presigned url when SourceRegion matches destination region', function() {
        var req;
        req = rds.copyDBSnapshot({
          SourceDBSnapshotIdentifier: 'source_id',
          TargetDBSnapshotIdentifier: 'target_id',
          SourceRegion: 'us-west-2'
        });
        req.build();
        expect(req.response.error).to.equal(null);
        expect(spy.calls.length).to.equal(0);
        return expect(req.params).to.eql({
          SourceDBSnapshotIdentifier: 'source_id',
          TargetDBSnapshotIdentifier: 'target_id'
        });
      });
      return describe('user input', function() {
        beforeEach(function() {
          return delete rds.config.params;
        });
        it('does not not modify user input when SourceRegion is present', function() {
          var params, req;
          params = {
            SourceDBSnapshotIdentifier: 'source_id',
            TargetDBSnapshotIdentifier: 'target_id',
            SourceRegion: 'eu-central-1'
          };
          req = rds.copyDBSnapshot(params);
          req.build();
          expect(req.response.error).to.equal(null);
          expect(spy.calls.length).to.equal(1);
          expect(req.params).to.eql({
            SourceDBSnapshotIdentifier: 'source_id',
            TargetDBSnapshotIdentifier: 'target_id',
            PreSignedUrl: 'https://rds.eu-central-1.amazonaws.com/?Action=CopyDBSnapshot&DestinationRegion=us-west-2&SourceDBSnapshotIdentifier=source_id&TargetDBSnapshotIdentifier=target_id&Version=2014-10-31&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=akid%2F19700101%2Feu-central-1%2Frds%2Faws4_request&X-Amz-Date=19700101T000000Z&X-Amz-Expires=3600&X-Amz-Security-Token=session&X-Amz-Signature=d3b9491de565d0ff1bf94d518060ec4796dc1006e7413754c7e25e3539eccf09&X-Amz-SignedHeaders=host'
          });
          return expect(params).to.eql({
            SourceDBSnapshotIdentifier: 'source_id',
            TargetDBSnapshotIdentifier: 'target_id',
            SourceRegion: 'eu-central-1'
          });
        });
        it('does not not modify user input when PresignedUrl and SourceRegion is present', function() {
          var params, req;
          params = {
            SourceDBSnapshotIdentifier: 'source_id',
            TargetDBSnapshotIdentifier: 'target_id',
            SourceRegion: 'eu-central-1',
            PreSignedUrl: 'presigned_url'
          };
          req = rds.copyDBSnapshot(params);
          req.build();
          expect(req.response.error).to.equal(null);
          expect(spy.calls.length).to.equal(0);
          expect(req.params).to.eql({
            SourceDBSnapshotIdentifier: 'source_id',
            TargetDBSnapshotIdentifier: 'target_id',
            PreSignedUrl: 'presigned_url'
          });
          return expect(params).to.eql({
            SourceDBSnapshotIdentifier: 'source_id',
            TargetDBSnapshotIdentifier: 'target_id',
            SourceRegion: 'eu-central-1',
            PreSignedUrl: 'presigned_url'
          });
        });
        return it('does not not modify user input when SourceRegion matches destination region', function() {
          var params, req;
          params = {
            SourceDBSnapshotIdentifier: 'source_id',
            TargetDBSnapshotIdentifier: 'target_id',
            SourceRegion: 'us-west-2'
          };
          req = rds.copyDBSnapshot(params);
          req.build();
          expect(req.response.error).to.equal(null);
          expect(spy.calls.length).to.equal(0);
          expect(req.params).to.eql({
            SourceDBSnapshotIdentifier: 'source_id',
            TargetDBSnapshotIdentifier: 'target_id'
          });
          return expect(params).to.eql({
            SourceDBSnapshotIdentifier: 'source_id',
            TargetDBSnapshotIdentifier: 'target_id',
            SourceRegion: 'us-west-2'
          });
        });
      });
    });
  });

}).call(this);

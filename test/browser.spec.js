(function() {
  var AWS, assertError, config, eventually, helpers, integrationTests, matchError, noData, noError, uniqueName;

  helpers = require('./helpers');

  AWS = helpers.AWS;

  config = {};

  try {
    config = require('./configuration');
  } catch (error) {}

  uniqueName = function(prefix) {
    if (prefix) {
      return prefix + '-' + AWS.util.date.getDate().getTime();
    } else {
      return AWS.util.date.getDate().getTime().toString();
    }
  };

  eventually = function(condition, next, done) {
    var delay, id, nextFn, options, started;
    options = {
      delay: 0,
      backoff: 500,
      maxTime: 10
    };
    delay = options.delay;
    started = AWS.util.date.getDate();
    id = 0;
    nextFn = function() {
      var now;
      now = AWS.util.date.getDate();
      if (now - started < options.maxTime * 1000) {
        return next(function(err, data) {
          var timeoutFn;
          if (condition(err, data)) {
            return done(err, data);
          } else {
            timeoutFn = function() {
              clearInterval(id);
              delay += options.backoff;
              return nextFn();
            };
            return id = setInterval(timeoutFn, delay);
          }
        });
      }
    };
    return nextFn();
  };

  noError = function(err) {
    return expect(err).to.equal(null);
  };

  noData = function(data) {
    return expect(data).to.equal(null);
  };

  assertError = function(err, code) {
    return expect(err.code).to.equal(code);
  };

  matchError = function(err, message) {
    return expect(!!err.message.match(new RegExp(message, 'gi'))).to.eql(true);
  };

  integrationTests = function(fn) {
    if (config.accessKeyId && AWS.util.isBrowser()) {
      return describe('Integration tests', fn);
    }
  };

  integrationTests(function() {
    var acm, apigateway, cloudformation, cloudfront, cloudhsm, cloudtrail, cloudwatch, cloudwatchevents, cloudwatchlogs, codecommit, codepipeline, cognitoidentity, cognitosync, configservice, devicefarm, directconnect, dynamodb, dynamodbstreams, ec2, ecr, ecs, elasticache, elasticbeanstalk, elastictranscoder, elb, emr, firehose, gamelift, inspector, iot, kinesis, kms, lambda, machinelearning, mobileanalytics, opsworks, rds, redshift, route53, route53domains, s3, ses, sns, sqs, ssm, storagegateway, sts, waf;
    acm = new AWS.ACM(AWS.util.merge(config, config.acm));
    apigateway = new AWS.APIGateway(AWS.util.merge(config, config.apigateway));
    cloudformation = new AWS.CloudFormation(AWS.util.merge(config, config.cloudformation));
    cloudfront = new AWS.CloudFront(AWS.util.merge(config, config.cloudfront));
    cloudtrail = new AWS.CloudTrail(AWS.util.merge(config, config.cloudtrail));
    cloudwatch = new AWS.CloudWatch(AWS.util.merge(config, config.cloudwatch));
    cloudwatchlogs = new AWS.CloudWatchLogs(AWS.util.merge(config, config.cloudwatchlogs));
    cloudwatchevents = new AWS.CloudWatchEvents(AWS.util.merge(config, config.cloudwatchevents));
    cognitoidentity = new AWS.CognitoIdentity(AWS.util.merge(config, config.cognitoidentity));
    configservice = new AWS.ConfigService(AWS.util.merge(config, config.configservice));
    codecommit = new AWS.CodeCommit(AWS.util.merge(config, config.codecommit));
    codepipeline = new AWS.CodePipeline(AWS.util.merge(config, config.codepipeline));
    cognitosync = new AWS.CognitoSync(AWS.util.merge(config, config.cognitosync));
    devicefarm = new AWS.DeviceFarm(AWS.util.merge(config, config.devicefarm));
    directconnect = new AWS.DirectConnect(AWS.util.merge(config, config.directconnect));
    dynamodb = new AWS.DynamoDB(AWS.util.merge(config, config.dynamodb));
    dynamodbstreams = new AWS.DynamoDBStreams(AWS.util.merge(config, config.dynamodbstreams));
    ec2 = new AWS.EC2(AWS.util.merge(config, config.ec2));
    ecr = new AWS.ECR(AWS.util.merge(config, config.ecr));
    ecs = new AWS.ECS(AWS.util.merge(config, config.ecs));
    elasticache = new AWS.ElastiCache(AWS.util.merge(config, config.elasticache));
    elasticbeanstalk = new AWS.ElasticBeanstalk(AWS.util.merge(config, config.elasticbeanstalk));
    elastictranscoder = new AWS.ElasticTranscoder(AWS.util.merge(config, config.elastictranscoder));
    elb = new AWS.ELB(AWS.util.merge(config, config.elb));
    emr = new AWS.EMR(AWS.util.merge(config, config.emr));
    firehose = new AWS.Firehose(AWS.util.merge(config, config.firehose));
    gamelift = new AWS.GameLift(AWS.util.merge(config, config.gamelift));
    config.inspector = config.inspector || {};
    config.inspector.region = 'us-west-2';
    inspector = new AWS.Inspector(AWS.util.merge(config, config.inspector));
    iot = new AWS.Iot(AWS.util.merge(config, config.iot));
    kinesis = new AWS.Kinesis(AWS.util.merge(config, config.kinesis));
    kms = new AWS.KMS(AWS.util.merge(config, config.kms));
    lambda = new AWS.Lambda(AWS.util.merge(config, config.lambda));
    mobileanalytics = new AWS.MobileAnalytics(AWS.util.merge(config, config.mobileanalytics));
    machinelearning = new AWS.MachineLearning(AWS.util.merge(config, config.machinelearning));
    opsworks = new AWS.OpsWorks(AWS.util.merge(config, config.opsworks));
    var pinpoint = new AWS.Pinpoint(AWS.util.merge(config, config.pinpoint));
    rds = new AWS.RDS(AWS.util.merge(config, config.rds));
    redshift = new AWS.Redshift(AWS.util.merge(config, config.redshift));
    route53 = new AWS.Route53(AWS.util.merge(config, config.route53));
    route53domains = new AWS.Route53Domains(AWS.util.merge(config, config.route53domains));
    s3 = new AWS.S3(AWS.util.merge(config, config.s3));
    ses = new AWS.SES(AWS.util.merge(config, config.ses));
    sns = new AWS.SNS(AWS.util.merge(config, config.sns));
    sqs = new AWS.SQS(AWS.util.merge(config, config.sqs));
    ssm = new AWS.SSM(AWS.util.merge(config, config.ssm));
    storagegateway = new AWS.StorageGateway(AWS.util.merge(config, config.storagegateway));
    sts = new AWS.STS(AWS.util.merge(config, config.sts));
    waf = new AWS.WAF(AWS.util.merge(config, config.waf));
    describe('Request.abort', function() {
      return it('can abort a request', function(done) {
        var req;
        req = s3.putObject({
          Key: 'key',
          Body: 'body'
        });
        req.on('httpHeaders', function() {
          return this.abort();
        });
        req.send(function(err) {
          expect(err.name).to.equal('RequestAbortedError');
          return done();
        });
      });
    });

    describe('XHR', function() {
      it('does not emit http events if networking issue occurs', function(done) {
        var date, err, httpData, httpDone, httpError, httpHeaders, req, svc;
        err = null;
        httpHeaders = false;
        httpData = false;
        httpError = false;
        httpDone = false;
        svc = new AWS.S3({
          accessKeyId: 'akid',
          secretAccessKey: 'secret',
          maxRetries: 0
        });
        date = AWS.util.date.iso8601().replace(/[^0-9]/g, '');
        req = svc.getObject({
          Bucket: 'invalidbucket' + date,
          Key: 'foo'
        });
        req.on('httpHeaders', function() {
          return httpHeaders = true;
        });
        req.on('httpData', function() {
          return httpData = true;
        });
        req.on('httpDone', function() {
          return httpDone = true;
        });
        req.on('httpError', function() {
          return httpError = true;
        });
        return req.send(function(err) {
          expect(httpHeaders).to.equal(false);
          expect(httpData).to.equal(false);
          expect(httpDone).to.equal(false);
          expect(httpError).to.equal(true);
          expect(err.name).to.equal('NetworkingError');
          return done();
        });
      });
      it('can send synchronous requests', function(done) {
        var key, opts, resp1, resp2, svc;
        key = uniqueName('test');
        opts = AWS.util.merge(config, config.s3);
        opts.httpOptions = {
          xhrAsync: false
        };
        svc = new AWS.S3(opts);
        resp1 = svc.putObject({
          Key: key,
          Body: 'body'
        }).send();
        resp2 = svc.getObject({
          Key: key
        }).send();
        expect(resp2.data.Body.toString()).to.equal('body');
        svc.deleteObject({
          Key: key
        }).send();
        return done();
      });
      it('sets responseType to arraybuffer', function(done) {
        var key, opts, req, svc;
        key = uniqueName('test');
        opts = AWS.util.merge(config, config.s3);
        svc = new AWS.S3(opts);
        req = svc.putObject({
          Key: key,
          Body: 'body'
        }, function(err, data) {
          expect(req.httpRequest.stream.responseType).to.equal('arraybuffer');
          // cleanup
          svc.deleteObject({
            Key: key
          }, function(err, data) {
            done();
          });
        });
      });
      return it('lower cases HTTP headers', function() {
        var client, headers, rawHeaders;
        rawHeaders = 'x-amzn-Foo: foo\nx-amzn-Bar: bar';
        client = new AWS.XHRClient();
        headers = client.parseHeaders(rawHeaders);
        expect(headers['x-amzn-foo']).to.equal('foo');
        return expect(headers['x-amzn-bar']).to.equal('bar');
      });
    });
    describe('AWS.ACM', function() {
      it('makes a request', function(done) {
        return acm.listCertificates({}, function(err, data) {
          noError(err);
          expect(Array.isArray(data.CertificateSummaryList)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        var params;
        params = {
          CertificateArn: 'fake-arn'
        };
        return acm.describeCertificate(params, function(err, data) {
          assertError(err, 'ValidationException');
          noData(data);
          return done();
        });
      });
    });
    describe('AWS.APIGateway', function() {
      it('makes a request', function(done) {
        return apigateway.getRestApis({}, function(err, data) {
          noError(err);
          expect(Array.isArray(data.items)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        var params;
        params = {
          restApiId: 'fake-id'
        };
        return apigateway.getRestApi(params, function(err, data) {
          assertError(err, 'NotFoundException');
          noData(data);
          return done();
        });
      });
    });
    describe('AWS.CloudFormation', function() {
      it('makes a request', function(done) {
        return cloudformation.listStacks({}, function(err, data) {
          noError(err);
          expect(Array.isArray(data.StackSummaries)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        var params;
        params = {
          StackName: 'fake-name'
        };
        return cloudformation.getStackPolicy(params, function(err, data) {
          assertError(err, 'ValidationError');
          noData(data);
          return done();
        });
      });
    });
    describe('AWS.CloudFront', function() {
      it('makes a request', function(done) {
        return cloudfront.listDistributions({}, function(err, data) {
          noError(err);
          expect(Array.isArray(data.DistributionList.Items)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        var params;
        params = {
          Id: 'fake-distro'
        };
        return cloudfront.getDistribution(params, function(err, data) {
          assertError(err, 'NoSuchDistribution');
          noData(data);
          return done();
        });
      });
    });

    describe('AWS.CloudTrail', function() {
      it('makes a request', function(done) {
        return cloudtrail.listPublicKeys(function(err, data) {
          noError(err);
          expect(Array.isArray(data.PublicKeyList)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        return cloudtrail.listTags({
          ResourceIdList: ['fake-arn']
        }, function(err, data) {
          noData(data);
          assertError(err, 'CloudTrailARNInvalidException');
          return done();
        });
      });
    });
    describe('AWS.CloudWatch', function() {
      it('makes a request', function(done) {
        return cloudwatch.listMetrics(function(err, data) {
          noError(err);
          expect(Array.isArray(data.Metrics)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        var params;
        params = {
          AlarmName: 'abc',
          StateValue: 'efg',
          StateReason: 'xyz'
        };
        return cloudwatch.setAlarmState(params, function(err, data) {
          assertError(err, 'ValidationError');
          matchError(err, 'failed to satisfy constraint');
          noData(data);
          return done();
        });
      });
    });
    describe('AWS.CloudWatchEvents', function() {
      it('makes a request', function(done) {
        return cloudwatchevents.listRules(function(err, data) {
          noError(err);
          expect(Array.isArray(data.Rules)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        var params;
        params = {
          Name: 'fake-rule'
        };
        return cloudwatchevents.describeRule(params, function(err, data) {
          assertError(err, 'ResourceNotFoundException');
          noData(data);
          return done();
        });
      });
    });
    describe('AWS.CloudWatchLogs', function() {
      it('makes a request', function(done) {
        return cloudwatchlogs.describeLogGroups(function(err, data) {
          noError(err);
          expect(Array.isArray(data.logGroups)).to.equal(true);
          return done();
        });
      });
      it('handles errors', function(done) {
        var params;
        params = {
          logGroupName: 'fake-group',
          logStreamName: 'fake-stream'
        };
        return cloudwatchlogs.getLogEvents(params, function(err, data) {
          assertError(err, 'ResourceNotFoundException');
          matchError(err, 'The specified log group does not exist');
          noData(data);
          return done();
        });
      });
      return describe('AWS.CodeCommit', function() {
        it('makes a request', function(done) {
          return codecommit.listRepositories({}, function(err, data) {
            noError(err);
            expect(Array.isArray(data.repositories)).to.equal(true);
            return done();
          });
        });
        return it('handles errors', function(done) {
          var params;
          params = {
            repositoryName: 'fake-repo'
          };
          return codecommit.listBranches(params, function(err, data) {
            assertError(err, 'RepositoryDoesNotExistException');
            noData(data);
            return done();
          });
        });
      });
    });
    describe('AWS.CodePipeline', function() {
      it('makes a request', function(done) {
        return codepipeline.listPipelines({}, function(err, data) {
          noError(err);
          expect(Array.isArray(data.pipelines)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        var params;
        params = {
          name: 'fake-pipeline'
        };
        return codepipeline.getPipeline(params, function(err, data) {
          assertError(err, 'PipelineNotFoundException');
          noData(data);
          return done();
        });
      });
    });
    describe('AWS.CognitoIdentity', function() {
      it('makes a request', function(done) {
        return cognitoidentity.listIdentityPools({
          MaxResults: 10
        }, function(err, data) {
          noError(err);
          expect(Array.isArray(data.IdentityPools)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        var params;
        params = {
          IdentityPoolId: 'us-east-1:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
        };
        return cognitoidentity.describeIdentityPool(params, function(err, data) {
          assertError(err, 'ResourceNotFoundException');
          matchError(err, 'IdentityPool \'us-east-1:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee\' not found');
          noData(data);
          return done();
        });
      });
    });
    describe('AWS.CognitoSync', function() {
      it('makes a request', function(done) {
        return cognitosync.listIdentityPoolUsage(function(err, data) {
          noError(err);
          expect(Array.isArray(data.IdentityPoolUsages)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        var params;
        params = {
          IdentityPoolId: 'us-east-1:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
        };
        return cognitosync.describeIdentityPoolUsage(params, function(err, data) {
          assertError(err, 'ResourceNotFoundException');
          matchError(err, 'IdentityPool \'us-east-1:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee\' not found');
          noData(data);
          return done();
        });
      });
    });
    describe('AWS.ConfigService', function() {
      it('makes a request', function(done) {
        return configservice.describeDeliveryChannels({}, function(err, data) {
          noError(err);
          expect(Array.isArray(data.DeliveryChannels)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        var params;
        params = {
          DeliveryChannel: {
            name: ''
          }
        };
        return configservice.putDeliveryChannel(params, function(err, data) {
          assertError(err, 'ValidationException');
          noData(data);
          return done();
        });
      });
    });
    describe('AWS.DeviceFarm', function() {
      it('makes a request', function(done) {
        return devicefarm.listDevices(function(err, data) {
          noError(err);
          expect(Array.isArray(data.devices)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        var params;
        params = {
          arn: 'arn:aws:devicefarm:us-west-2::device:00000000000000000000000000000000'
        };
        return devicefarm.getDevice(params, function(err, data) {
          assertError(err, 'NotFoundException');
          matchError(err, 'No device was found for arn arn:aws:devicefarm:us-west-2::device:00000000000000000000000000000000');
          noData(data);
          return done();
        });
      });
    });
    describe('AWS.DirectConnect', function() {
      it('makes a request', function(done) {
        return directconnect.describeConnections(function(err, data) {
          noError(err);
          expect(Array.isArray(data.connections)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        var params;
        params = {
          connectionId: 'dxcon-fakeconn'
        };
        return directconnect.confirmConnection(params, function(err, data) {
          assertError(err, 'DirectConnectClientException');
          matchError(err, 'ConfirmConnection failed. dxcon-fakeconn doesn\'t exist.');
          noData(data);
          return done();
        });
      });
    });
    describe('AWS.DynamoDB', function() {
      it('writes and reads from a table', function(done) {
        var key;
        key = uniqueName('test');
        return dynamodb.putItem({
          Item: {
            id: {
              S: key
            },
            data: {
              S: 'ƒoo'
            }
          }
        }, function(err, data) {
          noError(err);
          return dynamodb.getItem({
            Key: {
              id: {
                S: key
              }
            }
          }, function(err, data) {
            noError(err);
            expect(data.Item.data.S).to.equal('ƒoo');
            return dynamodb.deleteItem({
              Key: {
                id: {
                  S: key
                }
              }
            }).send(done);
          });
        });
      });
      return it('handles errors', function(done) {
        return dynamodb.describeTable({
          TableName: 'fake-table'
        }, function(err, data) {
          noData(data);
          assertError(err, 'ResourceNotFoundException');
          matchError(err, 'Requested resource not found: Table: fake-table not found');
          return done();
        });
      });
    });
    describe('AWS.DynamoDBStreams', function() {
      it('makes a request', function(done) {
        return dynamodbstreams.listStreams(function(err, data) {
          noError(err);
          expect(Array.isArray(data.Streams)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        var params;
        params = {
          StreamArn: 'fake-stream'
        };
        return dynamodbstreams.describeStream(params, function(err, data) {
          assertError(err, 'ValidationException');
          matchError(err, 'Invalid StreamArn');
          noData(data);
          return done();
        });
      });
    });
    describe('AWS.EC2', function() {
      it('makes a request', function(done) {
        return ec2.describeInstances(function(err, data) {
          noError(err);
          expect(Array.isArray(data.Reservations)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        return ec2.deleteVolume({
          VolumeId: 'vol-12345678'
        }, function(err, data) {
          noData(data);
          assertError(err, 'InvalidVolume.NotFound');
          matchError(err, 'The volume \'vol-12345678\' does not exist');
          return done();
        });
      });
    });
    describe('AWS.ECR', function() {
      it('makes a request', function(done) {
        return ecr.describeRepositories(function(err, data) {
          noError(err);
          expect(Array.isArray(data.repositories)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        return ecr.listImages({
          repositoryName: 'fake-name'
        }, function(err, data) {
          noData(data);
          assertError(err, 'RepositoryNotFoundException');
          return done();
        });
      });
    });
    describe('AWS.ECS', function() {
      it('makes a request', function(done) {
        return ecs.listClusters({}, function(err, data) {
          noError(err);
          expect(Array.isArray(data.clusterArns)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        return ecs.stopTask({
          task: 'xxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxxxxx'
        }, function(err, data) {
          noData(data);
          return done();
        });
      });
    });
    describe('AWS.ElasticTranscoder', function() {
      it('makes a request', function(done) {
        return elastictranscoder.listPipelines(function(err, data) {
          noError(err);
          expect(Array.isArray(data.Pipelines)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        return elastictranscoder.readJob({
          Id: '3333333333333-abcde3'
        }, function(err, data) {
          noData(data);
          assertError(err, 'ResourceNotFoundException');
          return done();
        });
      });
    });
    describe('AWS.ElastiCache', function() {
      it('makes a request', function(done) {
        return elasticache.describeSnapshots({}, function(err, data) {
          noError(err);
          expect(Array.isArray(data.Snapshots)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        return elasticache.listAllowedNodeTypeModifications({}, function(err, data) {
          assertError(err, 'InvalidParameterCombination');
          noData(data);
          return done();
        });
      });
    });
    describe('AWS.ElasticBeanstalk', function() {
      it('makes a request', function(done) {
        return elasticbeanstalk.listAvailableSolutionStacks({}, function(err, data) {
          noError(err);
          expect(Array.isArray(data.SolutionStacks)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        return elasticbeanstalk.describeEnvironmentHealth({}, function(err, data) {
          assertError(err, 'MissingParameter');
          noData(data);
          return done();
        });
      });
    });
    describe('AWS.ELB', function() {
      it('makes a request', function(done) {
        return elb.describeLoadBalancers({}, function(err, data) {
          noError(err);
          expect(Array.isArray(data.LoadBalancerDescriptions)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        return elb.describeTags({
          LoadBalancerNames: ['fake-name']
        }, function(err, data) {
          assertError(err, 'LoadBalancerNotFound');
          noData(data);
          return done();
        });
      });
    });
    describe('AWS.EMR', function() {
      it('makes a request', function(done) {
        return emr.listClusters({}, function(err, data) {
          noError(err);
          expect(Array.isArray(data.Clusters)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        return emr.describeCluster({
          ClusterId: 'fake-id'
        }, function(err, data) {
          assertError(err, 'InvalidRequestException');
          noData(data);
          return done();
        });
      });
    });
    describe('AWS.Firehose', function() {
      it('makes a request', function(done) {
        return firehose.listDeliveryStreams({}, function(err, data) {
          noError(err);
          expect(Array.isArray(data.DeliveryStreamNames)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        return firehose.describeDeliveryStream({
          DeliveryStreamName: 'fake-name'
        }, function(err, data) {
          assertError(err, 'ResourceNotFoundException');
          noData(data);
          return done();
        });
      });
    });
    describe('AWS.GameLift', function() {
      it('makes a request', function(done) {
        return gamelift.listBuilds({}, function(err, data) {
          noError(err);
          expect(Array.isArray(data.Builds)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        return gamelift.describeAlias({
          AliasId: 'fake-id'
        }, function(err, data) {
          assertError(err, 'InvalidRequestException');
          noData(data);
          return done();
        });
      });
    });
    describe('AWS.Inspector', function() {
      it('makes a request', function(done) {
        return inspector.listRulesPackages(function(err, data) {
          noError(err);
          expect(Array.isArray(data.rulesPackageArns)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        return inspector.stopAssessmentRun({
          assessmentRunArn: 'fake-arn'
        }, function(err, data) {
          noData(data);
          assertError(err, 'InvalidInputException');
          return done();
        });
      });
    });
    describe('AWS.Iot', function() {
      it('makes a request', function(done) {
        return iot.listPolicies(function(err, data) {
          noError(err);
          expect(Array.isArray(data.policies)).to.equal(true);
          return done();
        });
      });
      return xit('handles errors', function(done) {
        return iot.describeThing({
          thingName: 'fake-name'
        }, function(err, data) {
          noData(data);
          assertError(err, 'ResourceNotFoundException');
          return done();
        });
      });
    });
    describe('AWS.Kinesis', function() {
      it('makes a request', function(done) {
        return kinesis.listStreams(function(err, data) {
          noError(err);
          expect(Array.isArray(data.StreamNames)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        return kinesis.describeStream({
          StreamName: 'fake-stream'
        }, function(err, data) {
          noData(data);
          assertError(err, 'ResourceNotFoundException');
          matchError(err, 'Stream fake-stream under account');
          return done();
        });
      });
    });
    describe('AWS.KMS', function() {
      it('lists keys', function(done) {
        return kms.listKeys(function(err, data) {
          noError(err);
          expect(Array.isArray(data.Keys)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        return kms.createAlias({
          AliasName: 'fake-alias',
          TargetKeyId: 'non-existent'
        }, function(err, data) {
          noData(data);
          assertError(err, 'ValidationException');
          return done();
        });
      });
    });
    describe('AWS.Lambda', function() {
      it('makes a request', function(done) {
        return lambda.listFunctions(function(err, data) {
          noError(err);
          expect(Array.isArray(data.Functions)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        return lambda.invoke({
          FunctionName: 'fake-function'
        }, function(err, data) {
          noData(data);
          assertError(err, 'ResourceNotFoundException');
          matchError(err, 'function not found');
          return done();
        });
      });
    });
    describe('AWS.MobileAnalytics', function() {
      it('makes a request', function(done) {
        var params;
        params = {
          'events': [
            {
              'eventType': '_session.start',
              'timestamp': '2015-03-19T17:32:40.577Z',
              'session': {
                'id': '715fc007-8c32-1e50-0cf2-c45311393281'
              },
              'startTimestamp': '2015-03-19T17:32:40.560Z',
              'version': 'v2.0',
              'attributes': {},
              'metrics': {}
            }
          ],
          'clientContext': '{"client":{"client_id":"b4a5edf7-fbd4-6e8f-e0ba-8a5632c76191"},"env":{"platform":""},"services":{"mobile_analytics":{"app_id":"f94b9f4fd5004f94a31b66187a227610","sdk_name":"aws-sdk-mobile-analytics-js","sdk_version":"0.9.0"}},"custom":{}}'
        };
        return mobileanalytics.putEvents(params, function(err, data) {
          noError(err);
          return done();
        });
      });
      return it('handles errors', function(done) {
        var params;
        params = {
          'events': [
            {
              'eventType': 'test',
              'timestamp': 'test'
            }
          ],
          'clientContext': 'test'
        };
        return mobileanalytics.putEvents(params, function(err, data) {
          noData(data);
          assertError(err, 'BadRequestException');
          matchError(err, 'Client context is malformed or missing');
          return done();
        });
      });
    });
    describe('AWS.MachineLearning', function() {
      it('makes a request', function(done) {
        return machinelearning.describeMLModels(function(err, data) {
          noError(err);
          expect(Array.isArray(data.Results)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        return machinelearning.getBatchPrediction({
          BatchPredictionId: 'fake-id'
        }, function(err, data) {
          noData(data);
          assertError(err, 'ResourceNotFoundException');
          matchError(err, 'No BatchPrediction with id fake-id exists');
          return done();
        });
      });
    });
    describe('AWS.OpsWorks', function() {
      it('makes a request', function(done) {
        return opsworks.describeStacks(function(err, data) {
          noError(err);
          expect(Array.isArray(data.Stacks)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        return opsworks.describeLayers({
          StackId: 'fake-id'
        }, function(err, data) {
          noData(data);
          assertError(err, 'ResourceNotFoundException');
          matchError(err, 'Unable to find stack with ID fake-id');
          return done();
        });
      });
    });

    describe('AWS.RDS', function() {
      it('makes a request', function(done) {
        return rds.describeCertificates(function(err, data) {
          noError(err);
          expect(Array.isArray(data.Certificates)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        return rds.listTagsForResource({
          ResourceName: 'fake-name'
        }, function(err, data) {
          noData(data);
          assertError(err, 'InvalidParameterValue');
          return done();
        });
      });
    });
    describe('AWS.Redshift', function() {
      it('makes a request', function(done) {
        return redshift.describeClusters(function(err, data) {
          noError(err);
          expect(Array.isArray(data.Clusters)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        return redshift.describeResize({
          ClusterIdentifier: 'fake-id'
        }, function(err, data) {
          noData(data);
          assertError(err, 'ClusterNotFound');
          return done();
        });
      });
    });
    describe('AWS.Route53', function() {
      it('makes a request', function(done) {
        return route53.listHostedZones(function(err, data) {
          noError(err);
          expect(Array.isArray(data.HostedZones)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        return route53.createHostedZone({
          Name: 'fake-name',
          'CallerReference': 'fake-ref'
        }, function(err, data) {
          noData(data);
          assertError(err, 'InvalidDomainName');
          return done();
        });
      });
    });
    describe('AWS.Route53Domains', function() {
      it('makes a request', function(done) {
        return route53domains.listDomains(function(err, data) {
          noError(err);
          expect(Array.isArray(data.Domains)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        return route53domains.registerDomain({
          DomainName: 'example.com',
          DurationInYears: '1',
          AdminContact: {},
          RegistrantContact: {},
          TechContact: {}
        }, function(err, data) {
          noData(data);
          assertError(err, 'InvalidInput');
          return done();
        });
      });
    });
    describe('AWS.S3', function() {
      var testWrite;
      testWrite = function(done, body, compareFn, svc) {
        var key;
        svc = svc || s3;
        key = uniqueName('test');
        return s3.putObject({
          Key: key,
          Body: body
        }, function(err, data) {
          noError(err);
          return s3.getObject({
            Key: key
          }, function(err, data) {
            noError(err);
            if (compareFn) {
              compareFn(data);
            } else {
              expect(data.Body.toString()).to.equal(body);
            }
            return s3.deleteObject({
              Key: key
            }).send(done);
          });
        });
      };
      it('GETs and PUTs objects to a bucket', function(done) {
        return testWrite(done, 'ƒoo');
      });
      it('GETs and PUTs objects to a bucket with signature version 4', function(done) {
        var svc;
        svc = new AWS.S3(AWS.util.merge({
          signatureVersion: 'v4'
        }, config.s3));
        return testWrite(done, 'ƒoo', null, svc);
      });
      it('writes typed array data', function(done) {
        return testWrite(done, new Uint8Array([2, 4, 8]), function(data) {
          expect(data.Body[0]).to.equal(2);
          expect(data.Body[1]).to.equal(4);
          return expect(data.Body[2]).to.equal(8);
        });
      });
      it('writes blobs', function(done) {
        return testWrite(done, new Blob(['a', 'b', 'c']), function(data) {
          expect(data.Body[0]).to.equal(97);
          expect(data.Body[1]).to.equal(98);
          return expect(data.Body[2]).to.equal(99);
        });
      });
      it('writes with charset', function(done) {
        var body, key;
        key = uniqueName('test');
        body = 'body string';
        return s3.putObject({
          Key: key,
          Body: body,
          ContentType: 'text/html'
        }, function(err, data) {
          noError(err);
          return s3.deleteObject({
            Key: key
          }).send(function() {
            return s3.putObject({
              Key: key,
              Body: body,
              ContentType: 'text/html; charset=utf-8'
            }, function(err, data) {
              noError(err);
              return s3.deleteObject({
                Key: key
              }).send(done);
            });
          });
        });
      });

      it('won\'t attempt to update bucket region if request is aborted', function(done) {
        var req;
        var s3Config = AWS.util.merge(config, config.s3);
        s3Config.params = AWS.util.copy(s3Config.params);
        s3Config.region = 'us-west-2';
        s3Config.params.Bucket += '-us-west-2';
        var s3 = new AWS.S3(s3Config);
        req = s3.putObject({
          Key: 'key',
          Body: 'body'
        });
        req.on('httpHeaders', function() {
          return this.abort();
        });
        var spy = helpers.spyOn(s3, 'updateReqBucketRegion').andCallThrough();
        req.send(function(err) {
          expect(err.name).to.equal('RequestAbortedError');
          expect(spy.calls.length).to.equal(0);
          return done();
        });
      });

      it('won\'t attempt to update bucket region if request times out', function(done) {
        var req;
        var s3Config = AWS.util.merge(config, config.s3);
        s3Config.params = AWS.util.copy(s3Config.params);
        s3Config.httpOptions = {
          timeout: 1
        };
        s3Config.region = 'us-west-2';
        s3Config.params.Bucket += '-us-west-2';
        var s3 = new AWS.S3(s3Config);
        req = s3.putObject({
          Key: 'key',
          Body: 'body'
        });
        req.on('httpHeaders', function() {
          throw AWS.util.error(new Error('TimeoutError'), {code: 'TimeoutError'});
        });
        var spy = helpers.spyOn(s3, 'updateReqBucketRegion').andCallThrough();
        req.send(function(err) {
          expect(err.name).to.equal('TimeoutError');
          expect(spy.calls.length).to.equal(0);
          return done();
        });
      });

      describe('selectObjectContent', function() {
        beforeEach(function(done) {
          s3.putObject({
            Key: 'test.csv',
            Body: 'user_name,age\nfoo,10\nbar,20\nfizz,30\nbuzz,40'
          }, done);
        });

        afterEach(function(done) {
          s3.deleteObject({
            Key: 'test.csv'
          }, done);
        });

        it('supports reading events from list of events', function(done) {
          var key = 'test.csv';

          s3.selectObjectContent({
            Key: 'test.csv',
            Expression: 'SELECT user_name FROM S3Object WHERE cast(age as int) > 20',
            ExpressionType: 'SQL',
            InputSerialization: {
              CompressionType: 'NONE',
              CSV: {
                FileHeaderInfo: 'USE',
                RecordDelimiter: '\n',
                FieldDelimiter: ','
              }
            },
            OutputSerialization: {
              CSV: {}
            }
          }, function(err, data) {
            noError(err);
            var records = [];
            for (var i = 0; i < data.Payload.length; i++) {
              var event = data.Payload[i];
              if (event.Records) {
                records.push(event.Records.Payload);
              }
            }

            expect(Buffer.concat(records).toString()).to.equal(
              'fizz\nbuzz\n'
            );
            done();
          });
        });
      });

      describe('upload()', function() {
        it('supports blobs using upload()', function(done) {
          var key, size, u;
          key = uniqueName('test');
          size = 100;
          u = s3.upload({
            Key: key,
            Body: new Blob([new Uint8Array(size)])
          });
          u.send(function(err, data) {
            expect(err).not.to.exist;
            expect(typeof data.ETag).to.equal('string');
            expect(typeof data.Location).to.equal('string');
            return done();
          });
        });
      });
      return describe('progress events', function() {
        return it('emits http(Upload|Download)Progress events (no phantomjs)', function(done) {
          var body, data, key, progress, req;
          data = [];
          progress = [];
          key = uniqueName('test');
          body = new Blob([new Uint8Array(512 * 1024)]);
          req = s3.putObject({
            Key: key,
            Body: body
          });
          req.on('httpUploadProgress', function(p) {
            return progress.push(p);
          });
          return req.send(function(err, data) {
            noError(err);
            expect(progress.length > 1).to.equal(true);
            expect(progress[0].total).to.equal(body.size);
            expect(progress[0].loaded > 10).to.equal(true);
            progress = [];
            req = s3.getObject({
              Key: key
            });
            req.on('httpDownloadProgress', function(p) {
              return progress.push(p);
            });
            return req.send(function(err, data) {
              noError(err);
              expect(progress.length > 1).to.equal(true);
              expect(progress[0].total).to.equal(body.size);
              expect(progress[0].loaded > 10).to.equal(true);
              return s3.deleteObject({
                Key: key
              }).send(done);
            });
          });
        });
      });
    });
    describe('AWS.SES', function() {
      it('makes a request', function(done) {
        return ses.listIdentities({}, function(err, data) {
          noError(err);
          expect(Array.isArray(data.Identities)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        var params;
        params = {
          RuleSetName: 'fake-name',
          RuleName: 'fake-name'
        };
        return ses.describeReceiptRule(params, function(err, data) {
          assertError(err, 'RuleSetDoesNotExist');
          noData(data);
          return done();
        });
      });
    });
    describe('AWS.SNS', function() {
      return it('creates and deletes topics', function(done) {
        return sns.createTopic({
          Name: uniqueName('aws-sdk-js')
        }, function(err, data) {
          var arn;
          noError(err);
          arn = data.TopicArn;
          sns = new AWS.SNS(sns.config);
          sns.config.params = {
            TopicArn: arn
          };
          return sns.listTopics(function(err, data) {
            expect(data.Topics.filter(function(o) {
              return o.TopicArn === arn;
            })).not.to.equal(null);
            return sns.deleteTopic(done);
          });
        });
      });
    });
    describe('AWS.SQS', function() {
      return it('posts and receives messages on a queue', function(done) {
        var msg, name;
        name = uniqueName('aws-sdk-js');
        msg = 'ƒoo';
        return sqs.createQueue({
          QueueName: name
        }, function(err, data) {
          var url;
          url = data.QueueUrl;
          sqs = new AWS.SQS(sqs.config);
          sqs.config.params = {
            QueueUrl: url
          };
          return eventually((function(err) {
            return err === null;
          }), (function(cb) {
            return sqs.getQueueUrl({
              QueueName: name
            }, cb);
          }), function() {
            return sqs.sendMessage({
              MessageBody: msg
            }, function(err, data) {
              noError(err);
              return eventually((function(err, data) {
                return data.Messages[0].Body === msg;
              }), (function(cb) {
                return sqs.receiveMessage(cb);
              }), function(err, data) {
                noError(err);
                expect(data.Messages[0].MD5OfBody).to.equal(AWS.util.crypto.md5(msg, 'hex'));
                return sqs.deleteQueue(done);
              });
            });
          });
        });
      });
    });
    describe('AWS.SSM', function() {
      it('makes a request', function(done) {
        return ssm.listCommands({}, function(err, data) {
          noError(err);
          expect(Array.isArray(data.Commands)).to.equal(true);
          return done();
        });
      });
      it('handles errors', function(done) {
        var params;
        params = {
          Name: 'fake-name'
        };
        return ssm.describeDocument(params, function(err, data) {
          assertError(err, 'InvalidDocument');
          noData(data);
          return done();
        });
      });
      describe('AWS.StorageGateway', function() {});
      it('makes a request', function(done) {
        return storagegateway.listGateways({}, function(err, data) {
          noError(err);
          expect(Array.isArray(data.Gateways)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        var params;
        params = {
          GatewayARN: 'fake-arn'
        };
        return storagegateway.describeGatewayInformation(params, function(err, data) {
          assertError(err, 'ValidationException');
          noData(data);
          return done();
        });
      });
    });
    describe('AWS.STS', function() {
      return it('gets a session token', function(done) {
        return sts.getSessionToken(function(err, data) {
          noError(err);
          expect(data.Credentials.AccessKeyId).not.to.equal('');
          return done();
        });
      });
    });
    return describe('AWS.WAF', function() {
      it('makes a request', function(done) {
        var params;
        params = {
          Limit: 20
        };
        return waf.listRules(params, function(err, data) {
          noError(err);
          expect(Array.isArray(data.Rules)).to.equal(true);
          return done();
        });
      });
      return it('handles errors', function(done) {
        var params;
        params = {
          Name: 'fake-name',
          ChangeToken: 'fake-token'
        };
        return waf.createSqlInjectionMatchSet(params, function(err, data) {
          assertError(err, 'WAFStaleDataException');
          noData(data);
          return done();
        });
      });
    });
  });

}).call(this);

(function() {
  var AWS, bigbody, body, helpers, smallbody, zerobody;

  helpers = require('../helpers');

  AWS = helpers.AWS;

  body = function(size) {
    var e, i;
    try {
      return new Blob((function() {
        var j, ref, results;
        results = [];
        for (i = j = 0, ref = size; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
          results.push(0);
        }
        return results;
      })());
    } catch (error) {
      e = error;
      return new AWS.util.buffer.alloc(size);
    }
  };

  smallbody = body(5);

  bigbody = body(36);

  zerobody = body(0);

  describe('AWS.S3.ManagedUpload', function() {
    var data, err, minPartSize, ref, s3, send, upload;
    s3 = new AWS.S3({
      maxRetries: 0,
      params: {
        Bucket: 'bucket',
        Key: 'key'
      }
    });
    ref = [], err = ref[0], data = ref[1], upload = ref[2], minPartSize = ref[3];
    beforeEach(function() {
      var ref1;
      minPartSize = AWS.S3.ManagedUpload.minPartSize;
      AWS.S3.ManagedUpload.prototype.minPartSize = 10;
      ref1 = [], err = ref1[0], data = ref1[1];
      helpers.spyOn(AWS.S3.prototype, 'extractError').andReturn(function() {});
      //Because we cannot mock individual body for a series of responses, so we will just disable
      //this function. Otherwise it will make each 'completeMultipartUpload' throws because of empty body.
      helpers.spyOn(AWS.S3.prototype, 'extractErrorFrom200Response').andReturn(function() {});
      return upload = null;
    });
    afterEach(function() {
      return AWS.S3.ManagedUpload.prototype.minPartSize = minPartSize;
    });
    send = function(params, cb) {
      if (!upload) {
        upload = new AWS.S3.ManagedUpload({
          service: s3,
          params: params
        });
      }
      return upload.send(function(e, d) {
        var ref1;
        ref1 = [e, d], err = ref1[0], data = ref1[1];
        if (cb) {
          return cb();
        }
      });
    };
    it('defaults to using sigv4', function() {
      var upload = new AWS.S3.ManagedUpload({
        params: {
          Body: 'body'
        }
      });
      expect(upload.service.getSignatureVersion()).to.eql('v4');
    });
    it('uses sigv4 if customer supplies a configured S3 client', function() {
      var upload = new AWS.S3.ManagedUpload({
        params: {
          Body: 'body'
        },
        service: new AWS.S3({signatureVersion: 'v4'})
      });
      expect(upload.service.getSignatureVersion()).to.eql('v4');
    });
    it('uses sigv2 if customer supplies a configured S3 client', function() {
      var upload = new AWS.S3.ManagedUpload({
        params: {
          Body: 'body'
        },
        service: new AWS.S3({signatureVersion: 'v2'})
      });
      expect(upload.service.getSignatureVersion()).to.eql('s3');
    });
    return describe('send', function() {
      it('default callback throws', function() {
        helpers.mockResponses([
          {
            error: new Error('ERROR')
          }
        ]);
        upload = new AWS.S3.ManagedUpload({
          params: {
            Body: 'body'
          }
        });
        return expect(function() {
          return upload.send();
        }).to['throw']('ERROR');
      });
      it('fails if Body is not passed', function() {
        return expect(function() {
          return send();
        }).to['throw']('params.Body is required');
      });
      it('fails if Body is unknown type', function() {
        send({
          Body: 2
        });
        return expect(err.message).to.match(/Unsupported body payload number/);
      });
      it('converts string body to Buffer', function() {
        var reqs;
        reqs = helpers.mockResponses([
          {
            data: {
              ETag: 'ETAG'
            }
          }
        ]);
        send({
          Body: 'string'
        });
        return expect(data.ETag).to.equal('ETAG');
      });
      it('uses a default service object if none provided', function() {
        return expect(function() {
          return new AWS.S3.ManagedUpload();
        }).to['throw']('params.Body is required');
      });
      it('uploads a single part if size is less than min multipart size', function(done) {
        var reqs;
        reqs = helpers.mockResponses([
          {
            data: {
              ETag: 'ETAG'
            }
          }
        ]);
        return send({
          Body: smallbody,
          ContentEncoding: 'encoding'
        }, function() {
          expect(err).not.to.exist;
          expect(data.ETag).to.equal('ETAG');
          expect(data.Location).to.equal('https://bucket.s3.mock-region.amazonaws.com/key');
          expect(helpers.operationsForRequests(reqs)).to.eql(['s3.putObject']);
          expect(reqs[0].params.ContentEncoding).to.equal('encoding');
          return done();
        });
      });
      it('can not use provided ContentMD5 for a multipart upload', function(done) {
        return send({
          Body: bigbody,
          ContentMD5: 'MD5HASH'
        }, function() {
          expect(data).not.to.exist;
          expect(err.code).to.equal('InvalidDigest');
          return done();
        });
      });
      it('can use provided ContentMD5 for single part upload', function(done) {
        var reqs;
        reqs = helpers.mockResponses([
          {
            data: {
              ETag: 'ETAG'
            }
          }
        ]);
        return send({
          Body: smallbody,
          ContentMD5: 'MD5HASH'
        }, function() {
          expect(err).not.to.exist;
          expect(data.ETag).to.equal('ETAG');
          expect(helpers.operationsForRequests(reqs)).to.eql(['s3.putObject']);
          return done();
        });
      });
      it('can fail a single part', function() {
        var reqs;
        reqs = helpers.mockResponses([
          {
            data: null,
            error: new Error('ERROR')
          }
        ]);
        send({
          Body: 'string'
        });
        expect(data).not.to.exist;
        return expect(err.message).to.equal('ERROR');
      });

      it('can abort a single part', function(done) {
        helpers.mockHttpResponse(200, {}, '');
        function WAIT_WHEN_SEND(req, done) {
          setImmediate(function() {
            done();
          });
        }
        AWS.events.onAsync('send', WAIT_WHEN_SEND, true);
        var upload = new AWS.S3.ManagedUpload({
          service: s3,
          params: {
            Body: smallbody
          }
        });
        upload.send(function(err, data) {
          expect(err).to.exist;
          expect(err.message).to.eql('Request aborted by user');
          AWS.events.removeListener('send', WAIT_WHEN_SEND);
          done();
        });
        upload.abort();
      });

      it('uploads multipart if size is greater than min multipart size', function(done) {
        var reqs;
        reqs = helpers.mockResponses([
          {
            data: {
              UploadId: 'uploadId'
            }
          }, {
            data: {
              ETag: 'ETAG1'
            }
          }, {
            data: {
              ETag: 'ETAG2'
            }
          }, {
            data: {
              ETag: 'ETAG3'
            }
          }, {
            data: {
              ETag: 'ETAG4'
            }
          }, {
            data: {
              ETag: 'FINAL_ETAG',
              Location: 'FINAL_LOCATION'
            }
          }
        ]);
        return send({
          Body: bigbody,
          ContentEncoding: 'encoding'
        }, function() {
          expect(helpers.operationsForRequests(reqs)).to.eql(['s3.createMultipartUpload', 's3.uploadPart', 's3.uploadPart', 's3.uploadPart', 's3.uploadPart', 's3.completeMultipartUpload']);
          expect(err).not.to.exist;
          expect(data.ETag).to.equal('FINAL_ETAG');
          expect(data.Location).to.equal('FINAL_LOCATION');
          expect(reqs[0].params).to.eql({
            Bucket: 'bucket',
            Key: 'key',
            ContentEncoding: 'encoding'
          });
          expect(reqs[1].params.ContentLength).to.equal(10);
          expect(reqs[1].params.UploadId).to.equal('uploadId');
          expect(reqs[2].params.UploadId).to.equal('uploadId');
          expect(reqs[2].params.ContentLength).to.equal(10);
          expect(reqs[3].params.UploadId).to.equal('uploadId');
          expect(reqs[3].params.ContentLength).to.equal(10);
          expect(reqs[4].params.UploadId).to.equal('uploadId');
          expect(reqs[4].params.ContentLength).to.equal(6);
          expect(reqs[5].params.UploadId).to.equal('uploadId');
          expect(reqs[5].params.MultipartUpload.Parts).to.eql([
            {
              ETag: 'ETAG1',
              PartNumber: 1
            }, {
              ETag: 'ETAG2',
              PartNumber: 2
            }, {
              ETag: 'ETAG3',
              PartNumber: 3
            }, {
              ETag: 'ETAG4',
              PartNumber: 4
            }
          ]);
          return done();
        });
      });
      it('aborts if ETag is not in response', function(done) {
        var reqs;
        helpers.spyOn(AWS.util, 'isBrowser').andReturn(true);
        reqs = helpers.mockResponses([
          {
            data: {
              UploadId: 'uploadId'
            }
          }, {
            data: {}
          }, {
            data: {}
          }
        ]);
        return send({
          Body: bigbody
        }, function() {
          expect(helpers.operationsForRequests(reqs)).to.eql(['s3.createMultipartUpload', 's3.uploadPart', 's3.abortMultipartUpload']);
          expect(err).to.exist;
          expect(err.message).to.equal('No access to ETag property on response. Check CORS configuration to expose ETag header.');
          return done();
        });
      });
      it('allows changing part size', function(done) {
        var opts, reqs, size;
        reqs = helpers.mockResponses([
          {
            data: {
              UploadId: 'uploadId'
            }
          }, {
            data: {
              ETag: 'ETAG1'
            }
          }, {
            data: {
              ETag: 'ETAG2'
            }
          }, {
            data: {
              ETag: 'FINAL_ETAG',
              Location: 'FINAL_LOCATION'
            }
          }
        ]);
        size = 18;
        opts = {
          partSize: size,
          queueSize: 1,
          service: s3,
          params: {
            Body: bigbody
          }
        };
        upload = new AWS.S3.ManagedUpload(opts);
        return send({}, function() {
          expect(helpers.operationsForRequests(reqs)).to.eql(['s3.createMultipartUpload', 's3.uploadPart', 's3.uploadPart', 's3.completeMultipartUpload']);
          expect(err).not.to.exist;
          expect(data.ETag).to.equal('FINAL_ETAG');
          expect(data.Location).to.equal('FINAL_LOCATION');
          expect(reqs[1].params.ContentLength).to.equal(size);
          expect(reqs[2].params.ContentLength).to.equal(size);
          return done();
        });
      });
      it('supports zero-byte body buffers', function(done) {
        var reqs;
        reqs = helpers.mockResponses([
          {
            data: {
              ETag: 'ETAG'
            }
          }
        ]);
        upload = new AWS.S3.ManagedUpload({
          params: {
            Body: zerobody
          }
        });
        return upload.send(function() {
          expect(helpers.operationsForRequests(reqs)).to.eql(['s3.putObject']);
          expect(err).not.to.exist;
          return done();
        });
      });

      it('supports empty string bodies', function(done) {
          var reqs = helpers.mockResponses([
              {
                  data: {
                      ETag: 'ETAG'
                  }
              }
          ]);
          upload = new AWS.S3.ManagedUpload({
              params: {
                  Body: ''
              }
          });
          return upload.send(function() {
              expect(helpers.operationsForRequests(reqs)).to.eql(['s3.putObject']);
              expect(err).not.to.exist;
              return done();
          });
      });

      it('errors if partSize is smaller than minPartSize', function() {
        return expect(function() {
          return new AWS.S3.ManagedUpload({
            partSize: 5
          });
        }).to['throw']('partSize must be greater than 10');
      });
      it('aborts if uploadPart fails', function(done) {
        var reqs;
        reqs = helpers.mockResponses([
          {
            data: {
              UploadId: 'uploadId'
            }
          }, {
            data: {
              ETag: 'ETAG1'
            }
          }, {
            error: {
              code: 'UploadPartFailed'
            },
            data: null
          }, {
            data: {},
            error: null
          }
        ]);
        upload = new AWS.S3.ManagedUpload({
          queueSize: 1,
          params: {
            Body: bigbody
          }
        });
        return send({}, function() {
          expect(helpers.operationsForRequests(reqs)).to.eql(['s3.createMultipartUpload', 's3.uploadPart', 's3.uploadPart', 's3.abortMultipartUpload']);
          expect(err).to.exist;
          expect(data).not.to.exist;
          expect(reqs[3].params.UploadId).to.equal('uploadId');
          return done();
        });
      });
      it('aborts if complete call fails', function(done) {
        var reqs;
        reqs = helpers.mockResponses([
          {
            data: {
              UploadId: 'uploadId'
            }
          }, {
            data: {
              ETag: 'ETAG1'
            }
          }, {
            data: {
              ETag: 'ETAG2'
            }
          }, {
            data: {
              ETag: 'ETAG3'
            }
          }, {
            data: {
              ETag: 'ETAG4'
            }
          }, {
            error: {
              code: 'CompleteFailed'
            },
            data: null
          }
        ]);
        return send({
          Body: bigbody
        }, function() {
          expect(helpers.operationsForRequests(reqs)).to.eql(['s3.createMultipartUpload', 's3.uploadPart', 's3.uploadPart', 's3.uploadPart', 's3.uploadPart', 's3.completeMultipartUpload', 's3.abortMultipartUpload']);
          expect(err).to.exist;
          expect(err.code).to.equal('CompleteFailed');
          expect(data).not.to.exist;
          return done();
        });
      });
      it('leaves parts if leavePartsOnError is set', function(done) {
        var reqs;
        reqs = helpers.mockResponses([
          {
            data: {
              UploadId: 'uploadId'
            }
          }, {
            data: {
              ETag: 'ETAG1'
            }
          }, {
            error: {
              code: 'UploadPartFailed'
            },
            data: null
          }, {
            data: {},
            error: null
          }
        ]);
        upload = new AWS.S3.ManagedUpload({
          queueSize: 1,
          leavePartsOnError: true,
          params: {
            Body: bigbody
          }
        });
        return send({}, function() {
          expect(helpers.operationsForRequests(reqs)).to.eql(['s3.createMultipartUpload', 's3.uploadPart', 's3.uploadPart']);
          expect(err).to.exist;
          expect(err.code).to.equal('UploadPartFailed');
          expect(data).not.to.exist;
          return done();
        });
      });
      it('cleans up createMultipartUpload request if leavePartsOnError is set', function(done) {
        var spy;
        var upload = new AWS.S3.ManagedUpload({
          queueSize: 4,
          leavePartsOnError: true,
          params: {
            Body: AWS.util.buffer.alloc(1024 * 1024 * 20)
          }
        });

        upload.send(function(err, data) {
          // should get an abort error
          expect(err.code).to.eql('RequestAbortedError');
          expect(this.multipartReq).to.eql(null);
          // make sure removeAllListeners was called for terminal states
          var removedListeners = spy.calls.map(function(arg) {
            return arg.arguments[0];
          }).sort();
          expect(removedListeners).to.eql(['complete', 'error', 'success']);
          done();
        });
        expect(!!upload.multipartReq).to.eql(true);
        spy = helpers.spyOn(upload.multipartReq, 'removeAllListeners').andCallThrough();
        upload.abort();
      });
      it('resets isDoneChunking if leavePartsOnError is set', function(done) {
        var upload = new AWS.S3.ManagedUpload({
          queueSize: 4,
          partSize: 1024 * 1024 * 5,
          leavePartsOnError: true,
          params: {
            Body: AWS.util.buffer.alloc(1024 * 1024 * 20)
          }
        });
        upload.send(function(err, data) {
          expect(err.code).to.eql('RequestAbortedError');
          expect(upload.isDoneChunking).to.equal(false);
          done();
        });
        expect(upload.isDoneChunking).to.equal(true);
        upload.abort();
      });
      it('resumes multipart buffer upload if leavePartsOnError is set', function(done) {
        var reqs;
        reqs = helpers.mockResponses([
          {
            data: {
              UploadId: 'uploadId'
            }
          }, {
            data: {
              ETag: 'ETAG1'
            }
          }, {
            error: {
              code: 'UploadPartFailed'
            },
            data: null
          }, {
            data: {
              ETag: 'ETAG2'
            }
          }, {
            data: {
              ETag: 'ETAG3'
            }
          }, {
            data: {
              ETag: 'ETAG4'
            }
          }, {
            data: {
              ETag: 'FINAL_ETAG',
              Location: 'FINAL_LOCATION'
            }
          }, {
            data: {},
            error: null
          }
        ]);
        upload = new AWS.S3.ManagedUpload({
          queueSize: 1,
          leavePartsOnError: true,
          params: {
            Body: bigbody
          }
        });
        return send({}, function() {
          expect(helpers.operationsForRequests(reqs)).to.eql(['s3.createMultipartUpload', 's3.uploadPart', 's3.uploadPart']);
          expect(err).to.exist;
          expect(err.code).to.equal('UploadPartFailed');
          expect(data).not.to.exist;
          return send({}, function() {
            expect(helpers.operationsForRequests(reqs)).to.eql(['s3.createMultipartUpload', 's3.uploadPart', 's3.uploadPart', 's3.uploadPart', 's3.uploadPart', 's3.uploadPart', 's3.completeMultipartUpload']);
            expect(err).not.to.exist;
            expect(data.ETag).to.equal('FINAL_ETAG');
            expect(data.Location).to.equal('FINAL_LOCATION');
            return done();
          });
        });
      });

      it('does not resume multipart buffer upload if leavePartsOnError is not set', function(done) {
        var reqs;
        reqs = helpers.mockResponses([
          {
            data: {
              UploadId: 'uploadId'
            }
          }, {
            data: {
              ETag: 'ETAG1'
            }
          }, {
            error: {
              code: 'UploadPartFailed'
            },
            data: null
          }, {
            error: new Error('ERROR'),
            data: null
          }
        ]);
        upload = new AWS.S3.ManagedUpload({
          queueSize: 1,
          params: {
            Body: bigbody
          }
        });
        send({}, function() {
          expect(helpers.operationsForRequests(reqs)).to.eql(['s3.createMultipartUpload', 's3.uploadPart', 's3.uploadPart', 's3.abortMultipartUpload']);
          expect(err).to.exist;
          expect(err.code).to.equal('UploadPartFailed');
          expect(data).not.to.exist;
          send({}, function() {
            expect(err).to.exist;
            expect(data).not.to.exist;
            done();
          });
        });
      });

      it('returns data with ETag, Location, Bucket, and Key with single part upload', function(done) {
        var reqs;
        reqs = helpers.mockResponses([
          {
            data: {
              ETag: 'ETAG'
            }
          }
        ]);
        send({
          Body: smallbody,
          ContentEncoding: 'encoding'
        }, function() {
          expect(err).not.to.exist;
          expect(data.ETag).to.equal('ETAG');
          expect(data.Location).to.equal('https://bucket.s3.mock-region.amazonaws.com/key');
          expect(data.Key).to.equal('key');
          expect(data.Bucket).to.equal('bucket');
          done();
        });
      });

      it('should not count done parts twice if same part is returned twice', function(done) {
        var reqs = helpers.mockResponses([
          {
            data: {
              UploadId: 'uploadId'
            }
          }, {
            data: {
              ETag: 'ETAG1'
            }
          }, {
            data: {
              ETag: 'ETAG2'
            }
          }, {
            data: {
              ETag: 'FINAL_ETAG',
              Location: 'FINAL_LOCATION'
            }
          }
        ]);
        upload = new AWS.S3.ManagedUpload({
          service: s3,
          params: {Body: body(20)}
        });
        var uploadPartSpy = helpers.spyOn(upload.service, 'uploadPart').andCallFake(function() {
          //fake the first part already done
          if (upload.completeInfo[1] && upload.completeInfo[1].ETag === null) {
            upload.completeInfo[1] = {
              ETag: 'ETAG1',
              PartNumber: 1
            };
            upload.doneParts++;
          }
          return uploadPartSpy.origMethod.apply(uploadPartSpy.object, arguments);
        });
        send({}, function(err, data) {
          expect(err).not.to.exist;
          expect(helpers.operationsForRequests(reqs)).to.eql([
            's3.createMultipartUpload',
            's3.uploadPart',
            's3.uploadPart',
            's3.completeMultipartUpload'
          ]);
          done();
        });
      });

      describe('Location', function() {
        it('returns paths with simple string keys for single part uploads', function(done) {
          var reqs;
          reqs = helpers.mockResponses([
            {
              data: {
                ETag: 'ETAG'
              }
            }
          ]);
          return send({
            Body: smallbody,
            ContentEncoding: 'encoding',
            Key: 'file.ext'
          }, function() {
            expect(err).not.to.exist;
            expect(data.Location).to.equal('https://bucket.s3.mock-region.amazonaws.com/file.ext');
            return done();
          });
        });
        it('returns paths with simple string keys for multipart uploads', function(done) {
          var reqs;
          reqs = helpers.mockResponses([
            {
              data: {
                UploadId: 'uploadId'
              }
            }, {
              data: {
                ETag: 'ETAG1'
              }
            }, {
              data: {
                ETag: 'ETAG2'
              }
            }, {
              data: {
                ETag: 'ETAG3'
              }
            }, {
              data: {
                ETag: 'ETAG4'
              }
            }, {
              data: {
                ETag: 'FINAL_ETAG',
                Location: 'https://bucket.s3.mock-region.amazonaws.com/file.ext'
              }
            }
          ]);
          return send({
            Body: bigbody,
            ContentEncoding: 'encoding',
            Key: 'file.ext'
          }, function() {
            expect(err).not.to.exist;
            expect(data.Location).to.equal('https://bucket.s3.mock-region.amazonaws.com/file.ext');
            return done();
          });
        });
        it('returns paths with subfolder keys for single part uploads', function(done) {
          var reqs;
          reqs = helpers.mockResponses([
            {
              data: {
                ETag: 'ETAG'
              }
            }
          ]);
          return send({
            Body: smallbody,
            ContentEncoding: 'encoding',
            Key: 'directory/subdirectory/file.ext'
          }, function() {
            expect(err).not.to.exist;
            expect(data.Location).to.equal('https://bucket.s3.mock-region.amazonaws.com/directory/subdirectory/file.ext');
            return done();
          });
        });
        return it('returns paths with subfolder keys for multipart uploads', function(done) {
          var reqs;
          reqs = helpers.mockResponses([
            {
              data: {
                UploadId: 'uploadId'
              }
            }, {
              data: {
                ETag: 'ETAG1'
              }
            }, {
              data: {
                ETag: 'ETAG2'
              }
            }, {
              data: {
                ETag: 'ETAG3'
              }
            }, {
              data: {
                ETag: 'ETAG4'
              }
            }, {
              data: {
                ETag: 'FINAL_ETAG',
                Location: 'https://bucket.s3.mock-region.amazonaws.com/directory%2Fsubdirectory%2Ffile.ext'
              }
            }
          ]);
          return send({
            Body: bigbody,
            ContentEncoding: 'encoding',
            Key: 'folder/file.ext'
          }, function() {
            expect(err).not.to.exist;
            expect(data.Location).to.equal('https://bucket.s3.mock-region.amazonaws.com/directory/subdirectory/file.ext');
            return done();
          });
        });
      });
      if (AWS.util.isNode()) {
        describe('streaming', function() {
          it('sends a small stream in a single putObject', function(done) {
            var reqs, stream;
            stream = AWS.util.buffer.toStream(smallbody);
            reqs = helpers.mockResponses([
              {
                data: {
                  ETag: 'ETAG'
                }
              }
            ]);
            upload = new AWS.S3.ManagedUpload({
              params: {
                Body: stream
              }
            });
            return upload.send(function() {
              expect(helpers.operationsForRequests(reqs)).to.eql(['s3.putObject']);
              expect(err).not.to.exist;
              return done();
            });
          });
          it('sends a zero byte stream', function(done) {
            var reqs, stream;
            stream = AWS.util.buffer.toStream(zerobody);
            reqs = helpers.mockResponses([
              {
                data: {
                  ETag: 'ETAG'
                }
              }
            ]);
            upload = new AWS.S3.ManagedUpload({
              params: {
                Body: stream
              }
            });
            return upload.send(function() {
              expect(helpers.operationsForRequests(reqs)).to.eql(['s3.putObject']);
              expect(err).not.to.exist;
              return done();
            });
          });
          it('propagates an error from a stream', function(done) {
            var errorStream;
            errorStream = new require('stream').Readable();
            errorStream._read = function() {
              return this.emit('error', new Error('message'));
            };
            upload = new AWS.S3.ManagedUpload({
              params: {
                Body: errorStream
              }
            });
            return upload.send(function(e, d) {
              expect(e).to.exist;
              expect(d).not.to.exist;
              expect(e.message).to.equal('message');
              return done();
            });
          });
          it('can send a stream that is exactly equal to part size', function(done) {
            var partSize;
            partSize = 5 * 1024 * 1024;
            return require('crypto').randomBytes(partSize, function(err, buf) {
              var reqs, stream;
              if (err) {
                return done(err);
              }
              stream = AWS.util.buffer.toStream(buf);
              reqs = helpers.mockResponses([
                {
                  data: {
                    UploadId: 'uploadId'
                  }
                }, {
                  data: {
                    ETag: 'ETAG1'
                  }
                }
              ]);
              upload = new AWS.S3.ManagedUpload({
                partSize: partSize,
                queueSize: 1,
                params: {
                  Body: stream
                }
              });
              return upload.send(function(err) {
                if (err) {
                  return done(err);
                }
                expect(helpers.operationsForRequests(reqs)).to.eql(['s3.createMultipartUpload', 's3.uploadPart', 's3.completeMultipartUpload']);
                return done();
              });
            });
          });
          it('can send a stream that is larger then the part size', function(done) {
            var partSize, streamSize;
            partSize = 5 * 1024 * 1024;
            streamSize = 1024 + partSize;
            return require('crypto').randomBytes(streamSize, function(err, buf) {
              var reqs, stream;
              if (err) {
                return done(err);
              }
              stream = AWS.util.buffer.toStream(buf);
              reqs = helpers.mockResponses([
                {
                  data: {
                    UploadId: 'uploadId'
                  }
                }, {
                  data: {
                    ETag: 'ETAG1'
                  }
                }, {
                  data: {
                    ETag: 'ETAG2'
                  }
                }, {
                  data: {
                    ETag: 'FINAL_ETAG',
                    Location: 'FINAL_LOCATION'
                  }
                }
              ]);
              upload = new AWS.S3.ManagedUpload({
                partSize: partSize,
                queueSize: 1,
                params: {
                  Body: stream
                }
              });
              return upload.send(function(err) {
                if (err) {
                  return done(err);
                }
                expect(helpers.operationsForRequests(reqs)).to.eql(['s3.createMultipartUpload', 's3.uploadPart', 's3.uploadPart', 's3.completeMultipartUpload']);
                return done();
              });
            });
          });
          return it('can send a stream that is exactly divisible by part size', function(done) {
            var partSize, streamSize;
            partSize = 5 * 1024 * 1024;
            streamSize = 2 * partSize;
            return require('crypto').randomBytes(streamSize, function(err, buf) {
              var reqs, stream;
              if (err) {
                return done(err);
              }
              stream = AWS.util.buffer.toStream(buf);
              reqs = helpers.mockResponses([
                {
                  data: {
                    UploadId: 'uploadId'
                  }
                }, {
                  data: {
                    ETag: 'ETAG1'
                  }
                }, {
                  data: {
                    ETag: 'ETAG2'
                  }
                }, {
                  data: {
                    ETag: 'FINAL_ETAG',
                    Location: 'FINAL_LOCATION'
                  }
                }
              ]);
              upload = new AWS.S3.ManagedUpload({
                partSize: partSize,
                queueSize: 1,
                params: {
                  Body: stream
                }
              });
              return upload.send(function(err) {
                if (err) {
                  return done(err);
                }
                expect(helpers.operationsForRequests(reqs)).to.eql(['s3.createMultipartUpload', 's3.uploadPart', 's3.uploadPart', 's3.completeMultipartUpload']);
                return done();
              });
            });
          });
        });
      }
      if (typeof Promise === 'function') {
        describe('promise', function() {
          var catchFunction, thenFunction;
          thenFunction = function(d) {
            return data = d;
          };
          catchFunction = function(e) {
            return err = e;
          };
          beforeEach(function() {
            return AWS.util.addPromises(AWS.S3.ManagedUpload, Promise);
          });
          it('resolves when single part upload is successful', function() {
            var params, reqs;
            reqs = helpers.mockResponses([
              {
                data: {
                  ETag: 'ETAG'
                }
              }
            ]);
            params = {
              Body: smallbody,
              ContentEncoding: 'encoding'
            };
            upload = new AWS.S3.ManagedUpload({
              service: s3,
              params: params
            });
            return upload.promise().then(thenFunction)['catch'](catchFunction).then(function() {
              expect(err).not.to.exist;
              expect(data.ETag).to.equal('ETAG');
              expect(data.Location).to.equal('https://bucket.s3.mock-region.amazonaws.com/key');
              expect(helpers.operationsForRequests(reqs)).to.eql(['s3.putObject']);
              return expect(reqs[0].params.ContentEncoding).to.equal('encoding');
            });
          });
          it('resolves when multipart upload is successful', function() {
            var params, reqs;
            reqs = helpers.mockResponses([
              {
                data: {
                  UploadId: 'uploadId'
                }
              }, {
                data: {
                  ETag: 'ETAG1'
                }
              }, {
                data: {
                  ETag: 'ETAG2'
                }
              }, {
                data: {
                  ETag: 'ETAG3'
                }
              }, {
                data: {
                  ETag: 'ETAG4'
                }
              }, {
                data: {
                  ETag: 'FINAL_ETAG',
                  Location: 'FINAL_LOCATION'
                }
              }
            ]);
            params = {
              Body: bigbody,
              ContentEncoding: 'encoding'
            };
            upload = new AWS.S3.ManagedUpload({
              service: s3,
              params: params
            });
            return upload.promise().then(thenFunction)['catch'](catchFunction).then(function() {
              expect(helpers.operationsForRequests(reqs)).to.eql(['s3.createMultipartUpload', 's3.uploadPart', 's3.uploadPart', 's3.uploadPart', 's3.uploadPart', 's3.completeMultipartUpload']);
              expect(err).not.to.exist;
              expect(data.ETag).to.equal('FINAL_ETAG');
              expect(data.Location).to.equal('FINAL_LOCATION');
              expect(reqs[0].params).to.eql({
                Bucket: 'bucket',
                Key: 'key',
                ContentEncoding: 'encoding'
              });
              expect(reqs[1].params.ContentLength).to.equal(10);
              expect(reqs[1].params.UploadId).to.equal('uploadId');
              expect(reqs[2].params.UploadId).to.equal('uploadId');
              expect(reqs[2].params.ContentLength).to.equal(10);
              expect(reqs[3].params.UploadId).to.equal('uploadId');
              expect(reqs[3].params.ContentLength).to.equal(10);
              expect(reqs[4].params.UploadId).to.equal('uploadId');
              expect(reqs[4].params.ContentLength).to.equal(6);
              expect(reqs[5].params.UploadId).to.equal('uploadId');
              return expect(reqs[5].params.MultipartUpload.Parts).to.eql([
                {
                  ETag: 'ETAG1',
                  PartNumber: 1
                }, {
                  ETag: 'ETAG2',
                  PartNumber: 2
                }, {
                  ETag: 'ETAG3',
                  PartNumber: 3
                }, {
                  ETag: 'ETAG4',
                  PartNumber: 4
                }
              ]);
            });
          });
          return it('rejects when upload fails', function() {
            var params;
            helpers.mockResponses([
              {
                error: new Error('ERROR')
              }
            ]);
            params = {
              Body: smallbody,
              ContentEncoding: 'encoding'
            };
            upload = new AWS.S3.ManagedUpload({
              service: s3,
              params: params
            });
            return upload.promise().then(thenFunction)['catch'](catchFunction).then(function() {
              expect(data).not.to.exist;
              return expect(err.message).to.equal('ERROR');
            });
          });
        });
      }
      describe('tagging', function() {
        it('should embed tags in PutObject request for single part uploads', function(done) {
          var reqs;
          reqs = helpers.mockResponses([
            {
              data: {
                ETag: 'ETAG'
              }
            }
          ]);
          upload = new AWS.S3.ManagedUpload({
            service: s3,
            params: {
              Body: smallbody
            },
            tags: [
              {
                Key: 'tag1',
                Value: 'value1'
              }, {
                Key: 'tag2',
                Value: 'value2'
              }, {
                Key: 'étiquette',
                Value: 'valeur à être encodé'
              }
            ]
          });
          return send({}, function() {
            expect(err).not.to.exist;
            expect(reqs[0].httpRequest.headers['x-amz-tagging']).to.equal('tag1=value1&tag2=value2&%C3%A9tiquette=valeur%20%C3%A0%20%C3%AAtre%20encod%C3%A9');
            return done();
          });
        });
        it('should send a PutObjectTagging request following a successful multipart upload with tags', function(done) {
          var reqs;
          reqs = helpers.mockResponses([
            {
              data: {
                UploadId: 'uploadId'
              }
            }, {
              data: {
                ETag: 'ETAG1'
              }
            }, {
              data: {
                ETag: 'ETAG2'
              }
            }, {
              data: {
                ETag: 'ETAG3'
              }
            }, {
              data: {
                ETag: 'ETAG4'
              }
            }, {
              data: {
                ETag: 'FINAL_ETAG',
                Location: 'FINAL_LOCATION'
              }
            }, {}
          ]);
          upload = new AWS.S3.ManagedUpload({
            service: s3,
            params: {
              Body: bigbody
            },
            tags: [
              {
                Key: 'tag1',
                Value: 'value1'
              }, {
                Key: 'tag2',
                Value: 'value2'
              }, {
                Key: 'étiquette',
                Value: 'valeur à être encodé'
              }, {
                Key: 'number',
                Value: 100
              }
            ]
          });
          return send({}, function() {
            expect(helpers.operationsForRequests(reqs)).to.eql(['s3.createMultipartUpload', 's3.uploadPart', 's3.uploadPart', 's3.uploadPart', 's3.uploadPart', 's3.completeMultipartUpload', 's3.putObjectTagging']);
            expect(err).not.to.exist;
            expect(data.Location).to.equal('FINAL_LOCATION');
            expect(reqs[6].params.Tagging).to.deep.equal({
              TagSet: [
                {
                  Key: 'tag1',
                  Value: 'value1'
                }, {
                  Key: 'tag2',
                  Value: 'value2'
                }, {
                  Key: 'étiquette',
                  Value: 'valeur à être encodé'
                }, {
                  Key: 'number',
                  Value: '100'
                }
              ]
            });
            return done();
          });
        });
        it('return errors from PutObjectTagging request following a successful multipart upload with tags', function(done) {
          var reqs;
          reqs = helpers.mockResponses([
            {
              data: {
                UploadId: 'uploadId'
              }
            }, {
              data: {
                ETag: 'ETAG1'
              }
            }, {
              data: {
                ETag: 'ETAG2'
              }
            }, {
              data: {
                ETag: 'ETAG3'
              }
            }, {
              data: {
                ETag: 'ETAG4'
              }
            }, {
              data: {
                ETag: 'FINAL_ETAG',
                Location: 'FINAL_LOCATION'
              }
            }, {
              error: {
                code: 'InvalidRequest'
              },
              data: null
            }
          ]);
          upload = new AWS.S3.ManagedUpload({
            service: s3,
            params: {
              Body: bigbody
            },
            tags: [
              {
                Key: 'tag1',
                Value: 'value1'
              }, {
                Key: 'tag2',
                Value: 'value2'
              }, {
                Key: 'étiquette',
                Value: 'valeur à être encodé'
              }
            ]
          });
          return send({}, function() {
            expect(helpers.operationsForRequests(reqs)).to.eql(['s3.createMultipartUpload', 's3.uploadPart', 's3.uploadPart', 's3.uploadPart', 's3.uploadPart', 's3.completeMultipartUpload', 's3.putObjectTagging']);
            expect(err.code).to.equal('InvalidRequest');
            return done();
          });
        });
        return it('should throw when tags are not provided as an array', function(done) {
          var e, reqs;
          reqs = helpers.mockResponses([
            {
              data: {
                ETag: 'ETAG'
              }
            }
          ]);
          try {
            upload = new AWS.S3.ManagedUpload({
              service: s3,
              params: {
                Body: smallbody
              },
              tags: 'tag1=value1&tag2=value2&%C3%A9tiquette=valeur%20%C3%A0%20%C3%AAtre%20encod%C3%A9'
            });
            return done(new Error('AWS.S3.ManagedUpload should have thrown when passed a string for tags'));
          } catch (error) {
            e = error;
            return done();
          }
        });
      });

      describe('accesspoint', function() {
        it('should make subsequent calls with accesspoint', function(done) {
          var reqs = helpers.mockResponses([
            {
              data: {
                UploadId: 'uploadId'
              }
            }, {
              data: {
                ETag: 'ETAG1'
              }
            }, {
              data: {
                ETag: 'ETAG2'
              }
            }, {
              data: {
                ETag: 'FINAL_ETAG',
                Location: 'FINAL_LOCATION'
              }
            }
          ]);
          var size = 18;
          var opts = {
            partSize: size,
            queueSize: 1,
            service: s3,
            params: {
              Body: bigbody,
              Bucket: 'arn:aws:s3:us-west-2:123456789012:accesspoint/myendpoint'
            }
          };
          var endpoint = 'myendpoint-123456789012.s3-accesspoint.us-west-2.amazonaws.com';
          upload = new AWS.S3.ManagedUpload(opts);
          return send({}, function() {
            expect(helpers.operationsForRequests(reqs)).to.eql(['s3.createMultipartUpload', 's3.uploadPart', 's3.uploadPart', 's3.completeMultipartUpload']);
            expect(err).not.to.exist;
            expect(reqs[0].httpRequest.endpoint.hostname).to.equal(endpoint);
            expect(reqs[1].httpRequest.endpoint.hostname).to.equal(endpoint);
            expect(reqs[2].httpRequest.endpoint.hostname).to.equal(endpoint);
            expect(reqs[3].httpRequest.endpoint.hostname).to.equal(endpoint);
            return done();
          });
        });
      });
    });
  });

}).call(this);

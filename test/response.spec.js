(function() {
  var AWS, EventEmitter, helpers;

  helpers = require('./helpers');

  EventEmitter = require('events').EventEmitter;

  AWS = helpers.AWS;

  describe('AWS.Response', function() {
    var fill, makePageable, response, service;
    service = null;
    response = null;
    beforeEach(function() {
      service = new AWS.Service({
        apiConfig: new AWS.Model.Api({
          metadata: {
            signingName: 'ocean-wave'
          },
          operations: {
            op: {}
          }
        })
      });
      return response = new AWS.Response(service.makeRequest('op'));
    });
    makePageable = function() {
      return service.api.paginators.op = new AWS.Model.Paginator('op', {
        limit_key: 'Limit',
        input_token: 'Marker',
        output_token: 'Marker',
        result_key: 'Result'
      });
    };
    fill = function(err, data, pageable) {
      if (pageable) {
        makePageable();
      }
      response.error = err;
      return response.data = data;
    };
    describe('hasNextPage', function() {
      it('returns undefined if the request is not pageable', function() {
        fill(null, {
          Marker: 'next_page'
        });
        return expect(response.hasNextPage()).to.equal(void 0);
      });
      it('returns false if there is no marker in the response', function() {
        fill(null, {}, true);
        return expect(response.hasNextPage()).to.equal(false);
      });
      it('returns false if the response returned an error', function() {
        fill(new Error, null, true);
        return expect(response.hasNextPage()).to.equal(false);
      });
      return it('returns true if there is a marker in the response', function() {
        fill(null, {
          Marker: 'next_page'
        }, true);
        return expect(response.hasNextPage()).to.equal(true);
      });
    });
    describe('cacheNextPageTokens', function() {
      it('sets nextPageTokens to null if no token in data', function() {
        fill(null, {
          notMarker: 'someData'
        }, true);
        response.cacheNextPageTokens();
        return expect(response.nextPageTokens).to.equal(null);
      });
      it('sets nextPageTokens for one token', function() {
        fill(null, {
          notMarker: 'someData',
          Marker: 'token'
        }, true);
        response.cacheNextPageTokens();
        return expect(response.nextPageTokens).to.eql(['token']);
      });
      it('sets nextPageTokens for multiple tokens', function() {
        fill(null, {
          MarkerI: 'token1',
          MarkerII: 'token2',
          MarkerIII: 'token3'
        }, true);
        service.api.paginators.op.outputToken = ['MarkerI', 'MarkerII', 'MarkerIV'];
        response.cacheNextPageTokens();
        return expect(response.nextPageTokens).to.eql(['token1', 'token2']);
      });
      return it('returns cached tokens if nextPageTokens exists', function() {
        response.nextPageTokens = ['cachedToken'];
        return expect(response.cacheNextPageTokens()).to.eql(['cachedToken']);
      });
    });
    return describe('nextPage', function() {
      it('throws an exception if the operation has no pagination information', function() {
        service.api.pagination = {};
        return expect(function() {
          return response.nextPage();
        }).to['throw']('No pagination configuration for op');
      });
      it('returns null if there are no more pages', function() {
        fill(null, {}, true);
        return expect(response.nextPage()).to.equal(null);
      });
      it('returns a request object with the next page marker filled in params', function() {
        var req;
        fill(null, {
          Marker: 'next_page'
        }, true);
        req = response.nextPage();
        expect(req.params.Marker).to.equal('next_page');
        return expect(req.operation).to.equal(response.request.operation);
      });
      it('throws error if response returned an error and there is no callback', function() {
        fill(new Error('error!'), null, true);
        return expect(function() {
          return response.nextPage();
        }).to['throw']('error!');
      });
      it('sends the request if passed with a callback', function(done) {
        helpers.mockHttpResponse(200, {}, ['']);
        fill(null, {
          Marker: 'next_page'
        }, true);
        return response.nextPage(function(err, data) {
          expect(err).to.equal(null);
          expect(data).to.eql({});
          return done();
        });
      });
      it('passes null to callback if there are no more pages', function() {
        fill(null, {}, true);
        return response.nextPage(function(err, data) {
          expect(err).to.equal(null);
          return expect(data).to.equal(null);
        });
      });
      return it('passes error through if original response returned an error', function() {
        fill('error!', null, true);
        return response.nextPage(function(err, data) {
          expect(err).to.equal('error!');
          return expect(data).to.equal(null);
        });
      });
    });
  });

}).call(this);

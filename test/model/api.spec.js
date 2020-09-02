(function() {
  var AWS, helpers, make;

  helpers = require('../helpers');

  AWS = helpers.AWS;

  make = function(obj, opts) {
    return new AWS.Model.Api(obj, opts);
  };

  describe('AWS.Model.Api', function() {

    describe('loading', function() {
      return it('loads properties from metadata', function() {
        var api;
        api = make({
          metadata: {
            apiVersion: '1.0',
            endpointPrefix: 'endpoint',
            globalEndpoint: 'global',
            signatureVersion: 'v4',
            protocol: 'json',
            xmlNamespace: 'URI',
            serviceAbbreviation: 'abbr',
            serviceFullName: 'name',
            signingName: 'alias'
          }
        });
        expect(api.apiVersion).to.equal('1.0');
        expect(api.endpointPrefix).to.equal('endpoint');
        expect(api.globalEndpoint).to.equal('global');
        expect(api.signatureVersion).to.equal('v4');
        expect(api.protocol).to.equal('json');
        expect(api.xmlNamespaceUri).to.equal('URI');
        expect(api.abbreviation).to.equal('abbr');
        expect(api.fullName).to.equal('name');
        return expect(api.signingName).to.equal('alias');
      });
    });

    describe('isApi', function() {
      return it('is an API', function() {
        return expect(make().isApi).to.equal(true);
      });
    });

    describe('serviceIdentifier', function() {
      it('creates an API with passed serviceIdentifier', function() {
        return expect(make({}, { serviceIdentifier: 'asdf' }).isApi).to.equal(true);
      });
    });

    describe('className', function() {
      it('generates the correct class name from fullName', function() {
        var api;
        api = make({
          metadata: {
            serviceFullName: 'Amazon Service Name HeRE'
          }
        });
        return expect(api.className).to.equal('ServiceNameHeRE');
      });
      it('uses abbreviation if supplied', function() {
        var api;
        api = make({
          metadata: {
            serviceAbbreviation: 'Amazon SNH'
          }
        });
        return expect(api.className).to.equal('SNH');
      });
      it('special cases ELB', function() {
        var api;
        api = make({
          metadata: {
            serviceFullName: 'AWS Elastic Load Balancing'
          }
        });
        return expect(api.className).to.equal('ELB');
      });
      return it('handles lack of service name', function() {
        return expect(make().className).to.equal(null);
      });
    });

    describe('endpoint operation', function() {
      it('adds endpiont discovery opeation name and required flag when exists', function() {
        var api = make({
          operations: {
            DescribeEndpoints: {
              http: {},
              input: {},
              name: 'DescribeEndpoints',
              endpointoperation: true,
            },
            SomeOperation: {
              http: {},
              input: {},
              name: 'SomeOperation',
            },
            OptionalEndpointOperation: {
              http: {},
              input: {},
              name: 'OptionalEndpointOperation',
              endpointdiscovery: {}
            },
            RequiredEndpointOperation: {
              http: {},
              input: {},
              name: 'RequiredEndpointOperation',
              endpointdiscovery: {
                required: true
              }
            }
          }
        });
        expect(api.endpointOperation).to.equal('describeEndpoints');
        expect(api.hasRequiredEndpointDiscovery).to.equal(true);
        expect(api.operations.someOperation.endpointDiscoveryRequired).to.equal('NULL');
        expect(api.operations.optionalEndpointOperation.endpointDiscoveryRequired).to.equal('OPTIONAL');
        expect(api.operations.requiredEndpointOperation.endpointDiscoveryRequired).to.equal('REQUIRED');
      });
    });

    describe('documentation', function() {
      it('does not provide documentation by default', function() {
        var api;
        api = make({
          documentation: 'foo'
        });
        return expect(api.documentation).not.to.exist;
      });
      return it('can attach documentation if option is enabled', function() {
        var api;
        api = make({
          documentation: 'foo'
        }, {
          documentation: true
        });
        return expect(api.documentation).to.equal('foo');
      });
    });

    describe('shapes', function() {
      return it('creates a set of shapes', function() {
        var api;
        api = make({
          shapes: {
            Shape1: {
              type: 'structure',
              members: {
                Member1: {
                  shape: 'MemberShape',
                  timestampFormat: 'rfc822'
                }
              }
            },
            MemberShape: {
              type: 'timestamp',
              timestampFormat: 'iso8601'
            }
          }
        });
        return expect(api.shapes.Shape1.members.Member1.type).to.equal('timestamp');
      });
    });
  });

}).call(this);

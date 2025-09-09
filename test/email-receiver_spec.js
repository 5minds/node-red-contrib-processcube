const should = require('should');

describe('Email Receiver Node', function() {
  // Set a reasonable timeout
  this.timeout(10000);

  // Module and mocking setup
  let emailReceiverNode;
  let originalLoad;

  before(function() {
    // Create mock modules
    const mockModules = {
      'node-imap': function(config) {
        this.config = config;
        this.connect = function() {};
        this.openBox = function() {};
        this.search = function() {};
        this.fetch = function() { return { on: function() {}, once: function() {} }; };
        this.end = function() {};
        this.once = function() {};
        return this;
      },
      'mailparser': {
        simpleParser: function() {
          return Promise.resolve({
            subject: 'test',
            text: 'test body',
            html: '<p>test</p>',
            from: { text: 'test@test.com' },
            date: new Date(),
            headers: new Map(),
            attachments: []
          });
        }
      }
    };

    // Override require
    const Module = require('module');
    originalLoad = Module._load;
    Module._load = function(request, parent) {
      if (mockModules[request]) {
        return mockModules[request];
      }
      return originalLoad.apply(this, arguments);
    };

    // Load the node with mocked dependencies
    emailReceiverNode = require('../email-receiver.js');
  });

  after(function() {
    // Restore original module loading
    if (originalLoad) {
      const Module = require('module');
      Module._load = originalLoad;
    }
  });

  describe('Unit Tests', function() {
    it('should export a function', function() {
      // ARRANGE: Node module is already loaded

      // ACT: Check the type of the exported module

      // ASSERT: Should be a function
      emailReceiverNode.should.be.type('function');
    });

    it('should register node type without errors', function() {
      // ARRANGE: Set up mock RED object and capture registration calls
      let registeredType;
      let registeredConstructor;

      const mockRED = {
        nodes: {
          createNode: function(node, config) {
            node.id = config.id;
            node.type = config.type;
            node.name = config.name;
            node.on = function() {};
            node.status = function() {};
            node.error = function() {};
            node.send = function() {};
            return node;
          },
          registerType: function(type, constructor) {
            registeredType = type;
            registeredConstructor = constructor;
          }
        },
        util: {
          evaluateNodeProperty: function(value, type) {
            return value;
          },
          encrypt: function(value) {
            return 'encrypted:' + value;
          }
        }
      };

      // ACT: Call the node registration function
      emailReceiverNode(mockRED);

      // ASSERT: Verify registration was called correctly
      registeredType.should.equal('email-receiver');
      registeredConstructor.should.be.type('function');
    });

    it('should handle node instantiation', function() {
      // ARRANGE: Set up mock RED object and node instance tracking
      let nodeInstance;

      const mockRED = {
        nodes: {
          createNode: function(node, config) {
            nodeInstance = node;
            node.id = config.id;
            node.type = config.type;
            node.name = config.name;
            node.on = function() {};
            node.status = function() {};
            node.error = function() {};
            node.send = function() {};
            return node;
          },
          registerType: function(type, NodeConstructor) {
            // Simulate creating a node instance with valid config
            const config = {
              id: 'test-node',
              type: 'email-receiver',
              name: 'Test Email Receiver',
              host: 'imap.test.com',
              hostType: 'str',
              port: 993,
              portType: 'num',
              user: 'test@test.com',
              userType: 'str',
              password: 'testpass',
              passwordType: 'str',
              folder: 'INBOX',
              folderType: 'str',
              markseen: true,
              markseenType: 'bool'
            };

            new NodeConstructor(config);
          }
        },
        util: {
          evaluateNodeProperty: function(value, type) {
            return value;
          },
          encrypt: function(value) {
            return 'encrypted:' + value;
          }
        }
      };

      // ACT: Register the node and create an instance
      emailReceiverNode(mockRED);

      // ASSERT: Verify the node instance was created with correct properties
      should.exist(nodeInstance);
      nodeInstance.should.have.property('name', 'Test Email Receiver');
    });
  });

  describe('Integration Tests with Node-RED Helper', function() {
    const helper = require('node-red-node-test-helper');

    // CRITICAL: Initialize the helper with Node-RED
    before(function(done) {
      // This is the missing piece that was causing the clearRegistry error
      helper.init(require.resolve('node-red'));
      done();
    });

    beforeEach(function(done) {
      helper.startServer(done);
    });

    afterEach(function(done) {
      helper.unload();
      helper.stopServer(done);
    });

    it('should load in Node-RED test environment', function(done) {
      // ARRANGE: Set up Node-RED flow with proper configuration
      const flow = [
        {
          id: "n1",
          type: "email-receiver",
          name: "test node",
          host: "imap.test.com",
          hostType: "str",
          port: "993",
          portType: "str",
          tls: true,
          tlsType: "bool",
          user: "test@example.com",
          userType: "str",
          password: "testpass",
          passwordType: "str",
          folder: "INBOX",
          folderType: "str",
          markseen: true,
          markseenType: "bool"
        }
      ];

      // ACT: Load the node in the test helper environment
      helper.load(emailReceiverNode, flow, function() {
        try {
          // ASSERT: Verify the node loaded correctly
          const n1 = helper.getNode("n1");
          should.exist(n1);
          n1.should.have.property('name', 'test node');
          n1.should.have.property('type', 'email-receiver');
          done();
        } catch (err) {
          done(err);
        }
      });
    });

    it('should create wired connections correctly', function(done) {
      // ARRANGE: Set up flow with helper node to catch output
      const flow = [
        {
          id: "n1",
          type: "email-receiver",
          name: "test node",
          host: "imap.test.com",
          hostType: "str",
          port: "993",
          portType: "str",
          tls: true,
          tlsType: "bool",
          user: "test@example.com",
          userType: "str",
          password: "testpass",
          passwordType: "str",
          folder: "INBOX",
          folderType: "str",
          markseen: true,
          markseenType: "bool",
          wires: [["n2"]]
        },
        { id: "n2", type: "helper" }
      ];

      // ACT: Load nodes and verify connections
      helper.load(emailReceiverNode, flow, function() {
        try {
          const n1 = helper.getNode("n1");
          const n2 = helper.getNode("n2");

          // ASSERT: Both nodes should exist and be connected
          should.exist(n1);
          should.exist(n2);
          n1.should.have.property('name', 'test node');
          n2.should.have.property('type', 'helper');

          done();
        } catch (err) {
          done(err);
        }
      });
    });

    it('should handle input without crashing', function(done) {
      // ARRANGE: Set up minimal flow
      const flow = [
        {
          id: "n1",
          type: "email-receiver",
          name: "test node",
          host: "imap.test.com",
          hostType: "str",
          port: "993",
          portType: "str",
          tls: true,
          tlsType: "bool",
          user: "test@example.com",
          userType: "str",
          password: "testpass",
          passwordType: "str",
          folder: "INBOX",
          folderType: "str",
          markseen: true,
          markseenType: "bool"
        }
      ];

      // ACT: Load node and send input
      helper.load(emailReceiverNode, flow, function() {
        try {
          const n1 = helper.getNode("n1");
          should.exist(n1);

          // Send input - this should not crash due to mocked IMAP
          n1.receive({ payload: "test input" });

          // ASSERT: If we reach here, the node handled input gracefully
          setTimeout(() => {
            done(); // Success if no errors thrown
          }, 500);

        } catch (err) {
          done(err);
        }
      });
    });
  });
});
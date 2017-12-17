console.log('Loading function');

const AWS = require('aws-sdk');


var params = {
  taskDefinition: 'odm:1', /* required */
  cluster: 'odm',
  count: 1,
  group: 'odm',
  placementStrategy: [
    {
      field: 'instanceId',
      type: 'spread'
    }
  ]
};

exports.handler = function(event, context, callback) {
    console.log("\n\nLoading handler\n\n");
    var requestBody = JSON.parse(event.body);
    const ecs = new AWS.ECS();
    params.overrides =
    requestBody;
    ecs.runTask(params, function(err, data) {
        if (err) {
            console.log(err.stack);
            const reponse = {
              statusCode: 503,
              headers: {
              "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
              "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS
            },
            body: JSON.stringify({ "message": "Server error " + err.stack })
          };
          callback(null, response);
        } else {
          console.log(event);
          const response = {
            statusCode: 200,
            headers: {
              "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
              "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS
            },
            body: JSON.stringify({ "message": "Task running." })
          };
          callback(null, response);
        }
    });
};

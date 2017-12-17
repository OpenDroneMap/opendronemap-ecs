# opendronemap-ecs
Serverless API to get opendronemap tasks running on AWS Elastic Container Service (ECS) backed by an Elastic File System (EFS) as working space, with files copied in from Simple Storage Service (S3).

## Note
STILL IN DEVELOPMENT

## Requirements
1. Set up an EFS share in AWS, make sure it's available across all availability zones for your desired security group in your region of choice. Make a note of the EFS hostname.

2. Configure an autoscaling launch configuration through the AWS EC2 console.
  a. At the choose AMI step, select the ECS AMI for your AWS region from  , and under the AWS  marketplace tab, search for "ECS" to find the relevant AMI (a list of current AMI IDs for ECS AMIs can be found [here](http://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-optimized_AMI.html)).
  b. Choose an instance type—I recommend r4.4xlarge (and the memory setting in [odm-task-definition.json](odm-task-definition.json) is geared for that).
  c. Under configure details, enter a name of your choice, review other settings, and under advanced settings enter the user data from [user-data.yml](user-data-yml)
  e. Select a security group (needs to be the same as the security group used at step 1).

3. Launch an autoscaling cluster using that new configuration. Under scaling policies I recommend one based on average CPU to start / terminate instances based on demand, as ODM is a CPU intensive task.

4. Install [serverless](https://serverless.com):
```shell
npm i -g serverless
```
See the [serverless quick start](https://serverless.com/framework/docs/providers/aws/guide/quick-start/) for more details on getting set up with serverless.

5. Once serverless is set up, you can then deploy the service by running
```shell
serverless deploy
```

This will return the URLs that you can then use to interact with the API you then set up custom domain with TLS in AWS web console for API Gateway or using the AWS CLI tool.

# API
* The /register API that takes a json task definition like [[odm-task-definition.json](odm-task-definition.json) as the PUT body needs only be run once, or if you want to re-configure the task, noting that it's versioned and you will need to update the version in run.js and redeploy, noting you can run `serverless deploy function --function run` to update just the run function.
* The /run API runs an ODM task on the cluster, see [example-run-body.json](example-run-body.json) for an example.

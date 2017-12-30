# opendronemap-ecs
Serverless API to get opendronemap tasks running on AWS Elastic Container, with input files copied in from and output files copied back out to Simple Storage Service (S3).

## Note
STILL IN DEVELOPMENT

## Requirements
1. Install serverless and the AWS command line tool:

    * Install [serverless](https://serverless.com):
```shell
npm i -g serverless
```
    See the [serverless quick start](https://serverless.com/framework/docs/providers/aws/guide/quick-start/) for more details on getting set up with serverless (including configuring your AWS credentials via [this method](https://serverless.com/framework/docs/providers/aws/guide/credentials#setup-with-the-aws-cli) so that Step 2 below also works).

    * Install the AWS CLI tool https://docs.aws.amazon.com/cli/latest/userguide/installing.html
    (if using [homebrew](https://brew.sh) on macOS you can just run `brew install awscli` to install).

2. Create the cluster by running `aws ecs create-cluster --cluster-name "odm"`. This is just a one-off step (unless you delete the cluster) that just registers the cluster name, we separately manage add (and remove) EC2 instances to the cluster through an autoscaling group as described later in Step 4.

3. Configure an autoscaling launch configuration through the AWS EC2 console. Go to your desired region and scroll the left nav down to find 'AUTO SCALING'>'Launch Configurations' then select 'Create Launch Configuration'
    * __Step 3.A: Choose AMI__ - Under the AWS Marketplace tab, search for "ECS" to find the Amazon ECS-Optimized Amazon Linux AMI. A list of current AMI IDs for ECS AMIs by region can be found [here](http://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-optimized_AMI.html).
    * __Step 3.B: Choose Instance Type__ - I recommend r4.4xlarge and the memory setting in [odm-task-definition.json](odm-task-definition.json) is geared for that.
    * __Step 3.C: Configure Details__ - Enter a name of your choice, review other settings, make sure the IAM role has access to your s3 bucket ([example policy you can attach](example-s3-policy.json)), and under 'Advanced Details' for 'User data' enter [user-data.yml](user-data.yml).
    * __Step 3.D: Add storage__ - make sure this is big enough to (temporarily) hold your input files for an individual task (assuming one task / instance).
    * __Step 3.E: Configure security group__ - Select or create a security group (no inbound ports strictly required although for debugging in the EC2 instance you must allow ssh in). If launching in EC2-classic (if your account supports that) then the security group must be an EC2-classic security group.

4. Launch an autoscaling cluster using the new configuration. At the end of Step 3 select 'Create an Auto Scaling group using this launch configuration' or go to your desired region and scroll the left nav down to find 'AUTO SCALING'>'Auto Scaling Groups' then select 'Create Auto Scaling group' then choose 'Create an Auto Scaling group from an existing launch configuration' and select the launch configuration created in Step 3.
    * __Step 4.A: Configure Auto Scaling group details__
        * __Group name__ -
        * __Group size__ -
        * __Network__ - For network select a VPC (default unless you want to have a separate isolated [VPC](https://aws.amazon.com/vpc/)). If your account is old enough that you have the choice of EC2-classic or EC2-VPC, I recommend EC2-VPC, although it will work in either. Note previous comment about security groups in Step 1.E.
        * __Subnet__ - For higher availability I recommend using subnets across all availability zones.
    * __Step 4.B: Configure scaling policies__ - I recommend one based on average CPU to start / terminate instances based on demand, as ODM is a CPU intensive task.
        * __Scale between X and Y instances__ - Here set a minimum of 1, and set a maximum equal to the number of image processing tasks  (one task per instance, however note issue discussed [here](https://github.com/OpenDroneMap/opendronemap-ecs/issues/6#issuecomment-352321577)), one image task corresponding to one project folder per the /run API discussed below.
        * __Target value:__ - I recommend 30% so scaling happens early in an ODM task, a bit low to allow for more capacity for new tasks while the first task is starting up, but not so low to trigger other minor background processes on the EC2 instances in the cluster.
Note that the autoscaling group can be deleted, which you may wish to do once your tasks are finished. You can launch a new one later for further processing by repeating this step. There's no need to delete the cluster, as it can remain around as a logical entity with no instances registered, and if you do delete it, you would have to re-run Step 2.

5. Edit [serverless.yml](serverless.yml) with your custom settings as needed, you can then deploy the service by running:
```shell
serverless deploy
```
This will return the URLs that you can then use to interact with the API you then set up custom domain with TLS in AWS web console for API Gateway or using the AWS CLI tool. For example:
```shell
Serverless: Stack update finished...
Service Information
service: odm
stage: prod
region: us-east-1
stack: odm-prod
api keys:
  None
endpoints:
  POST - https://abc123.execute-api.us-east-1.amazonaws.com/prod/run
  POST - https://abc123.execute-api.us-east-1.amazonaws.com/prod/register
functions:
  run: odm-prod-run
  register: odm-prod-register
```

# API
* The /register API that takes a json task definition like [[odm-task-definition.json](odm-task-definition.json) as the PUT body needs only be run once, or if you want to re-configure the task, noting that it's versioned and you will need to update the version in run.js and redeploy, noting you can run `serverless deploy function --function run` to update just the run function. For more information on the fields here refer [to documentation](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html) on these parameters. Note that `family` must match the taskDefinition in [run.js](run.js) (excluding the `:versionNumber` part) and `image` must be a supported image (at present time only matthewberryman/opendronemap ).
* The /run API runs an ODM task on the cluster, see [example-run-body.json](example-run-body.json) for an example.

# Debugging
* To view the logs for the API go to the AWS console, select the region you deployed to (per serverless.yml), select Lambda, and then look for the deployed function named opendronemap-ecs-prod-run (unless you changed the service, stage and/or function name lines in serverless.yml), then click on monitoring, click on jump to logs, and select an appropriate time range in the CloudWatch logs.
* In your AWS EC2 Dashboard under 'Auto Scaling Groups', select your group and then select the 'Activity History' tab and check for a `Failed` status with a description such as `Launching a new EC2 instance. Status Reason: VPC security groups may not be used for a non-VPC launch. Launching EC2 instance failed.`

# Web
* There's a basic web page for submitting jobs under [web/](web/) that you could host somewhere, after first replacing the API URL with the API URL generated by `serverless deploy`.
* On the to-do list is some web work to support S3 uploads. For now, I recommend an s3 client like (cross-platform) [CyberDuck](https://cyberduck.io/) or (macOS only) [ForkLift](https://www.binarynights.com/forklift/)

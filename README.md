# items

## INFO

This is a generic item CRUD/GraphQL service. It creates, updates, deletes, and allows for direct gets as well as supporting an _ok_ query language.
### BEFORE RUNNING THE SERVICE
- log into the aws account
- create a new user, assign permissions directly to it, the only permission being: administrator access
- copy the KEY ID and the SECRET ACCESS KEY
- add them to the `~/.aws/credentials` like this:
```
[your-application]
aws_access_key_id = KEY_ID
aws_secret_access_key = SECRET_KEY
```
- add configuration to your `~/.aws/config` as well:
```
[profile your-application]
output=json
region=ap-southeast-2
```

### RUNNING THE SERVICE
run the service locally with `make start`
deploy the service to the production environment once changes approved with `make deploy`

### TESTING THE SERVICE
run the command `make test`

## TODOS
1. load the url into a config that we can read in the federation gateway
1. REST routes on the `/item` url with a broken-out controller. That way we can have complicated nested calls without having large gql request syntax.

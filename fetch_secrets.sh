#!/bin/bash

SECRET_NAME="peerprep/env"

aws secretsmanager get-secret-value --secret-id "$SECRET_NAME" --query SecretString --output text | jq -r 'to_entries|map("\(.key)=\(.value)")|.[]' > .env

chmod 600 .env

echo ".env file created from AWS Secrets Manager secret: $SECRET_NAME"
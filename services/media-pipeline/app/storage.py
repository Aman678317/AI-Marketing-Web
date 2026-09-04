import os
import boto3
from botocore.client import Config

def get_s3_client():
    endpoint = os.getenv('MINIO_ENDPOINT', 'localhost:9000')
    return boto3.client(
        's3',
        endpoint_url=f'http://{endpoint}',
        aws_access_key_id=os.getenv('MINIO_ACCESS_KEY','minioadmin'),
        aws_secret_access_key=os.getenv('MINIO_SECRET_KEY','minioadmin'),
        config=Config(signature_version='s3v4')
    )

def upload_file(file_path, bucket, key):
    s3 = get_s3_client()
    s3.upload_file(file_path, bucket, key)
    return f'http://{os.getenv("MINIO_ENDPOINT")}/{bucket}/{key}'

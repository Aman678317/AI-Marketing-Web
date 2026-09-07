import os
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

BUCKET = os.getenv('MINIO_BUCKET', 'ai-marketing-assets')

def get_s3_client():
    endpoint = os.getenv('MINIO_ENDPOINT', 'localhost:9000')
    return boto3.client(
        's3',
        endpoint_url=f'http://{endpoint}',
        aws_access_key_id=os.getenv('MINIO_ACCESS_KEY', 'minioadmin'),
        aws_secret_access_key=os.getenv('MINIO_SECRET_KEY', 'minioadmin'),
        config=Config(signature_version='s3v4', connect_timeout=3, read_timeout=5,
                      retries={'max_attempts': 1}),
        region_name='us-east-1',
    )

def ensure_bucket(bucket: str = BUCKET) -> bool:
    s3 = get_s3_client()
    try:
        s3.head_bucket(Bucket=bucket)
        return True
    except ClientError:
        s3.create_bucket(Bucket=bucket)
        return True

def upload_file(file_path: str, key: str, bucket: str = BUCKET) -> dict:
    """Upload an artifact and return a presigned download URL (7 days)."""
    s3 = get_s3_client()
    ensure_bucket(bucket)
    s3.upload_file(file_path, bucket, key)
    url = s3.generate_presigned_url(
        'get_object',
        Params={'Bucket': bucket, 'Key': key},
        ExpiresIn=60 * 60 * 24 * 7,
    )
    return {'bucket': bucket, 'key': key, 'url': url}

def object_stats(key: str, bucket: str = BUCKET) -> dict:
    s3 = get_s3_client()
    st = s3.head_object(Bucket=bucket, Key=key)
    return {'size': st['ContentLength'], 'content_type': st.get('ContentType', '')}

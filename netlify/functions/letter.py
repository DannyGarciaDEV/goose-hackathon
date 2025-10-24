import json
import os
import base64
from pathlib import Path

def handler(event, context):
    """Netlify function to serve ASL letter images"""
    
    # Set CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    }
    
    # Handle preflight requests
    if event['httpMethod'] == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }
    
    try:
        # Extract letter from path
        path_parts = event['path'].split('/')
        if len(path_parts) < 3:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({"error": "Letter not specified"})
            }
        
        letter = path_parts[2]
        
        # Path to ASL dataset - Netlify functions run from root, so look for dist/asl_dataset
        dataset_path = Path("dist/asl_dataset")
        if not dataset_path.exists():
            # Fallback for local development
            dataset_path = Path("asl_dataset")
        if not dataset_path.exists():
            # Another fallback
            dataset_path = Path("/Users/dannygarcia/asl_learning_app/asl_dataset")
        
        # Debug: Log the path being used
        print(f"Looking for dataset at: {dataset_path}")
        print(f"Dataset exists: {dataset_path.exists()}")
        
        letter_path = dataset_path / letter
        
        if not letter_path.exists():
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({
                    "error": f"Letter '{letter}' not found",
                    "dataset_path": str(dataset_path),
                    "letter_path": str(letter_path),
                    "dataset_exists": dataset_path.exists()
                })
            }
        
        # Get first image file
        image_files = list(letter_path.glob("*.jpg")) + list(letter_path.glob("*.jpeg")) + list(letter_path.glob("*.png"))
        
        if not image_files:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({"error": "No images found for letter"})
            }
        
        # Read and encode image
        image_path = image_files[0]
        with open(image_path, 'rb') as f:
            image_data = f.read()
        
        # Determine content type
        if image_path.suffix.lower() in ['.jpg', '.jpeg']:
            content_type = 'image/jpeg'
        elif image_path.suffix.lower() == '.png':
            content_type = 'image/png'
        else:
            content_type = 'application/octet-stream'
        
        # Encode image as base64
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        return {
            'statusCode': 200,
            'headers': {
                **headers,
                'Content-Type': content_type
            },
            'body': image_base64,
            'isBase64Encoded': True
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({"error": str(e)})
        }

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
        
        # Debug: Log everything
        print(f"Requested letter: {letter}")
        print(f"Event path: {event['path']}")
        print(f"Path parts: {path_parts}")
        
        # Try multiple paths for the dataset
        possible_paths = [
            Path("./dist/asl_dataset"),
            Path("dist/asl_dataset"),
            Path("asl_dataset"),
            Path("../asl_dataset"),  # netlify/asl_dataset
            Path("/asl_dataset"),
            Path("/tmp/asl_dataset"),
            Path(".")
        ]
        
        dataset_path = None
        for path in possible_paths:
            print(f"Checking path: {path}")
            if path.exists():
                print(f"Found dataset at: {path}")
                dataset_path = path
                break
        
        if not dataset_path:
            # List what's available
            import os
            print(f"Current directory: {os.getcwd()}")
            print(f"Directory contents: {os.listdir('.')}")
            
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({
                    "error": "Dataset not found",
                    "checked_paths": [str(p) for p in possible_paths],
                    "current_dir": os.getcwd(),
                    "dir_contents": os.listdir('.')
                })
            }
        
        letter_path = dataset_path / letter
        
        if not letter_path.exists():
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({
                    "error": f"Letter '{letter}' not found",
                    "dataset_path": str(dataset_path),
                    "letter_path": str(letter_path)
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
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({"error": str(e)})
        }
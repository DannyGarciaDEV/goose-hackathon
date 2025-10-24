import json
import os
from pathlib import Path

def handler(event, context):
    """Netlify function to get available ASL letters"""
    
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
        # Debug: Log everything
        print(f"Event path: {event['path']}")
        print(f"Current directory: {os.getcwd()}")
        print(f"Directory contents: {os.listdir('.')}")
        
        # Try multiple paths for the dataset
        possible_paths = [
            Path("./dist/asl_dataset"),
            Path("dist/asl_dataset"),
            Path("asl_dataset"),
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
        
        # Get available letters
        letters = [d.name for d in dataset_path.iterdir() if d.is_dir()]
        letters.sort()
        
        print(f"Found {len(letters)} letters: {letters}")
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({"letters": letters})
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({"error": str(e)})
        }
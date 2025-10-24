import json
import os
from pathlib import Path

def handler(event, context):
    """Netlify function to check quiz answers"""
    
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
        if len(path_parts) < 4:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({"error": "Letter not specified"})
            }
        
        letter = path_parts[3]
        
        # Path to ASL dataset
        dataset_path = Path("asl_dataset")
        if not dataset_path.exists():
            dataset_path = Path("/Users/dannygarcia/asl_learning_app/asl_dataset")
        
        # Get available letters
        letters = [d.name for d in dataset_path.iterdir() if d.is_dir()]
        letters.sort()
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                "correct": letter.lower() in [l.lower() for l in letters],
                "letter": letter.lower()
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({"error": str(e)})
        }

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
        # Path to ASL dataset - in Netlify, it's in the dist folder
        dataset_path = Path("dist/asl_dataset")
        if not dataset_path.exists():
            # Fallback for local development
            dataset_path = Path("asl_dataset")
        if not dataset_path.exists():
            # Another fallback
            dataset_path = Path("/Users/dannygarcia/asl_learning_app/asl_dataset")
        
        # Get available letters
        letters = [d.name for d in dataset_path.iterdir() if d.is_dir()]
        letters.sort()
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({"letters": letters})
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({"error": str(e)})
        }

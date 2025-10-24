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
        # Path to ASL dataset - In Netlify, the dataset is in dist/asl_dataset
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
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({"error": str(e)})
        }

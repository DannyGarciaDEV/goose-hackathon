import json
import os
import random
from pathlib import Path

def handler(event, context):
    """Netlify function for quiz functionality"""
    
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
        # Path to ASL dataset - In Netlify, the dataset is copied to root
        dataset_path = Path("asl_dataset")
        if not dataset_path.exists():
            # Fallback to dist folder
            dataset_path = Path("dist/asl_dataset")
        if not dataset_path.exists():
            # Another fallback
            dataset_path = Path("/Users/dannygarcia/asl_learning_app/asl_dataset")
        
        # Get available letters
        letters = [d.name for d in dataset_path.iterdir() if d.is_dir()]
        letters.sort()
        
        if not letters:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({"error": "No letters available"})
            }
        
        # Get random letter
        random_letter = random.choice(letters)
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                "letter": random_letter,
                "image_url": f"/api/letter/{random_letter}"
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({"error": str(e)})
        }

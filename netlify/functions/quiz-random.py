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
            if path.exists():
                dataset_path = path
                break
        
        if not dataset_path:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({"error": "Dataset not found"})
            }
        
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

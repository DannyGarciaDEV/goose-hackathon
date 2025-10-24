import json

def handler(event, context):
    """Simple test function to verify Netlify functions are working"""
    
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    }
    
    if event['httpMethod'] == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }
    
    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            "message": "Netlify functions are working!",
            "method": event['httpMethod'],
            "path": event['path'],
            "timestamp": "2024-10-24"
        })
    }

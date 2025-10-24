import json
import os
from pathlib import Path

def handler(event, context):
    """Test function to debug Netlify environment"""
    
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
    
    try:
        # Get current working directory
        cwd = os.getcwd()
        
        # List all files and directories
        try:
            root_contents = os.listdir('/')
        except:
            root_contents = "Cannot access root"
        
        try:
            current_contents = os.listdir('.')
        except:
            current_contents = "Cannot access current directory"
        
        # Check specific paths
        paths_to_check = [
            "asl_dataset",
            "dist",
            "dist/asl_dataset",
            "./dist/asl_dataset",
            "/asl_dataset",
            "/tmp/asl_dataset"
        ]
        
        path_results = {}
        for path in paths_to_check:
            try:
                path_obj = Path(path)
                path_results[path] = {
                    "exists": path_obj.exists(),
                    "is_dir": path_obj.is_dir() if path_obj.exists() else False,
                    "contents": list(path_obj.iterdir()) if path_obj.exists() and path_obj.is_dir() else []
                }
            except Exception as e:
                path_results[path] = {"error": str(e)}
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                "current_directory": cwd,
                "root_contents": root_contents,
                "current_contents": current_contents,
                "path_results": path_results,
                "event_path": event.get('path', 'unknown'),
                "event_method": event.get('httpMethod', 'unknown')
            }, indent=2)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({"error": str(e)})
        }

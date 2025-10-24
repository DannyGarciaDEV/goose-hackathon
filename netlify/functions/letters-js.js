const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };
    
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: headers,
            body: ''
        };
    }
    
    try {
        // Try multiple paths for the dataset
        const possiblePaths = [
            './dist/asl_dataset',
            'dist/asl_dataset',
            'asl_dataset',
            '../asl_dataset',
            '/asl_dataset',
            '/tmp/asl_dataset',
            '.'
        ];
        
        let datasetPath = null;
        for (const testPath of possiblePaths) {
            console.log(`Checking path: ${testPath}`);
            if (fs.existsSync(testPath)) {
                const files = fs.readdirSync(testPath);
                const directories = files.filter(file => {
                    const fullPath = path.join(testPath, file);
                    return fs.statSync(fullPath).isDirectory();
                });
                if (directories.length > 0) {
                    datasetPath = testPath;
                    console.log(`Found dataset at: ${testPath}`);
                    break;
                }
            }
        }
        
        if (!datasetPath) {
            return {
                statusCode: 404,
                headers: headers,
                body: JSON.stringify({
                    error: "Dataset not found",
                    checkedPaths: possiblePaths,
                    currentDir: process.cwd(),
                    dirContents: fs.readdirSync('.')
                })
            };
        }
        
        // Get available letters
        const letters = fs.readdirSync(datasetPath)
            .filter(file => {
                const fullPath = path.join(datasetPath, file);
                return fs.statSync(fullPath).isDirectory();
            })
            .sort();
        
        console.log(`Found ${letters.length} letters: ${letters.join(', ')}`);
        
        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({
                letters: letters,
                datasetPath: datasetPath,
                count: letters.length
            })
        };
        
    } catch (error) {
        console.error('Error in letters function:', error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({
                error: error.message,
                stack: error.stack
            })
        };
    }
};

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
        // Extract letter from path
        const pathParts = event.path.split('/');
        const letter = pathParts[pathParts.length - 1];
        
        console.log(`Requested letter: ${letter}`);
        console.log(`Event path: ${event.path}`);
        console.log(`Path parts: ${JSON.stringify(pathParts)}`);
        
        // Try multiple paths for the dataset
        const possiblePaths = [
            './asl_dataset',  // Dataset copied to function directory
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
        
        // Check if letter directory exists
        const letterPath = path.join(datasetPath, letter);
        if (!fs.existsSync(letterPath)) {
            return {
                statusCode: 404,
                headers: headers,
                body: JSON.stringify({
                    error: `Letter '${letter}' not found`,
                    datasetPath: datasetPath,
                    letterPath: letterPath,
                    datasetExists: fs.existsSync(datasetPath)
                })
            };
        }
        
        // Get image files from letter directory
        const imageFiles = fs.readdirSync(letterPath)
            .filter(file => /\.(jpg|jpeg|png)$/i.test(file));
        
        if (imageFiles.length === 0) {
            return {
                statusCode: 404,
                headers: headers,
                body: JSON.stringify({
                    error: `No images found for letter '${letter}'`,
                    letterPath: letterPath,
                    allFiles: fs.readdirSync(letterPath)
                })
            };
        }
        
        // Select a random image
        const randomImage = imageFiles[Math.floor(Math.random() * imageFiles.length)];
        const imagePath = path.join(letterPath, randomImage);
        
        console.log(`Serving image: ${imagePath}`);
        
        // Read and return the image
        const imageBuffer = fs.readFileSync(imagePath);
        const contentType = path.extname(randomImage).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
        
        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600'
            },
            body: imageBuffer.toString('base64'),
            isBase64Encoded: true
        };
        
    } catch (error) {
        console.error('Error in letter function:', error);
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

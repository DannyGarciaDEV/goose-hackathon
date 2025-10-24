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
    
    return {
        statusCode: 200,
        headers: headers,
        body: JSON.stringify({
            message: "JavaScript function is working!",
            method: event.httpMethod,
            path: event.path,
            timestamp: new Date().toISOString()
        })
    };
};

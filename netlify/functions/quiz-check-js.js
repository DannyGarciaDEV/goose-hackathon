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
        
        console.log(`Checking quiz answer for letter: ${letter}`);
        
        // Valid ASL letters
        const validLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
        
        const isCorrect = validLetters.includes(letter.toLowerCase());
        
        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({
                correct: isCorrect,
                letter: letter.toLowerCase(),
                validLetters: validLetters
            })
        };
        
    } catch (error) {
        console.error('Error in quiz-check function:', error);
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

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
from pathlib import Path

app = Flask(__name__)
CORS(app)

# Path to ASL dataset - use relative path for deployment
DATASET_PATH = Path("asl_dataset")
if not DATASET_PATH.exists():
    # Fallback to absolute path for local development
    DATASET_PATH = Path("/Users/dannygarcia/asl_learning_app/asl_dataset")

# Load available letters
letters = [d.name for d in DATASET_PATH.iterdir() if d.is_dir()]
letters.sort()

@app.route('/')
def index():
    """Serve the main HTML page"""
    return send_file('../frontend/voice_only.html')

@app.route('/api/letters', methods=['GET'])
def get_available_letters():
    """Return list of available ASL letters"""
    return jsonify({"letters": letters})

@app.route('/api/letter/<letter>', methods=['GET'])
def get_letter_image(letter):
    """Return an example image for the requested letter"""
    letter = letter.lower()
    letter_path = DATASET_PATH / letter
    if not letter_path.exists():
        return jsonify({"error": "Letter not found"}), 404
    
    # Get first image in the letter directory
    image_files = list(letter_path.glob("*.jpg")) + list(letter_path.glob("*.jpeg")) + list(letter_path.glob("*.png"))
    if not image_files:
        return jsonify({"error": "No images found for letter"}), 404
    
    return send_file(str(image_files[0]))

# Quiz routes
@app.route('/quiz')
def quiz_page():
    return send_file('../frontend/quiz.html')

@app.route('/api/quiz/random')
def get_random_quiz_image():
    """Get a random ASL image for quiz"""
    if not letters:
        return jsonify({"error": "No letters available"}), 404
    
    # Pick a random letter
    import random
    random_letter = random.choice(letters)
    
    # Get a random image for that letter
    letter_path = DATASET_PATH / random_letter
    image_files = list(letter_path.glob("*.jpg")) + list(letter_path.glob("*.jpeg")) + list(letter_path.glob("*.png"))
    
    if not image_files:
        return jsonify({"error": "No images found for letter"}), 404
    
    random_image = random.choice(image_files)
    
    return jsonify({
        "letter": random_letter,
        "image_url": f"/api/letter/{random_letter}"
    })

@app.route('/api/quiz/check/<letter>')
def check_quiz_answer(letter):
    """Check if the spoken letter matches the quiz letter"""
    return jsonify({
        "correct": letter.lower() in [l.lower() for l in letters],
        "letter": letter.lower()
    })

if __name__ == '__main__':
    # Production configuration
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_ENV') != 'production'
    
    app.run(host='0.0.0.0', port=port, debug=debug)

from flask import Blueprint, jsonify

bp = Blueprint('api', __name__)

@bp.route('/api/health')
def health():
    return jsonify({'status': 'ok'})

@bp.route('/api/movies')
def movies():
    return jsonify([
        {
            "id": 1,
            "title": "The Avengers",
            "year": 2012,
            "rating": 8.0
        },
        {
            "id": 2,
            "title": "Interstellar",
            "year": 2014,
            "rating": 8.6
        }
    ])

from flask import Blueprint, jsonify
from .db import movies_collection

bp = Blueprint('api', __name__)

@bp.route('/api/health')
def health():
    return jsonify({'status': 'ok'})

@bp.route('/api/movies')
def movies():
    movies = list(movies_collection.find({}, {"_id": 0}))
    return jsonify(movies)
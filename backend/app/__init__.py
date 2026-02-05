from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app)
    from . import routes
    app.register_blueprint(routes.bp)
    
    from routes.recommendations import bp as recommendations_bp
    app.register_blueprint(recommendations_bp)
    return app

from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app, supports_credentials=True)

    from . import routes
    app.register_blueprint(routes.bp)
    
    from .my_list_routes import bp as my_list_bp
    app.register_blueprint(my_list_bp)

    from routes.recommendations import bp as recommendations_bp
    app.register_blueprint(recommendations_bp)

    from app.auth.auth_routes import bp as auth_bp
    app.register_blueprint(auth_bp)

    return app

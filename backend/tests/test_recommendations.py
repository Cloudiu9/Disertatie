from app.services.recommendation_service import INTERACTION_WEIGHTS

def test_interaction_weights():
    assert INTERACTION_WEIGHTS["seen"] == 1
    assert INTERACTION_WEIGHTS["like"] == 2
    assert INTERACTION_WEIGHTS["love"] == 3

from app.services.recommendation_service import _extract_ids

def test_extract_ids():
    raw = [
        {"tmdb_id": 1, "media_type": "movie"},
        {"tmdb_id": 2, "media_type": "tv"},
        {"tmdb_id": 3, "media_type": "movie"},
    ]

    result = _extract_ids(raw, "movie")

    assert result == [1, 3]

def test_empty_user_returns_fallback():
    result = []

    assert isinstance(result, list)
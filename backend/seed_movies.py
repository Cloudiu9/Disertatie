from app.db import movies_collection

movies = [
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
]

movies_collection.delete_many({})
movies_collection.insert_many(movies)

print("Seed completed")

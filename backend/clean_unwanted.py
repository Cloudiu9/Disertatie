from app.db import movies_collection, tv_collection

# ------------------------
# TARGETS
# ------------------------
MOVIES_TO_REMOVE = [
    "Hot Girls Wanted",
]

TV_TO_REMOVE = [
    "Redo of Healer",
    "Raw",
    "Tagesschau",
    "High School D×D",
]

# ------------------------
# DELETE LOGIC
# ------------------------
def delete_by_titles(collection, titles):
    for title in titles:
        result = collection.delete_many({"title": title})
        print(f"{title}: deleted {result.deleted_count}")

def run():
    print("\nRemoving movies...")
    delete_by_titles(movies_collection, MOVIES_TO_REMOVE)

    print("\nRemoving TV shows...")
    delete_by_titles(tv_collection, TV_TO_REMOVE)


if __name__ == "__main__":
    run()
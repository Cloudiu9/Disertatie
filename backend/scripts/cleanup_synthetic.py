import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import users_collection, interactions_collection

# Clean users with the old interaction structure
# interactions_collection.delete_many({"user_id": {"$exists": False}})
# interactions_collection.delete_many({"user_id": None})
# print("Purged orphaned interaction documents.")

# remove synthetic users only
synthetic_users = list(
    users_collection.find(
        {"email": {"$regex": "synthetic.local"}},
        {"_id": 1}
    )
)

synthetic_ids = [u["_id"] for u in synthetic_users]

if synthetic_ids:
    users_collection.delete_many({"_id": {"$in": synthetic_ids}})
    interactions_collection.delete_many({"user_id": {"$in": synthetic_ids}})

print(f"Removed {len(synthetic_ids)} synthetic users")
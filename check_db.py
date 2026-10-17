
import sqlite3

connection = sqlite3.connect("instance/fivpay.db")

for table in ["users", "transactions"]:
    print(f"\nTable: {table}")

    columns = connection.execute(
        f"PRAGMA table_info({table})"
    ).fetchall()

    for column in columns:
        print(column)

connection.close()

import sqlite3

connection = sqlite3.connect("instance/fivpay.db")

columns = connection.execute(
    "PRAGMA table_info(users)"
).fetchall()

print("Users table columns:")

for column in columns:
    print(column)

connection.close()

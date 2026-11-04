"""Database seeding package."""

__all__ = ["seed_database"]


def seed_database(*args, **kwargs):
    from app.seed.seeder import seed_database as _seed
    return _seed(*args, **kwargs)

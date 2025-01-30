from supabase import create_client
from api.core.config import get_settings


def create_first_admin():
    settings = get_settings()
    client = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_KEY
    )

    try:
        # create admin user
        response = client.auth.admin.create_user({
            "email": "",
            "password": "",
            "email_confirm": True,
            "user_metadata": {
                "role": "admin",
                "username": ""
            }
        })
        user = response.user
        print(f"Created admin user: {user.email}")
        print(f"User details: {user}")
        return user
    except Exception as e:
        print(f"Error creating admin: {str(e)}")
        raise e


if __name__ == "__main__":
    create_first_admin()

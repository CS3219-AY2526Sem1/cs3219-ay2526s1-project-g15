"""
Generate service-specific .env files from shared template

This script creates customized .env files for each microservice
based on the shared infrastructure template.
"""

import os

# Service configurations
# Services with "db_name" will get database configuration
# Services without "db_name" are assumed to be stateless or Redis-only
SERVICES = {
    "question-service": {
        "port": 8003,
        "db_name": "peerprep_questions"
    }
    # Add other services as needed:
    # "user-service": {
    #     "port": 8001,
    #     "db_name": "peerprep_users"
    # },
    # "notification-service": {
    #     "port": 8005
    #     # No db_name = no database configuration
    # }
}

def generate_env_file(service_name, config):
    """Generate .env file for a specific service"""

    # Paths
    template_path = os.path.join("infrastructure", "development", ".env.template")
    services_dir = os.path.join("services", service_name)
    output_path = os.path.join(services_dir, ".env.dev")

    # Check if service directory exists
    if not os.path.exists(services_dir):
        print(f"Service directory not found: {services_dir}")
        return False

    # Read template
    try:
        with open(template_path, 'r') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Template not found: {template_path}")
        return False

    # Replace placeholders
    service_short_name = service_name.replace("-service", "")
    content = content.replace("{SERVICE_NAME}", service_short_name)
    content = content.replace("{SERVICE_PORT}", str(config["port"]))

    # Handle database configuration (only for services that need databases)
    if "db_name" in config:
        content = content.replace("peerprep_{SERVICE_NAME}", config["db_name"])
        # Keep database-related sections
    else:
        # Remove database configuration for stateless services
        content = content.replace("peerprep_{SERVICE_NAME}", "# NO_DATABASE_NEEDED")
        # Comment out database-related lines
        lines = content.split('\n')
        new_lines = []
        for line in lines:
            if any(db_keyword in line.upper() for db_keyword in ["DATABASE_URL", "DB_NAME", "DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD"]):
                if not line.strip().startswith('#'):  # Don't double-comment
                    line = "# " + line + "  # Not needed for this service"
            new_lines.append(line)
        content = '\n'.join(new_lines)

    # Add service-specific app name
    app_name = f"peerprep-{service_name}"
    content = content.replace("peerprep-{SERVICE_NAME}-service", app_name)

    # Write output
    try:
        with open(output_path, 'w') as f:
            f.write(content)
        print(f"Generated: {output_path}")
        return True
    except Exception as e:
        print(f"Failed to write {output_path}: {e}")
        return False

def main():
    """Generate .env files for all services"""
    print("Generating service-specific .env files...")
    print()

    # Check if we're in the project root
    if not os.path.exists("infrastructure"):
        print("Please run this script from the project root directory")
        print("   (where infrastructure/ and services/ directories are located)")
        return

    success_count = 0
    total_count = len(SERVICES)

    for service_name, config in SERVICES.items():
        print(f"Generating .env for {service_name}...")
        if generate_env_file(service_name, config):
            success_count += 1
        print()

    print("=" * 50)
    print(f"Successfully generated {success_count}/{total_count} .env files")

    if success_count > 0:
        print()
        print("Next steps:")
        print("1. Review and customize each .env file as needed")
        print("2. Start shared infrastructure: cd infrastructure && python scripts/setup-infrastructure.py")
        print("3. Start each microservice: cd services/{service} && python run.py")

    if success_count < total_count:
        print()
        print("Some .env files were not generated.")
        print("   Make sure all service directories exist in services/")

if __name__ == "__main__":
    main()
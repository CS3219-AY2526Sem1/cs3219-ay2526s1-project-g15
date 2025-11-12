"""
PeerPrep Infrastructure Setup Script

This script sets up the shared infrastructure for all PeerPrep microservices:
- PostgreSQL with all service databases
- Redis for caching/sessions
- pgAdmin for database management
- Redis Commander for Redis management
"""

import os
import subprocess
import time
import sys

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"Running {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"Completed: {description}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Failed: {description} - {e}")
        print(f"Error output: {e.stderr}")
        return False

def check_docker():
    """Check if Docker is available"""
    print("Checking Docker availability...")
    if run_command("docker --version", "Docker version check"):
        return run_command("docker-compose --version", "Docker Compose version check")
    return False

def start_infrastructure():
    """Start the shared infrastructure"""
    print("\n" + "="*60)
    print("STARTING PEERPREP SHARED INFRASTRUCTURE")
    print("="*60)

    # Change to infrastructure directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    infrastructure_dir = os.path.dirname(script_dir)  # Go up one level from scripts/
    dev_dir = os.path.join(infrastructure_dir, "development")

    print(f"Working directory: {dev_dir}")
    os.chdir(dev_dir)

    # Start services
    if not run_command("docker-compose up -d", "Starting infrastructure services"):
        return False

    print("\nWaiting for services to be ready...")
    time.sleep(10)

    # Check service health
    services_status = {
        "PostgreSQL": "docker-compose exec -T postgres pg_isready -U peerprep",
        "Redis": "docker-compose exec -T redis redis-cli ping"
    }

    all_healthy = True
    for service, command in services_status.items():
        print(f"Checking {service}...")
        if run_command(command, f"{service} health check"):
            print(f"{service} is ready")
        else:
            print(f"{service} is not ready")
            all_healthy = False

    return all_healthy

def show_service_info():
    """Display information about running services"""
    print("\n" + "="*60)
    print("PEERPREP INFRASTRUCTURE SERVICES")
    print("="*60)
    print()
    print("Database Services:")
    print("  • PostgreSQL: localhost:5432")
    print("    - Username: peerprep")
    print("    - Password: peerprep")
    print("    - Databases: All microservice databases created")
    print()
    print("  • pgAdmin: http://localhost:5050")
    print("    - Email: admin@peerprep.dev")
    print("    - Password: admin")
    print()
    print("Caching Services:")
    print("  • Redis: localhost:6379")
    print("  • Redis Commander: http://localhost:8081")
    print()
    print("Created Databases:")
    databases = [
        "peerprep_questions_dev", "peerprep_questions_dev_test"
    ]

    for i, db in enumerate(databases, 1):
        print(f"  {i:2d}. {db}")

    print()
    print("Seeded Data:")
    print("  • All configured microservice databases seeded automatically")
    print("  • Ready for development and testing")
    print()
    print("Next Steps:")
    print("  1. Navigate to services/question-service/")
    print("  2. Run the service with: py run.py")
    print("  3. Access pgAdmin to view/manage databases")
    print("  4. API available at: http://localhost:8003")
    print()
    print("To stop infrastructure:")
    print("  docker-compose -f infrastructure/development/docker-compose.yml down")

def verify_databases():
    """Verify that all databases were created"""
    print("\nVerifying database creation...")

    # List all databases
    command = '''docker-compose exec -T postgres psql -U peerprep -d postgres -c "\\l" '''

    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, check=True)
        output = result.stdout

        expected_dbs = [
            "peerprep_questions_dev"
        ]

        missing_dbs = []
        for db in expected_dbs:
            if db not in output:
                missing_dbs.append(db)

        if missing_dbs:
            print(f"Missing databases: {missing_dbs}")
            return False
        else:
            print("All required databases created successfully")
            return True

    except subprocess.CalledProcessError as e:
        print(f"Database verification failed: {e}")
        return False

def seed_all_databases():
    """Seed all microservice databases with sample data"""
    print("\nSeeding all microservice databases...")

    # Get the project root directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(script_dir))  # Go up two levels
    services_dir = os.path.join(project_root, "services")

    # Import SERVICES configuration
    sys.path.append(os.path.join(project_root, "infrastructure", "scripts"))
    try:
        from generate_env_files import SERVICES
    except ImportError:
        print("Could not import SERVICES configuration")
        return False

    successful_seeds = 0
    total_services_with_db = 0

    # Generate .env files first for all services
    generate_env_script = os.path.join(project_root, "infrastructure", "scripts", "generate-env-files.py")
    if os.path.exists(generate_env_script):
        print("Generating .env files for all services...")
        run_command(f"py {generate_env_script}", "Generating .env files")

    # Seed each service that has a database
    for service_name, config in SERVICES.items():
        if "db_name" not in config:
            print(f"Skipping {service_name} (no database)")
            continue

        total_services_with_db += 1
        service_dir = os.path.join(services_dir, service_name)
        seed_script_path = os.path.join(service_dir, "scripts", "seed_data.py")

        print(f"\nSeeding {service_name} database...")

        # Check if service directory exists
        if not os.path.exists(service_dir):
            print(f"Service directory not found: {service_dir}")
            continue

        # Check if seed script exists
        if not os.path.exists(seed_script_path):
            print(f"Seed script not found at: {seed_script_path}")
            print(f"  Create {service_name}/scripts/seed_data.py to enable auto-seeding")
            continue

        # Change to service directory and run seed script
        original_dir = os.getcwd()
        try:
            os.chdir(service_dir)

            # Run the seed script
            command = "py scripts/seed_data.py"
            if run_command(command, f"Seeding {service_name} database"):
                print(f"{service_name} database seeded successfully")
                successful_seeds += 1
            else:
                print(f"Failed to seed {service_name} database")

        except Exception as e:
            print(f"Error seeding {service_name}: {e}")
        finally:
            os.chdir(original_dir)

    print(f"\nDatabase seeding completed: {successful_seeds}/{total_services_with_db} services seeded")

    if successful_seeds < total_services_with_db:
        print("\nSome databases were not seeded. Check that each service has:")
        print("  1. A scripts/seed_data.py file")
        print("  2. Proper database configuration in .env.dev")
        print("  3. Required Python packages installed")

    return successful_seeds > 0

def main():
    """Main setup function"""
    print("PeerPrep Infrastructure Setup")
    print()

    # Check prerequisites
    if not check_docker():
        print("Docker is required. Please install Docker and Docker Compose.")
        sys.exit(1)

    # Start infrastructure
    if not start_infrastructure():
        print("Failed to start infrastructure")
        sys.exit(1)

    # Verify databases
    if not verify_databases():
        print("Database verification failed, but infrastructure may still be working")

    # Seed all databases
    if not seed_all_databases():
        print("Database seeding failed, but infrastructure is still working")
        print("You can manually run seed scripts for each service")

    # Show service information
    show_service_info()

    print("PeerPrep infrastructure setup completed!")

if __name__ == "__main__":
    main()
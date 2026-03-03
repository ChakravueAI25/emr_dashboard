from locust import HttpUser, task, between, events

print("Locust file loaded!")

class EMRApiUser(HttpUser):
    wait_time = between(1, 3)  # Simulate user think time between tasks

    @task(3)
    def check_health(self):
        self.client.get("/health", name="/health")

    @task(2)
    def check_patients_all(self):
        # Using limit to prevent heavy load
        self.client.get("/patients/all?limit=50", name="/patients/all")
        
    @task(2)
    def check_appointments(self):
        self.client.get("/appointments", name="/appointments")
        
    @task(1)
    def check_patients_recent(self):
        self.client.get("/patients/recent", name="/patients/recent")

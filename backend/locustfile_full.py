from locust import HttpUser, task, between, events
import random

class EMRApiUser(HttpUser):
    wait_time = between(1, 4)
    patient_ids = []
    appointment_ids = []

    def on_start(self):
        """Fetch some initial data to use in subsequent requests"""
        try:
            # Get recent patients to find valid registration IDs
            response = self.client.get("/patients/recent", name="Fetch IDs: /patients/recent")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.patient_ids = [p.get("registrationId") for p in data if p.get("registrationId")]
                elif isinstance(data, dict):
                    # Handle both "results" (search) and "patients" (recent) keys
                    items = data.get("results") or data.get("patients") or []
                    self.patient_ids = [p.get("registrationId") for p in items if p.get("registrationId")]

            # Get appointments
            response = self.client.get("/appointments", name="Fetch IDs: /appointments")
            if response.status_code == 200:
                data = response.json()
                # Appointments endpoint might return list or dict with "appointments" key
                if isinstance(data, list):
                    self.appointment_ids = [a.get("_id") for a in data if a.get("_id")]
                elif isinstance(data, dict) and "appointments" in data:
                    self.appointment_ids = [a.get("id") or a.get("_id") for a in data.get("appointments", [])]
        except Exception as e:
            print(f"Error in on_start: {e}")

    @task(5)
    def health_check(self):
        self.client.get("/health", name="/health")

    @task(3)
    def get_patients_all(self):
        # Limit to 20 to avoid heavy load
        self.client.get("/patients/all?limit=20", name="/patients/all")

    @task(3)
    def get_patients_recent(self):
        self.client.get("/patients/recent", name="/patients/recent")

    @task(3)
    def get_appointments(self):
        self.client.get("/appointments", name="/appointments")

    @task(2)
    def get_queues(self):
        self.client.get("/queue/appointments", name="/queue/appointments")
        self.client.get("/queue/reception", name="/queue/reception")
        self.client.get("/queue/opd", name="/queue/opd")

    @task(4)
    def get_specific_patient_data(self):
        if not self.patient_ids:
            return
        
        patient_id = random.choice(self.patient_ids)
        
        # Test core patient endpoints
        self.client.get(f"/patients/{patient_id}", name="/patients/{id}")
        self.client.get(f"/patients/{patient_id}/visits", name="/patients/{id}/visits")
        
        # Test analytics endpoints
        self.client.get(f"/api/analytics/patient/{patient_id}/iop-trend", name="/analytics/iop-trend")
        self.client.get(f"/api/analytics/patient/{patient_id}/visual-acuity", name="/analytics/visual-acuity")
        # self.client.get(f"/api/analytics/patient/{patient_id}/visits", name="/analytics/visits")

    @task(2)
    def ai_evaluate_reading(self):
        # Test AI evaluation endpoints with random vitals
        # Case 1: High BP
        self.client.post("/evaluate-reading", json={"field": "bp", "value": "160/90"}, name="/evaluate-reading (BP)")
        
        # Case 2: Normal Pulse
        self.client.post("/evaluate-reading", json={"field": "pulse", "value": "72"}, name="/evaluate-reading (Pulse)")
        
        # Case 3: High IOP
        self.client.post("/evaluate-reading", json={"field": "iop", "value": "26"}, name="/evaluate-reading (IOP)")

    @task(1)
    def get_specific_appointment(self):
        if not self.appointment_ids:
            return
        appt_id = random.choice(self.appointment_ids)
        self.client.get(f"/appointments/{appt_id}", name="/appointments/{id}")

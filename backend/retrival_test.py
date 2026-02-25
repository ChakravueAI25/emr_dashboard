from agents.retrival_agent1 import get_raw_patient
from agents.signal_extractor import extract_signals
from agents.knowledge_retriever import search_per_signal
from agents.llm_agent import run_clinical_interpretation
from agents.inference.clinical_ranker import rank_clinical_signals


def generate_analysis(patient_id_str):
    """
    Clinical RAG pipeline:
      1. MongoDB → full raw patient document  (retrival_agent1)
      2. Raw doc → categorised signals         (signal_extractor)
      3. Signals → targeted evidence           (knowledge_retriever)
      4. Signals + evidence → structured output (llm_agent)
    """
    # ── Step 1: Fetch full raw patient document ──
    patient = get_raw_patient(patient_id_str)

    if isinstance(patient, dict) and patient.get("error"):
        return f"Error: {patient.get('error')}"

    # ── Step 2: Extract categorized clinical signals ──
    signals_map = extract_signals(patient)

    print(f"\n[PIPELINE] Extracted signals in {len(signals_map)} categories.")
    for cat, items in signals_map.items():
        print(f"  {cat.upper()}: {len(items)} items")

    if not signals_map:
        return "No clinical signals found. Patient may have no recorded clinical data yet."

    # Flatten for retrieval: we need evidence for everything
    all_signals = []
    for cat_list in signals_map.values():
        all_signals.extend(cat_list)

    # ── Step 3: Per-signal evidence retrieval ──
    # Note: signals are now objects, search_per_signal handles normalization internally
    evidence_map = search_per_signal(all_signals, top_k_per_signal=1) 

    print(f"\n[PIPELINE] Evidence retrieved for {len(evidence_map)} signals")
    
    # ── Inference Injection ──
    from agents.inference.clinical_inference import infer_condition

    # Flatten signals into list
    signals_flat = [
        s["original_text"]
        for group in signals_map.values()
        for s in group
        if isinstance(s, dict)
    ]
    
    # [Step 2 - New] Rank signals clinically
    signals_flat = rank_clinical_signals(signals_flat)

    inference = infer_condition(signals_flat)

    # ── Step 4: Reasoning Engine ──
    # Generate strict 1-2 sentence clinical reasoning
    
    # Build patient context header
    patient_header = patient.get("name", "Patient")
    age = (patient.get("demographics") or {}).get("age", "")
    sex = (patient.get("demographics") or {}).get("sex", "")
    if age:
        patient_header += f"/{age}"
    if sex:
        patient_header += f"/{sex}"
    
    interpretation = run_clinical_interpretation(
        signals_map=signals_map,
        evidence_map=evidence_map,
        patient_header=patient_header,
        patient_id=str(patient.get("_id")),
        inference_result=inference
    )

    print("\n" + "="*60)
    print(f"CLINICAL REASONING FOR: {patient_header}")
    print("="*60)
    print(interpretation)
    print("="*60 + "\n")

    return interpretation


if __name__ == "__main__":
    # Test run
    test_id = "60a1b2c3d4e5f6a7b8c9d002"
    print(f"Running analysis for test ID: {test_id}")
    print("-" * 50)
    print(generate_analysis(test_id))

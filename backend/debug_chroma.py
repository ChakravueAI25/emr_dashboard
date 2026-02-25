
import os
import sys
from pathlib import Path
import chromadb
from sentence_transformers import SentenceTransformer

# Setup paths (mimicking knowledge_retriever.py)
REPO_ROOT = Path(__file__).resolve().parents[1]
CHROMA_DIR = REPO_ROOT / "vector_db" / "book_chunks"
COLLECTION_NAME = "ophthal_book"

print(f"Chroma Dir: {CHROMA_DIR}")

try:
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    collection = client.get_or_create_collection(name=COLLECTION_NAME)
    
    print(f"Collection count: {collection.count()}")

    # Mock embedding (just random float list of correct dimension, or use ST)
    # Using a dummy small embedding for testing if I don't want to load big model
    # But code uses SentenceTransformer.
    
    model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    embedding = model.encode("test query").tolist()

    results = collection.query(
        query_embeddings=[embedding],
        n_results=1,
        include=["documents", "distances"],
    )

    print(f"Results keys: {results.keys()}")
    print(f"Results documents: {results.get('documents')}")
    
    docs = results.get("documents", [[]])[0]
    print(f"Docs[0]: {docs}")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

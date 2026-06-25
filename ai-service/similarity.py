from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

def compare_embeddings(embedding1, embedding2):
    similarity = cosine_similarity(
        [np.array(embedding1)],
        [np.array(embedding2)]
    )[0][0]

    return float(similarity)
from fastapi import FastAPI
from pydantic import BaseModel
from embedding import get_embedding_from_url
from similarity import compare_embeddings

app = FastAPI()


class ImageRequest(BaseModel):
    imageUrl: str


class CompareRequest(BaseModel):
    embedding1: list
    embedding2: list


@app.get("/")
def home():
    return {
        "message": "Emstrap AI Service Running"
    }


@app.post("/embedding")
def generate_embedding(data: ImageRequest):

    embedding = get_embedding_from_url(
        data.imageUrl
    )

    return {
        "embedding": embedding
    }


@app.post("/compare")
def compare(data: CompareRequest):

    similarity = compare_embeddings(
        data.embedding1,
        data.embedding2
    )

    return {
        "similarity": similarity
    }
import axios from "axios";
import { AI_SERVICE_URL } from "../config/ai.js";

export const generateEmbedding = async (imageUrl) => {
    const response = await axios.post(
        `${AI_SERVICE_URL}/embedding`,
        {
            imageUrl,
        }
    );

    return response.data.embedding;
};

export const compareEmbeddings = async (
    embedding1,
    embedding2
) => {
    const response = await axios.post(
        `${AI_SERVICE_URL}/compare`,
        {
            embedding1,
            embedding2,
        }
    );

    return response.data.similarity;
};
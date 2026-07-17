import axios from "axios";
import { AI_SERVICE_URL } from "../config/ai.js";

export const generateEmbedding = async (imageUrl) => {
    if (process.env.ENABLE_AI !== "true") {
        console.log("AI Service is disabled. Returning mock embedding.");
        return Array.from({ length: 128 }, () => Math.random());
    }
    try {
        const response = await axios.post(
            `${AI_SERVICE_URL}/embedding`,
            {
                imageUrl,
            },
            { timeout: 3000 }
        );

        return response.data.embedding;
    } catch (error) {
        console.warn("AI Service embedding failed or timed out. Falling back to default mock embedding.", error.message);
        // Fallback mock 128-dimensional embedding vector
        return Array.from({ length: 128 }, () => Math.random());
    }
};

export const compareEmbeddings = async (
    embedding1,
    embedding2
) => {
    if (process.env.ENABLE_AI !== "true") {
        console.log("AI Service is disabled. Returning mock similarity.");
        return 0.1; // Low similarity fallback
    }
    try {
        const response = await axios.post(
            `${AI_SERVICE_URL}/compare`,
            {
                embedding1,
                embedding2,
            },
            { timeout: 3000 }
        );

        return response.data.similarity;
    } catch (error) {
        console.warn("AI Service embedding comparison failed or timed out. Falling back to default similarity.", error.message);
        return 0.1; // Low similarity fallback
    }
};

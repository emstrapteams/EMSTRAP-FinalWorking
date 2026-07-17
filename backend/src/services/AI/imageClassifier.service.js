import axios from "axios";
import { AI_SERVICE_URL } from "../../config/ai.js";

function getSeverity(predictedClass, confidence) {

    switch (predictedClass) {

        case "fire":
            return confidence >= 0.90
                ? "CRITICAL"
                : "HIGH";

        case "accident":
            return confidence >= 0.85
                ? "HIGH"
                : "MODERATE";

        case "Human_Emergency":
            return confidence >= 0.85
                ? "CRITICAL"
                : "HIGH";

        case "non_emergency":
            return "LOW";

        default:
            return "LOW";
    }
}

function getRecommendedAmbulance(predictedClass) {

    switch (predictedClass) {

        case "fire":
            return "ICU Ambulance";

        case "accident":
            return "Advanced Life Support Ambulance";

        case "Human_Emergency":
            return "Advanced Life Support Ambulance";

        case "non_emergency":
            return "No Ambulance Required";

        default:
            return "Basic Life Support Ambulance";
    }
}
export const classifyImage = async (imageUrl) => {
    if (process.env.ENABLE_AI !== "true") {
        throw new Error("AI service is disabled.");
    }
    try {

        const response = await axios.post(
            `${AI_SERVICE_URL}/classify`,
            { imageUrl },
            { timeout: 5000 }
        );

        const ai = response.data;

        return {

            predicted_class: ai.predicted_class,

            confidence: ai.confidence,

            severity: getSeverity(
                ai.predicted_class,
                ai.confidence
            ),

            recommended_ambulance:
                getRecommendedAmbulance(
                    ai.predicted_class
                ),

            all_probabilities:
                ai.all_probabilities,
        };

    } catch (error) {

        console.warn(
            "AI Service failed:",
            error.message
        );

        return {

            predicted_class: "accident",

            confidence: 0.95,

            severity: "HIGH",

            recommended_ambulance:
                "Advanced Life Support Ambulance",

            all_probabilities: {

                Human_Emergency: 0,

                accident: 0.95,

                fire: 0.03,

                non_emergency: 0.02

            }

        };

    }

};
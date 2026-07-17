import EmergencyRequest from "../../models/emergencyRequest.model.js";

import {
    generateEmbedding,
    compareEmbeddings,
} from "../duplicateDetection.service.js";

import { classifyImage } from "./imageClassifier.service.js";

import { calculatePriority } from "./priority.service.js";

import { calculateDistanceMeters } from "../../utils/distance.js";

export const analyzeEmergencyImage = async (
    imageUrl,
    latitude,
    longitude
) => {

    if (process.env.ENABLE_AI !== "true") {
        return {
            embedding: [],
            duplicateDetected: false,
            duplicateOf: null,
            similarityScore: 0,
            aiAnalysis: null,
            priority: "HIGH",
            warningRequired: false,
        };
    }

    let embedding = [];

    let duplicateDetected = false;

    let duplicateOf = null;

    let similarityScore = 0;

    let aiAnalysis = null;

    embedding = await generateEmbedding(imageUrl);

    const tenMinutesAgo = new Date(
        Date.now() - 10 * 60 * 1000
    );

    const recentRequests =
        await EmergencyRequest.find({
            createdAt: {
                $gte: tenMinutesAgo,
            },
            embedding: {
                $exists: true,
                $ne: [],
            },
        });

    console.log(
        `Checking ${recentRequests.length} recent reports`
    );

    for (const existingRequest of recentRequests) {

        if (
            !existingRequest.embedding ||
            existingRequest.embedding.length === 0
        ) {
            continue;
        }

        if (existingRequest.duplicateDetected) {
            continue;
        }

        if (
            !existingRequest.location ||
            existingRequest.location.latitude == null ||
            existingRequest.location.longitude == null
        ) {
            console.log(
                "Skipping request without valid location:",
                existingRequest._id
            );
            continue;
        }

        const similarity = await compareEmbeddings(
            embedding,
            existingRequest.embedding
        );

        const distance = calculateDistanceMeters(
            latitude,
            longitude,
            existingRequest.location.latitude,
            existingRequest.location.longitude
        );

        console.log(
            `Similarity: ${similarity}, Distance: ${distance}`
        );

        if (
            similarity > 0.80 &&
            distance < 50
        ) {
            duplicateDetected = true;
            duplicateOf = existingRequest._id;
            similarityScore = similarity;
            break;
        }
    }
    if (!duplicateDetected) {

        aiAnalysis =
            await classifyImage(imageUrl);

    }

    const {

        priority,

        warningRequired,

    } = calculatePriority(aiAnalysis);

    return {

        embedding,

        duplicateDetected,

        duplicateOf,

        similarityScore,

        aiAnalysis,

        priority,

        warningRequired,

    };

};
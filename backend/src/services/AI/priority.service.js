const severityWeights = {
    CRITICAL: 400,
    HIGH: 300,
    MODERATE: 200,
    LOW: 100,
};

export const calculatePriority = (aiAnalysis) => {

    if (!aiAnalysis) {
        return {
            priority: 0,
            warningRequired: false,
        };
    }

    const severity =
        aiAnalysis.severity || "LOW";

    const confidence =
        aiAnalysis.confidence || 0;

    const priority =
        Math.round(
            severityWeights[severity] *
            confidence
        );

    const warningRequired =
        aiAnalysis.predicted_class ===
        "non_emergency" &&
        confidence >= 0.90;

    return {

        priority,

        warningRequired,

    };

};
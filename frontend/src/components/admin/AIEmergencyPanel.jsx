import { useEffect, useState } from "react";
import { getAIStats } from "../../services/api";
import AdminSurface from "./AdminSurface";

export default function AIEmergencyPanel() {
    const [aiDisabled, setAiDisabled] = useState(false);

    const [stats, setStats] = useState({
        fires: 0,
        accidents: 0,
        medical: 0,
        nonEmergency: 0,
        critical: 0,
        high: 0,
        moderate: 0,
        low: 0,
        averageConfidence: 0,
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {

        async function load() {

            try {

                const response = await getAIStats();

                if (response.success) {
                    setStats(response.stats);
                    setAiDisabled(false);
                } else if (response.aiDisabled) {
                    setAiDisabled(true);
                }

            } catch (err) {

                console.error("Failed to load AI stats:", err);

            } finally {

                setLoading(false);

            }

        }

        load();

    }, []);

    return (

        <AdminSurface className="mt-6 p-6">

            <div className="flex items-center justify-between">

                <div>

                    <h2 className="text-xl font-black text-gray-900 dark:text-white">

                         AI Emergency Intelligence

                    </h2>

                    <p className="text-sm text-gray-500 mt-1">

                        Live Emergency Classification Analytics

                    </p>

                </div>

                <div className="text-right">

                    <p className="font-bold text-xs uppercase text-gray-400">

                        AI Status

                    </p>

                    <p className={aiDisabled ? "font-bold text-red-600" : "font-bold text-green-600"}>

                        {aiDisabled ? "● DISABLED" : "● ACTIVE"}

                    </p>

                </div>

            </div>

            {aiDisabled ? (
                <div className="mt-6 p-5 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl flex flex-col items-center justify-center text-center bg-gray-50 dark:bg-gray-900/50">
                    <span className="text-3xl mb-2">🤖</span>
                    <h4 className="font-bold text-gray-900 dark:text-white">AI features currently unavailable</h4>
                    <p className="text-xs text-gray-500 max-w-sm mt-1">
                        The FastAPI-based AI Classifier is currently turned off. To enable AI analysis, set ENABLE_AI=true in your environment variables.
                    </p>
                </div>
            ) : (
                <div className="font-bold grid grid-cols-2 lg:grid-cols-3 gap-5 mt-6">

                    <Stat
                        title=" Fires"
                        value={stats.fires}
                        color="text-red-600"
                    />

                    <Stat
                        title=" Accidents"
                        value={stats.accidents}
                        color="text-orange-600"
                    />

                    <Stat
                        title=" Non Emergency"
                        value={stats.nonEmergency}
                        color="text-green-600"
                    />

                    <Stat
                        title=" Critical"
                        value={stats.critical}
                        color="text-red-700"
                    />

                    <Stat
                        title=" High"
                        value={stats.high}
                        color="text-orange-600"
                    />

                    <Stat
                        title=" AI Confidence"
                        value={`${stats.averageConfidence}%`}
                        color="text-indigo-600"
                    />

                </div>
            )}

        </AdminSurface>

    );

}

function Stat({ title, value, color }) {

    return (

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-5">

            <p className="text-sm text-gray-500">

                {title}

            </p>

            <h3 className={`text-3xl font-black mt-2 ${color}`}>

                {value}

            </h3>

        </div>

    );

}
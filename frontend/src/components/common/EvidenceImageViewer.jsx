import { useMemo, useState } from "react";

export default function EvidenceImageViewer({
    mainImage,
    evidence = [],
}) {
    const images = useMemo(() => {
        const arr = [];

        if (mainImage) {
            arr.push(mainImage);
        }

        evidence.forEach((e) => {
            if (e.imageUrl) {
                arr.push(e.imageUrl);
            }
        });

        return arr;
    }, [mainImage, evidence]);

    const [currentIndex, setCurrentIndex] = useState(0);

    if (images.length === 0) {
        return (
            <div className="h-64 rounded-xl border flex items-center justify-center text-gray-400">
                No Image
            </div>
        );
    }

    const previous = () => {
        setCurrentIndex((prev) =>
            prev === 0 ? images.length - 1 : prev - 1
        );
    };

    const next = () => {
        setCurrentIndex((prev) =>
            prev === images.length - 1 ? 0 : prev + 1
        );
    };

    return (
        <div className="relative w-full flex justify-center">

            <img
                src={images[currentIndex]}
                alt="Emergency"
                className="w-full max-h-[550px] object-contain rounded-xl"
            />
            {images.length > 1 && (
                <>
                    <button
                        onClick={previous}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full w-10 h-10"
                    >
                        ‹
                    </button>

                    <button
                        onClick={next}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full w-10 h-10"
                    >
                        ›
                    </button>

                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1 rounded-full">
                        {currentIndex + 1} / {images.length}
                    </div>
                </>
            )}
        </div>
    );
}
import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";

export default function LocationSearchInput({ label, placeholder, value, onSelect, hideCurrentLocation = false }) {
    const [query, setQuery] = useState(value?.address || "");
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    
    const dropdownRef = useRef(null);
    const debounceTimeout = useRef(null);

    // Update internal query if value prop changes externally
    useEffect(() => {
        if (value?.address && value.address !== query) {
            setQuery(value.address);
        }
    }, [value]);

    // Handle clicking outside the dropdown to close it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchOSMSearch = async (searchText) => {
        if (!searchText.trim()) {
            setResults([]);
            setShowDropdown(false);
            return;
        }

        setIsSearching(true);
        try {
            // Searching Nominatim OpenStreetMap Database
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}&limit=5`);
            const data = await res.json();
            
            setResults(data);
            setShowDropdown(true);
        } catch (error) {
            console.error("OSM Search Error:", error);
            toast.error("Failed to connect to search service.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleInputChange = (e) => {
        const text = e.target.value;
        setQuery(text);
        
        // Clear previous timeout and set a new one (Debounce 500ms)
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        
        debounceTimeout.current = setTimeout(() => {
            fetchOSMSearch(text);
        }, 500);
    };

    const handleSelectResult = (result) => {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        const address = result.display_name;
        
        setQuery(address);
        setShowDropdown(false);
        onSelect({ address, lat, lng });
    };

    const handleCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser.");
            return;
        }

        const loadToast = toast.loading("Finding your location...");

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                try {
                    // Reverse Geocoding with Nominatim API
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                    const data = await res.json();
                    
                    toast.dismiss(loadToast);
                    if (data && data.display_name) {
                        const address = data.display_name;
                        setQuery(address);
                        onSelect({ address, lat, lng });
                        toast.success("Location identified!");
                    } else {
                        // Fallback
                        const address = `Location [${lat.toFixed(4)}, ${lng.toFixed(4)}]`;
                        setQuery(address);
                        onSelect({ address, lat, lng });
                        toast.success("Coordinates found!");
                    }
                } catch (error) {
                    toast.dismiss(loadToast);
                    toast.error("Failed to reverse-geocode location.");
                    console.error(error);
                }
            },
            (error) => {
                console.error("Geolocation Error: ", error);
                toast.dismiss(loadToast);
                if (error.code === error.TIMEOUT) {
                    toast.error("GPS request timed out. Try again or check signal.");
                } else {
                    toast.error("Failed to get location. Please enable GPS permissions.");
                }
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">{label}</label>
            <div className="relative flex items-center">
                <input
                    type="text"
                    required
                    placeholder={placeholder}
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
                    className={`w-full border dark:border-gray-700 py-3 pl-3 ${hideCurrentLocation ? 'pr-3' : 'pr-12'} rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors`}
                />

                {!hideCurrentLocation && (
                    <button
                        type="button"
                        onClick={handleCurrentLocation}
                        className="absolute right-3 text-gray-400 hover:text-red-500 transition-colors z-10 p-1 flex items-center justify-center bg-transparent group"
                        title="Use Current Location"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                            <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94-7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
                        </svg>
                    </button>
                )}
            </div>

            {/* Custom Dropdown Results */}
            {showDropdown && results.length > 0 && (
                <ul className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {results.map((result, idx) => (
                        <li 
                            key={idx} 
                            onClick={() => handleSelectResult(result)}
                            className="px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                        >
                            {result.display_name}
                        </li>
                    ))}
                </ul>
            )}
            
            {/* Loading Indicator inside Dropdown visually */}
            {isSearching && showDropdown === false && query && (
               <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm text-gray-500 text-center">
                   Searching OSM Directory...
               </div>
            )}
        </div>
    );
}


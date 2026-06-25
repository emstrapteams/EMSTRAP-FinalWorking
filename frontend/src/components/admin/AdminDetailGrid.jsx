import { formatDate } from "./admin.utils";

const formatValue = (value) => {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return formatDate(value);
  if (!value && value !== 0) return "N/A";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
};

export default function AdminDetailGrid({ data }) {
  const isImageLabel = (label) => 
    ["image", "image url", "photo", "license", "imageUrl"].includes(label.toLowerCase());

  const isBase64Image = (value) => 
    typeof value === "string" && value.startsWith("data:image/");

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Object.entries(data).map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">{label}</p>
          <div className="mt-2 font-sans text-sm text-gray-700 dark:text-gray-200">
            {(isImageLabel(label) || isBase64Image(value)) && value && value !== "N/A" ? (
              <div className="mt-2 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                <img 
                  src={value} 
                  alt={label} 
                  className="max-h-60 w-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div style={{ display: 'none' }} className="p-4 text-xs text-gray-400">
                  Image failed to load
                </div>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap break-words font-sans">
                {formatValue(value)}
              </pre>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminLoadingRow({ colSpan = 1, label = "Loading..." }) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-8 text-center text-gray-400">{label}</td>
    </tr>
  );
}

export function AdminEmptyRow({ colSpan = 1, label = "No data available." }) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-8 text-center text-gray-400">{label}</td>
    </tr>
  );
}

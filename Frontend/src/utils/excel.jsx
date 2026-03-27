const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/uploads/")) return `${API_BASE}${path}`;
  return `${API_BASE}${path}`;
};

export const exportToExcel = async (data, filename, sheetName = "Sheet1") => {
  if (!data || data.length === 0) {
    console.error("No data to export");
    return;
  }
  
  try {
    const ExcelJS = await import("exceljs");
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(sheetName);
    
    const headers = Object.keys(data[0]);
    
    ws.addRow(headers.map(h => h.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())));
    
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1e3a5f" }
    };
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.alignment = { horizontal: "center" };
    
    data.forEach((row, index) => {
      const values = headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return "";
        if (typeof val === "object") return JSON.stringify(val);
        return val;
      });
      ws.addRow(values);
      
      if (index % 2 === 0) {
        const rowNum = ws.rowCount;
        ws.getRow(rowNum).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF1f5f9" }
        };
      }
    });
    
    ws.columns.forEach(column => {
      let maxLength = 10;
      column.eachCell?.({ includeEmpty: true }, cell => {
        const length = cell.value ? String(cell.value).length : 0;
        if (length > maxLength) maxLength = Math.min(length, 50);
      });
      column.width = maxLength + 2;
    });
    
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Excel export error:", error);
    throw error;
  }
};

export const DownloadButton = ({ onClick, label = "Export", icon: Icon, small = true }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors ${
      small ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
    }`}
  >
    {Icon && <Icon size={small ? 14 : 16} />}
    {label}
  </button>
);

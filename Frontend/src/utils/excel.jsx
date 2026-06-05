/* eslint-disable react-refresh/only-export-components */
import API_BASE from "../config/api.js";
import { getProjectDateStr, getProjectTimeStr } from "./dateUtils";

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
    
    // Add Metadata header
    ws.mergeCells("A1:C1");
    ws.getCell("A1").value = `Report: ${filename.replace(/_/g, ' ')}`;
    ws.getCell("A1").font = { bold: true, size: 14 };
    
    ws.mergeCells("A2:C2");
    ws.getCell("A2").value = `Generated on: ${getProjectDateStr()} ${getProjectTimeStr()}`;
    ws.getCell("A2").font = { italic: true, size: 10, color: { argb: "FF666666" } };

    // Header starts at row 4
    const headers = Object.keys(data[0]);
    const headerRowIdx = 4;
    
    const headerRow = ws.getRow(headerRowIdx);
    headerRow.values = headers.map(h => h.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1e3a8a" } // Dark blue
    };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.height = 25;

    data.forEach((row, index) => {
      const values = headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return "-";
        if (typeof val === "object") return JSON.stringify(val);
        return val;
      });
      const wsRow = ws.addRow(values);
      
      // Alternate row colors
      if (index % 2 === 1) {
        wsRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" }
        };
      }
      wsRow.height = 20;
      wsRow.alignment = { vertical: "middle" };
    });
    
    // Add Auto-filter
    ws.autoFilter = {
      from: { row: headerRowIdx, column: 1 },
      to: { row: headerRowIdx + data.length, column: headers.length }
    };

    // Auto-fit columns
    ws.columns.forEach(column => {
      let maxLength = 10;
      column.eachCell?.({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber >= headerRowIdx) {
          const length = cell.value ? String(cell.value).length : 0;
          if (length > maxLength) maxLength = Math.min(length, 60);
        }
      });
      column.width = maxLength + 5;
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

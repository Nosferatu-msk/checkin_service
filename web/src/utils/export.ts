import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Экспорт данных в Excel
 * @param data - массив данных для экспорта
 * @param filename - имя файла без расширения
 * @param sheetName - имя листа в Excel
 */
export const exportToExcel = (data: any[], filename: string, sheetName: string = 'Sheet1') => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

/**
 * Загрузка шрифта Roboto для поддержки кириллицы в PDF
 */
const loadRobotoFont = async (doc: jsPDF) => {
  try {
    const response = await fetch('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff');
    const fontBuffer = await response.arrayBuffer();
    const fontBase64 = arrayBufferToBase64(fontBuffer);
    doc.addFileToVFS('Roboto-Regular.ttf', fontBase64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    return true;
  } catch (error) {
    console.warn('Не удалось загрузить шрифт Roboto, используется стандартный шрифт', error);
    return false;
  }
};

/**
 * Конвертация ArrayBuffer в Base64
 */
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

/**
 * Экспорт данных в PDF с поддержкой кириллицы
 * @param data - массив данных для экспорта
 * @param filename - имя файла без расширения
 * @param title - заголовок документа
 * @param columns - массив названий колонок
 */
export const exportToPDF = async (
  data: any[],
  filename: string,
  title: string,
  columns: string[]
) => {
  const doc = new jsPDF();
  
  // Загружаем шрифт для поддержки кириллицы
  const fontLoaded = await loadRobotoFont(doc);
  const fontName = fontLoaded ? 'Roboto' : 'helvetica';
  
  // Заголовок
  doc.setFont(fontName, 'bold');
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  
  // Дата генерации
  doc.setFont(fontName, 'normal');
  doc.setFontSize(10);
  doc.text(`Дата формирования: ${new Date().toLocaleDateString('ru-RU')}`, 14, 28);
  
  // Таблица
  autoTable(doc, {
    head: [columns],
    body: data.map(row => columns.map(col => String(row[col] || ''))),
    startY: 35,
    styles: { 
      fontSize: 8,
      font: fontName,
      cellPadding: 2,
    },
    headStyles: { 
      fillColor: [16, 185, 129], // Emerald color
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [240, 253, 244], // Light emerald
    },
    margin: { top: 35 },
  });
  
  doc.save(`${filename}.pdf`);
};

/**
 * Экспорт данных в PDF (синхронная версия без загрузки шрифта)
 * Используйте только для латиницы
 */
export const exportToPDFSync = (
  data: any[],
  filename: string,
  title: string,
  columns: string[]
) => {
  const doc = new jsPDF();
  
  // Заголовок
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  
  // Дата генерации
  doc.setFontSize(10);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 28);
  
  // Таблица
  autoTable(doc, {
    head: [columns],
    body: data.map(row => columns.map(col => String(row[col] || ''))),
    startY: 35,
    styles: { 
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: { 
      fillColor: [16, 185, 129],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [240, 253, 244],
    },
    margin: { top: 35 },
  });
  
  doc.save(`${filename}.pdf`);
};
